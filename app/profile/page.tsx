import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  const backendAccessToken = (session as typeof session & { backendAccessToken?: string } | null)
    ?.backendAccessToken;

  if (!session?.user?.email || !backendAccessToken) {
    redirect("/signin");
  }

  return <ProfileClient backendAccessToken={backendAccessToken} initialEmail={session.user.email} initialName={session.user.name || ""} />;
}
