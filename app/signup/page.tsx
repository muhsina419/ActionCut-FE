"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleManualSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: normalizedEmail, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Signup failed");
      }

      router.push(`/signin?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">Start your first AI-powered screenplay breakdown.</p>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-black/30 px-4 py-2 text-sm font-medium hover:bg-white/5"
        >
          <Globe className="h-4 w-4" />
          Sign up with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-[#A0A0A0]">
          <div className="h-px flex-1 bg-white/10" />
          <span>or continue with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form className="space-y-4" onSubmit={handleManualSignup}>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="name">Full Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} type="text" required className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" placeholder="Your name" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="email">Work Email</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" placeholder="you@studio.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="password">Password</label>
            <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" placeholder="Create password" />
          </div>
          <button disabled={busy} type="submit" className="w-full rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60">Create Account</button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <p className="mt-4 text-center text-sm text-[#A0A0A0]">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#FFC107] hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
