"use client";

import { useState, useEffect } from "react";
import { User, Lock, Trash2, Camera, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function ProfileClient({
  backendAccessToken,
  initialEmail,
  initialName,
}: {
  backendAccessToken: string;
  initialEmail: string;
  initialName: string;
}) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState("user");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${backendAccessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setEmail(data.email);
        setAvatarUrl(data.avatar_url);
        setRole(data.role);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${backendAccessToken}`,
        },
        body: JSON.stringify({ name, email, onboarding_completed: true }),
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Update failed"));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${backendAccessToken}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Change password failed"));
      setMessage({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${backendAccessToken}` },
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Delete account failed"));
      await signOut({ callbackUrl: "/signin" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
      setBusy(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${apiBaseUrl}/api/auth/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${backendAccessToken}` },
        body: formData,
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Avatar upload failed"));
      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      setMessage({ type: "success", text: "Avatar updated successfully." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col">
      <Navbar user={{ name, email, avatarUrl }} apiBaseUrl={apiBaseUrl} />
      <main className="px-6 py-10 flex-grow">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Profile Settings</h1>
          </div>

          {message && (
            <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {message.text}
            </div>
          )}

        {/* Profile Info & Avatar */}
        <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium"><User className="h-5 w-5 text-[#FFC107]"/> Personal Info</h2>
          <div className="mt-6 flex flex-col md:flex-row gap-8 items-start">
            
            <div className="flex flex-col items-center space-y-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-black/50">
                {avatarUrl ? (
                  <img src={`${apiBaseUrl}${avatarUrl}`} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-full w-full p-4 text-[#A0A0A0]" />
                )}
                <label className="absolute bottom-0 left-0 right-0 flex cursor-pointer items-center justify-center bg-black/60 py-1 hover:bg-black/80">
                  <Camera className="h-4 w-4 text-white" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={busy} />
                </label>
              </div>
              <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">{role}</span>
            </div>

            <form className="flex-1 space-y-4 w-full" onSubmit={handleUpdateProfile}>
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  required
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#A0A0A0]">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
                />
              </div>
              <button
                disabled={busy}
                type="submit"
                className="rounded-md bg-[#FFC107] px-4 py-2 font-medium text-black hover:brightness-110 disabled:opacity-60"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium"><Lock className="h-5 w-5 text-[#FFC107]"/> Change Password</h2>
          <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]">Current Password</label>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                required
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#A0A0A0]">New Password</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 disabled:opacity-60"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium text-red-400"><Trash2 className="h-5 w-5"/> Danger Zone</h2>
          <p className="mt-2 text-sm text-red-400/80">Once you delete your account, there is no going back. Please be certain.</p>
          <button
            onClick={handleDeleteAccount}
            disabled={busy}
            className="mt-4 rounded-md bg-red-500/20 px-4 py-2 font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-60"
          >
            Delete Account
          </button>
        </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}
