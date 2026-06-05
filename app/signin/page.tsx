"use client";

import Link from "next/link";
import { Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleManualSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch(`${apiBaseUrl}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Sign in failed");
      }

      const data = (await res.json()) as { email: string; name: string; onboarding_required: boolean };
      const target = data.onboarding_required ? "/onboarding" : "/dashboard";
      router.push(
        `${target}?email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.name)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
        <h1 className="text-2xl font-semibold">Sign In</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">Welcome back to Action Cut AI.</p>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-black/30 px-4 py-2 text-sm font-medium hover:bg-white/5"
        >
          <Globe className="h-4 w-4" />
          Sign in with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-[#A0A0A0]">
          <div className="h-px flex-1 bg-white/10" />
          <span>or continue with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form className="space-y-4" onSubmit={handleManualSignin}>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="email">Email</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" placeholder="you@studio.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="password">Password</label>
            <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" placeholder="Enter your password" />
          </div>
          <button disabled={busy} type="submit" className="w-full rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60">Sign In</button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <p className="mt-4 text-center text-sm text-[#A0A0A0]">
          New to Action Cut AI?{" "}
          <Link href="/signup" className="text-[#FFC107] hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
