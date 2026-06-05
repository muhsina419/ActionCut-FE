import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import type { ProcessingStatus } from "@/lib/screenplay-types";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ScreenplaySummary = {
  id: string;
  title: string;
  language: string;
  language_code: string | null;
  structure_type: string | null;
  total_scenes: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_message: string | null;
  created_at: string;
  file_path: string | null;
};

type ProjectSummary = {
  id: string;
  title: string;
  language: string;
  created_at: string;
  screenplay_count: number;
  screenplays: ScreenplaySummary[];
};

type DashboardResponse = {
  id: string;
  name: string;
  email: string;
  onboarding_required: boolean;
  total_projects: number;
  total_screenplays: number;
  projects: ProjectSummary[];
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const params = await searchParams;
  const emailParam = typeof params.email === "string" ? params.email : "";
  const resolvedEmail = session?.user?.email ?? emailParam;

  if (!resolvedEmail) {
    redirect("/signin");
  }

  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(
    `${apiBaseUrl}/api/auth/dashboard?email=${encodeURIComponent(resolvedEmail)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    if (response.status === 404) {
      redirect(`/onboarding?email=${encodeURIComponent(resolvedEmail)}`);
    }

    return (
      <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/30 bg-[#1A1A1A] p-6">
          <h1 className="text-2xl font-semibold">Unable to load dashboard</h1>
          <p className="mt-2 text-sm text-[#A0A0A0]">
            We could not fetch your saved profile from the database. Please check that the backend is running and try
            again.
          </p>
        </div>
      </main>
    );
  }

  const data = (await response.json()) as DashboardResponse;

  if (data.onboarding_required) {
    redirect(`/onboarding?email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.name)}`);
  }

  return <DashboardClient initialData={data} />;
}
