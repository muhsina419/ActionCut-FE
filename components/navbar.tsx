"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Clapperboard } from "lucide-react";
import { signOut } from "next-auth/react";

type NavbarProps = {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  apiBaseUrl?: string;
};

export function Navbar({ user, apiBaseUrl = "http://127.0.0.1:8000" }: NavbarProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#FFC107] hover:brightness-110">
            <Clapperboard className="h-6 w-6" />
            <span className="text-lg font-bold tracking-tight text-white">ActionCut AI</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-white truncate max-w-[150px]">{user.name}</p>
              <p className="text-[10px] text-[#A0A0A0] truncate max-w-[180px]">{user.email}</p>
            </div>

            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#A0A0A0] transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              title="Profile Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#A0A0A0] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 focus:outline-none cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfirmModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-sm rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
                <LogOut className="h-5 w-5" />
              </div>
              
              <h3 className="text-lg font-bold text-white">Confirm Sign Out</h3>
              <p className="mt-2 text-sm text-[#A0A0A0]">
                Are you sure you want to log out of ActionCut AI?
              </p>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-md border border-white/10 bg-white/5 py-2 text-sm font-semibold text-[#A0A0A0] hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 shadow-lg shadow-red-600/15 transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
