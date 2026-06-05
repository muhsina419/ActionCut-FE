import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import type { ProcessingSummary } from "@/lib/screenplay-types";
import { ArrowLeft, ClipboardList, RotateCcw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type SummaryPageProps = {
  params: Promise<{ id: string }>;
};

const labelForStructure = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default async function ProcessingSummaryPage({ params }: SummaryPageProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/signin");
  }

  const { id } = await params;
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${apiBaseUrl}/api/screenplays/${id}/processing-summary`, {
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/dashboard");
  }

  const summary = (await response.json()) as ProcessingSummary;

  return (
    <main className="min-h-screen bg-[#101114] px-5 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost" className="text-[#C8D1D9]">
          <Link href="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>

        <section className="border-b border-white/10 pb-5">
          <p className="text-sm text-[#FFC107]">Processing Summary</p>
          <h1 className="mt-2 text-3xl font-semibold">Script Ready For Review</h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#1A1D21] p-5">
            <p className="text-sm text-[#AAB4BF]">Language Detected:</p>
            <p className="mt-2 text-2xl font-semibold">{summary.language}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1D21] p-5">
            <p className="text-sm text-[#AAB4BF]">Script Format:</p>
            <p className="mt-2 text-2xl font-semibold">{labelForStructure(summary.structure_type)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1D21] p-5">
            <p className="text-sm text-[#AAB4BF]">Scenes Detected:</p>
            <p className="mt-2 text-2xl font-semibold">{summary.total_scenes}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1D21] p-5">
            <p className="text-sm text-[#AAB4BF]">Processing Status:</p>
            <p className="mt-2 text-2xl font-semibold capitalize">{summary.processing_status}</p>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <Button type="button" disabled>
            <ClipboardList />
            Continue To Breakdown
          </Button>
          <Button asChild variant="outline">
            <Link href={`/screenplays/${id}/scenes`}>
              <RotateCcw />
              Recheck Scenes
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
