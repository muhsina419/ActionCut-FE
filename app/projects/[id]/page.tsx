import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProjectClient from "./project-client";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const backendAccessToken = (session as typeof session & { backendAccessToken?: string } | null)
    ?.backendAccessToken;

  if (!session?.user?.email || !backendAccessToken) {
    redirect("/signin");
  }

  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${apiBaseUrl}/api/auth/dashboard`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${backendAccessToken}` },
  });

  if (!response.ok) {
    redirect("/dashboard");
  }

  const data = await response.json();
  const project = data.projects.find((p: any) => p.id === id);

  if (!project) {
    redirect("/dashboard");
  }

  return (
    <ProjectClient 
      backendAccessToken={backendAccessToken} 
      initialProject={project}
      user={{ name: data.name, email: data.email }}
    />
  );
}
