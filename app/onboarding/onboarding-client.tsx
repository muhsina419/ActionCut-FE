"use client";

import { useState } from "react";
import { CheckCircle2, Clapperboard, FileUp, User } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  backendAccessToken: string;
  initialName: string;
  initialEmail: string;
  initialImage: string;
};

const languages = ["Malayalam", "English", "Hindi", "Tamil", "Telugu"];

export default function OnboardingClient({
  backendAccessToken,
  initialName,
  initialEmail,
  initialImage,
}: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };
  const [step, setStep] = useState(1);
  const [savedProfile, setSavedProfile] = useState(false);
  const [name, setName] = useState(initialName);
  const [email] = useState(initialEmail);
  const [projectName, setProjectName] = useState("");
  const [language, setLanguage] = useState("Malayalam");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveProfile = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name, email, onboarding_completed: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile");
      }
      setSavedProfile(true);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ title: projectName, language }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to create project");
      }
      const data = (await res.json()) as { id: string };
      setProjectId(data.id);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-xl border border-[#FFC107]/30 bg-[#1A1A1A] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFC107]/20">
              <Clapperboard className="h-5 w-5 text-[#FFC107]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome to Action Cut AI</h1>
              <p className="text-sm text-[#A0A0A0]">First Login Onboarding</p>
            </div>
          </div>
        </div>

        {step === 1 && (
          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
            <h2 className="text-xl font-semibold">Your Profile</h2>
            <p className="mt-2 text-sm text-[#A0A0A0]">Review your details and save.</p>

            <div className="mt-5 flex items-center gap-4">
              {initialImage ? (
                <img src={initialImage} alt="Profile" className="h-14 w-14 rounded-full border border-white/20 object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/20">
                  <User className="h-6 w-6 text-[#A0A0A0]" />
                </div>
              )}
              <div className="text-sm text-[#A0A0A0]">
                {initialImage ? "Connected with Google" : "Manual account"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="name">Name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="email">Email</label>
                <input id="email" value={email} readOnly className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[#A0A0A0] outline-none" />
              </div>
            </div>

            <button disabled={busy} onClick={saveProfile} className="mt-6 rounded-md bg-[#FFC107] px-5 py-2.5 font-semibold text-black hover:brightness-110 disabled:opacity-60">
              Save and Continue
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
            <h2 className="text-xl font-semibold">Create Your First Project</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="project">Project Name</label>
                <input id="project" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My First Film Project" className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="language">Language</label>
                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]">
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <button disabled={busy} onClick={createProject} className="mt-6 rounded-md bg-[#FFC107] px-5 py-2.5 font-semibold text-black hover:brightness-110 disabled:opacity-60">
              {busy ? "Creating..." : "Create Project"}
            </button>
          </section>
        )}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </main>
  );
}
