"use client";

import { Clapperboard } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 px-6 py-12 mt-auto w-full">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8F9CAE]">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-[#F5C518]" />
          <span className="font-bold text-white">ActionCut AI</span>
          <span>&copy; {new Date().getFullYear()}. All rights reserved.</span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Contact Support</a>
        </div>
      </div>
    </footer>
  );
}
