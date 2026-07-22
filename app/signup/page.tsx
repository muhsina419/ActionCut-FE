"use client";

import { Globe, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Footer } from "@/components/footer";

type OtpResponse = {
  challenge_id: string;
  channel: "email" | "sms";
  recipient_hint: string;
  expires_in_seconds: number;
  dev_code?: string | null;
};

type AuthResponse = {
  email: string;
  name: string;
  onboarding_required: boolean;
  access_token: string;
};

export default function SignUpPage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [recipientHint, setRecipientHint] = useState("");
  const [devCode, setDevCode] = useState("");
  const [step, setStep] = useState<"profile" | "otp">("profile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const requestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/signup/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: normalizedEmail, password, channel: "email" }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Signup failed"));
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
      const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: normalizedEmail,
          password,
          challenge_id: challengeId,
          otp_code: otpCode,
        }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Signup failed"));
      }

      const data = (await res.json()) as AuthResponse;
      const signInResult = await signIn("credentials", {
        redirect: false,
        accessToken: data.access_token,
      });

      if (signInResult?.error) {
        throw new Error("Account created, but sign-in failed");
      }

      router.replace(data.onboarding_required ? "/onboarding" : "/dashboard");
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

        {step === "profile" ? (
          <form className="space-y-4" onSubmit={requestOtp}>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                required
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="email">
                Work Email
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
                minLength={8}
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                placeholder="Create password"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
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
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? "Verifying..." : "Verify and Create Account"}
            </button>
            <button
              type="button"
              onClick={() => setStep("profile")}
              className="w-full rounded-md border border-white/15 bg-black/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              Change Account Details
            </button>
          </form>
        )}

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <p className="mt-4 text-center text-sm text-[#A0A0A0]">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#FFC107] hover:underline">
            Sign in
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
