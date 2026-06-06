"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Settings, Clapperboard } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#FFC107] hover:brightness-110">
          <Clapperboard className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight text-white">ActionCut AI</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/30 hover:border-white/40 focus:outline-none"
          >
            {user.avatarUrl ? (
              <img src={`${apiBaseUrl}${user.avatarUrl}`} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-[#A0A0A0]" />
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-white/10 bg-[#1A1A1A] py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-[#A0A0A0]">{user.email}</p>
              </div>
              
              <div className="py-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Profile Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
