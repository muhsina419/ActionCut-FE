import { auth } from "@/auth";
import type { ProcessingSummary, SceneListResponse } from "@/lib/screenplay-types";
import { redirect } from "next/navigation";
import ScenesClient from "./scenes-client";

type ScenesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptDevelopmentPage({ params }: ScenesPageProps) {
  const session = await auth();
  const backendAccessToken = (session as typeof session & { backendAccessToken?: string } | null)
    ?.backendAccessToken;
  if (!session?.user?.email || !backendAccessToken) {
    redirect("/signin");
  }

  const { id } = await params;
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  
  // Fetch both processing summary and scenes list
  const [summaryRes, scenesRes] = await Promise.all([
    fetch(`${apiBaseUrl}/api/screenplays/${id}/processing-summary`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${backendAccessToken}` },
    }),
    fetch(`${apiBaseUrl}/api/screenplays/${id}/scenes`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${backendAccessToken}` },
    }),
  ]);

  if (!summaryRes.ok || !scenesRes.ok) {
    redirect("/dashboard");
  }

  const summary = (await summaryRes.json()) as ProcessingSummary;
  const scenesData = (await scenesRes.json()) as SceneListResponse;

  return (
    <ScenesClient 
      backendAccessToken={backendAccessToken}
      scriptId={id}
      initialSummary={summary}
      initialScenesData={scenesData}
    />
  );
}
