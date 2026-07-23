import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BreakdownClient from "./breakdown-client";

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const backendAccessToken = (session as typeof session & { backendAccessToken?: string } | null)
    ?.backendAccessToken;

  if (!session?.user?.email || !backendAccessToken) {
    redirect("/signin");
  }

  const { id } = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  
  // Fetch breakdown data
  let initialBreakdown = null;
  try {
    const res = await fetch(`${apiBaseUrl}/api/projects/${id}/breakdown`, {
      headers: { Authorization: `Bearer ${backendAccessToken}` },
      cache: "no-store"
    });
    if (res.ok) {
      initialBreakdown = await res.json();
    }
  } catch (error) {
    console.error("Failed to load breakdown:", error);
  }

  return (
    <BreakdownClient 
      projectId={id} 
      backendAccessToken={backendAccessToken} 
      initialData={initialBreakdown} 
      user={{ name: session.user.name || "User", email: session.user.email }} 
    />
  );
}
