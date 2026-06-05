import { auth } from "@/auth";
import type { SceneListResponse } from "@/lib/screenplay-types";
import { redirect } from "next/navigation";
import SceneRecheckClient from "./scene-recheck-client";

type ScenesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScenesPage({ params }: ScenesPageProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/signin");
  }

  const { id } = await params;
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${apiBaseUrl}/api/screenplays/${id}/scenes`, {
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(`/screenplays/${id}/summary`);
  }

  const data = (await response.json()) as SceneListResponse;
  return <SceneRecheckClient initialData={data} />;
}
