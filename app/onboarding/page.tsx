import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingClient from "./onboarding-client";

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await auth();
  const params = await searchParams;
  const emailParam = typeof params.email === "string" ? params.email : "";
  const nameParam = typeof params.name === "string" ? params.name : "";
  const resolvedEmail = session?.user?.email ?? emailParam;

  if (!resolvedEmail) {
    redirect("/signin");
  }

  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  let shouldRedirectToDashboard = false;
  let dashboardName = nameParam;
  let backendError = "";

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/auth/dashboard?email=${encodeURIComponent(resolvedEmail)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const data = (await response.json()) as { onboarding_required: boolean; name: string };
      if (!data.onboarding_required) {
        shouldRedirectToDashboard = true;
        dashboardName = data.name ?? nameParam;
      }
    } else if (response.status !== 404) {
      backendError = "We could not fetch your saved profile from the database. Please try again after the backend is available.";
    }
  } catch (error) {
    backendError = error instanceof Error ? error.message : "Unable to fetch your saved profile.";
  }

  if (shouldRedirectToDashboard) {
    redirect(
      `/dashboard?email=${encodeURIComponent(resolvedEmail)}&name=${encodeURIComponent(dashboardName)}`,
    );
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
      initialName={session?.user?.name ?? nameParam}
      initialEmail={resolvedEmail}
      initialImage={session?.user?.image ?? ""}
    />
  );
}
