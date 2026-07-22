import { auth } from "@/auth";
import LandingClient from "./landing-client";

export default async function HomePage() {
  const session = await auth();
  return <LandingClient session={session} />;
}
