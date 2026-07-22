"use client";

import Link from "next/link";
import { Globe, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { Footer } from "@/components/footer";

type OtpResponse = {
  challenge_id: string;
  channel: "email" | "sms";
  recipient_hint: string;
  expires_in_seconds: number;
  dev_code?: string | null;
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [recipientHint, setRecipientHint] = useState("");
  const [devCode, setDevCode] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const requestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/signin/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, channel: "email" }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Sign in failed"));
      }

      const data = (await res.json()) as OtpResponse;
      setChallengeId(data.challenge_id);
      setRecipientHint(data.recipient_hint);
      setDevCode(data.dev_code ?? "");
      setOtpCode("");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
        challengeId,
        otpCode,
      });

      if (result?.error) {
        throw new Error("Invalid or expired verification code");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white flex flex-col">
      <div className="flex-grow flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
        <h1 className="text-2xl font-semibold">Sign In</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">Welcome back to Action Cut AI.</p>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-black/30 px-4 py-2 text-sm font-medium hover:bg-white/5 cursor-pointer"
        >
          <Globe className="h-4 w-4" />
          Sign in with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-[#A0A0A0]">
          <div className="h-px flex-1 bg-white/10" />
          <span>or continue with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {step === "credentials" ? (
          <form className="space-y-4" onSubmit={requestOtp}>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                placeholder="you@studio.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/15 bg-black/30"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm text-[#FFC107] hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              disabled={busy}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              {busy ? "Sending Code..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyOtp}>
            <div className="rounded-md border border-[#FFC107]/20 bg-[#FFC107]/10 p-3 text-sm text-[#F6D36B]">
              Code sent to {recipientHint}
              {devCode ? <span className="block text-xs text-[#A0A0A0]">Dev code: {devCode}</span> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="otp">
                Verification Code
              </label>
              <input
                id="otp"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                inputMode="numeric"
                required
                maxLength={6}
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm tracking-[0.35em] outline-none focus:border-[#FFC107]"
                placeholder="000000"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? "Verifying..." : "Verify and Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full rounded-md border border-white/15 bg-black/20 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
            >
              Change Email or Password
            </button>
          </form>
        )}

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <p className="mt-4 text-center text-sm text-[#A0A0A0]">
          New to Action Cut AI?{" "}
          <Link href="/signup" className="text-[#FFC107] hover:underline">
            Create an account
          </Link>
        </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white flex items-center justify-center">
        <div className="text-[#A0A0A0] text-sm animate-pulse">Loading sign in...</div>
      </main>
    }>
      <SignInForm />
    </Suspense>
  );
}
