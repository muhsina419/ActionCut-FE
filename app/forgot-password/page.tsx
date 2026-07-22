"use client";

import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Footer } from "@/components/footer";

type OtpResponse = {
  challenge_id: string;
  channel: "email" | "sms";
  recipient_hint: string;
  expires_in_seconds: number;
  dev_code?: string | null;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [recipientHint, setRecipientHint] = useState("");
  const [devCode, setDevCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const requestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/forgot-password/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, channel: "email" }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Failed to initiate password reset"));
      }

      const data = (await res.json()) as OtpResponse;
      if (!data.challenge_id) {
          // In case the email wasn't found but we faked success to prevent enumeration
          setStep("otp");
          setRecipientHint(normalizedEmail);
          return;
      }
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

  const resetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          challenge_id: challengeId,
          otp_code: otpCode,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Failed to reset password"));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white flex flex-col">
      <div className="flex-grow flex items-center justify-center px-6 py-10">
        {success ? (
          <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-[#FFC107] mb-4" />
            <h1 className="text-2xl font-semibold">Password Reset</h1>
            <p className="mt-2 text-sm text-[#A0A0A0]">Your password has been successfully reset.</p>
            <p className="mt-4 text-sm text-[#A0A0A0]">Redirecting to sign in...</p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
            <h1 className="text-2xl font-semibold">Reset Password</h1>
            <p className="mt-2 text-sm text-[#A0A0A0]">Enter your email to receive a verification code.</p>

            {step === "email" ? (
              <form className="mt-6 space-y-4" onSubmit={requestOtp}>
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
                <button
                  disabled={busy}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
                >
                  <Mail className="h-4 w-4" />
                  {busy ? "Sending Code..." : "Send Reset Code"}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={resetPassword}>
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
                <div>
                  <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                    placeholder="Enter new password"
                  />
                </div>
                <button
                  disabled={busy}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {busy ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-4 py-2 text-sm hover:bg-white/5"
                >
                  Change Email
                </button>
              </form>
            )}

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <p className="mt-6 text-center text-sm text-[#A0A0A0]">
              Remember your password?{" "}
              <Link href="/signin" className="text-[#FFC107] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}
