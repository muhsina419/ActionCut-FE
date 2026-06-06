import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingClient from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  const backendAccessToken = (session as typeof session & { backendAccessToken?: string } | null)
    ?.backendAccessToken;
  const resolvedEmail = session?.user?.email ?? "";

  if (!resolvedEmail || !backendAccessToken) {
    redirect("/signin");
  }

  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  let shouldRedirectToDashboard = false;
  let backendError = "";

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/dashboard`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${backendAccessToken}` },
    });
    if (response.ok) {
      const data = (await response.json()) as { onboarding_required: boolean };
      if (!data.onboarding_required) {
        shouldRedirectToDashboard = true;
      }
    } else if (response.status !== 404) {
      backendError = "We could not fetch your saved profile from the database. Please try again after the backend is available.";
    }
  } catch (error) {
    backendError = error instanceof Error ? error.message : "Unable to fetch your saved profile.";
  }

  if (shouldRedirectToDashboard) {
    redirect("/dashboard");
  }

  if (backendError) {
    return (
      <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/30 bg-[#1A1A1A] p-6">
          <h1 className="text-2xl font-semibold">Unable to check onboarding status</h1>
          <p className="mt-2 text-sm text-[#A0A0A0]">{backendError}</p>
        </div>
      </main>
    );
  }

  return (
    <OnboardingClient
      backendAccessToken={backendAccessToken}
      initialName={session?.user?.name ?? ""}
      initialEmail={resolvedEmail}
      initialImage={session?.user?.image ?? ""}
    />
  );
}
