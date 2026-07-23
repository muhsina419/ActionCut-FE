"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Footer } from "@/components/footer";
import {
  Camera,
  Clapperboard,
  FileUp,
  Film,
  Languages,
  MapPin,
  Shirt,
  Sparkles,
  Users,
  WandSparkles,
  Wrench,
  ArrowRight,
  Check,
  RotateCcw,
  Play,
  ArrowUpRight,
  ChevronRight,
  Zap,
  Globe,
  Layers,
  FileText
} from "lucide-react";

// ----------------------------------------------------------------------
// Spotlight Cursor Follower Component
// ----------------------------------------------------------------------
function SpotlightCursorFollower() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.18)_0%,rgba(245,197,24,0)_70%)] blur-[2px]"
      animate={{
        x: mousePosition.x,
        y: mousePosition.y,
        scale: isPressed ? 1.35 : 1,
      }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 300,
        mass: 0.4,
      }}
    />
  );
}

// ----------------------------------------------------------------------
// Counter Component (Count-Up Animation)
// ----------------------------------------------------------------------
function Counter({ value, duration = 1.5, startTrigger = true }: { value: number; duration?: number; startTrigger?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startTrigger) {
      setCount(0);
      return;
    }
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    let incrementTime = Math.abs(Math.floor(totalMiliseconds / end));
    if (incrementTime < 10) incrementTime = 10;

    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration, startTrigger]);

  return <span>{count}</span>;
}

// ----------------------------------------------------------------------
// Screenplay AI Scanner Simulator Widget
// ----------------------------------------------------------------------
function ScriptScannerWidget() {
  const [status, setStatus] = useState<"idle" | "uploading" | "scanning" | "completed">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (status === "uploading") {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStatus("scanning"), 400);
            return 100;
          }
          return prev + 10;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === "scanning") {
      const timer = setTimeout(() => {
        setStatus("completed");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSimulate = () => {
    setStatus("uploading");
  };

  const handleReset = () => {
    setStatus("idle");
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0F1015]/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_45%)]" />
      
      {/* OS-like Header */}
      <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 text-[10px] font-mono tracking-wide text-[#8F9CAE]">screenplay_analyzer_v2.sh</span>
        </div>
        <div className="rounded border border-[#F5C518]/30 bg-[#F5C518]/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-[#F5C518] uppercase">
          {status === "idle" ? "Engine Idle" : status === "completed" ? "Breakdown Loaded" : "Processing"}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <div 
              className="group relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-[#F5C518]/50 hover:bg-[#F5C518]/5"
              onClick={handleSimulate}
            >
              <FileUp className="h-8 w-8 text-[#8F9CAE] group-hover:text-[#F5C518] transition-colors" />
              <motion.div 
                className="absolute inset-0 rounded-full border border-[#F5C518]/30"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              />
            </div>
            <h4 className="mt-5 text-base font-semibold text-white">Upload Your Screenplay</h4>
            <p className="mt-2 max-w-xs text-xs text-[#8F9CAE]">
              Drop screenplay PDF, DOCX, or TXT file here or click below to simulate the AI breakdown.
            </p>
            <button
              onClick={handleSimulate}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[#F5C518] px-5 py-2.5 text-xs font-bold text-black hover:brightness-110 shadow-lg shadow-[#F5C518]/25 transition-all active:scale-95 cursor-pointer"
            >
              <WandSparkles className="h-4 w-4" />
              Simulate AI Breakdown
            </button>
          </motion.div>
        )}

        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-14 text-center"
          >
            <Clapperboard className="h-10 w-10 animate-pulse text-[#F5C518]" />
            <h4 className="mt-4 text-sm font-semibold text-white">Ingesting screenplay.pdf...</h4>
            <div className="mt-4 w-52 overflow-hidden rounded-full bg-white/10 h-1.5">
              <motion.div 
                className="h-full bg-[#F5C518] rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#8F9CAE] font-mono">{uploadProgress}%</p>
          </motion.div>
        )}

        {status === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 lg:grid-cols-5 h-64 items-center"
          >
            {/* Screenplay Mock Page */}
            <div className="relative col-span-3 border border-white/5 bg-[#07080a] p-4 font-mono text-[9px] leading-relaxed text-[#8F9CAE] h-full overflow-hidden rounded-lg">
              {/* Laser Beam */}
              <motion.div
                animate={{ y: [0, 230, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent shadow-[0_0_10px_#F5C518] z-10"
              />
              <div className="space-y-3 opacity-90 select-none">
                <p className="text-center font-bold text-white">SCENE 1 - INT. CAFE - NIGHT</p>
                <p className="text-white/80">Soft jazz floats through the air. Muted green lighting.</p>
                <div className="pl-6 space-y-1">
                  <p className="font-bold text-white">LEO</p>
                  <p>(grips a leather binder)</p>
                  <p>It's not just a script, Aria. It's a blueprint.</p>
                </div>
                <div className="pl-6 space-y-1">
                  <p className="font-bold text-white">ARIA</p>
                  <p>Then let's break it down.</p>
                </div>
                <p className="text-white/80">She marks a heavy CLAPBOARD with a grease pencil.</p>
              </div>
            </div>

            {/* Parsing State */}
            <div className="col-span-2 space-y-3 h-full flex flex-col justify-center">
              <h4 className="text-[10px] font-bold uppercase text-[#8F9CAE] tracking-wider">Analysis Steps</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded bg-white/5 p-2 border border-white/5">
                  <Film className="h-4 w-4 text-[#F5C518] animate-spin" />
                  <div>
                    <p className="text-[9px] font-bold text-white">Scene Splitting</p>
                    <p className="text-[8px] text-[#8F9CAE]">Locating INT/EXT headings...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded bg-white/5 p-2 border border-white/5">
                  <Users className="h-4 w-4 text-blue-400 animate-bounce" />
                  <div>
                    <p className="text-[9px] font-bold text-white">Cast Detection</p>
                    <p className="text-[8px] text-[#8F9CAE]">Extracting speaking parts...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded bg-white/5 p-2 border border-white/5">
                  <MapPin className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-[9px] font-bold text-white">Locations</p>
                    <p className="text-[8px] text-[#8F9CAE]">Parsing cafe, studio...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Breakdown Complete!</h4>
                <p className="text-[10px] text-[#8F9CAE]">Processed screenplay in 4.9 seconds.</p>
              </div>
              <button 
                onClick={handleReset} 
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-[#8F9CAE] hover:text-white transition-all cursor-pointer" 
                title="Restart simulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-white/5 border border-white/5 p-2.5 text-center">
                <Film className="mx-auto h-4 w-4 text-[#F5C518] mb-1" />
                <p className="text-[9px] text-[#8F9CAE] font-medium uppercase tracking-wider">Scenes</p>
                <p className="text-base font-extrabold text-white mt-0.5"><Counter value={48} /></p>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/5 p-2.5 text-center">
                <Users className="mx-auto h-4 w-4 text-blue-400 mb-1" />
                <p className="text-[9px] text-[#8F9CAE] font-medium uppercase tracking-wider">Cast</p>
                <p className="text-base font-extrabold text-white mt-0.5"><Counter value={21} /></p>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/5 p-2.5 text-center">
                <MapPin className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
                <p className="text-[9px] text-[#8F9CAE] font-medium uppercase tracking-wider">Locations</p>
                <p className="text-base font-extrabold text-white mt-0.5"><Counter value={12} /></p>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/5 p-2.5 text-center">
                <Wrench className="mx-auto h-4 w-4 text-purple-400 mb-1" />
                <p className="text-[9px] text-[#8F9CAE] font-medium uppercase tracking-wider">Props</p>
                <p className="text-base font-extrabold text-white mt-0.5"><Counter value={134} /></p>
              </div>
            </div>

            {/* Extracted Scene Card preview */}
            <div className="rounded-lg border border-[#F5C518]/20 bg-[#F5C518]/5 p-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="rounded bg-black/40 px-2 py-0.5 text-[9px] font-bold text-[#F5C518]">SCENE 1</span>
                <span className="text-[10px] font-bold text-white tracking-wide">INT. CAFE - NIGHT</span>
              </div>
              
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[8px] uppercase font-bold text-[#8F9CAE] tracking-wider mb-1 flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-400" /> Characters
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["LEO", "ARIA"].map(c => (
                      <span key={c} className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-blue-400 border border-blue-500/20">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold text-[#8F9CAE] tracking-wider mb-1 flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-purple-400" /> Props
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["CLAPBOARD", "BINDER"].map(p => (
                      <span key={p} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-purple-400 border border-purple-500/20">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main Landing Client Component
// ----------------------------------------------------------------------
type Props = {
  session: any;
};

export default function LandingClient({ session }: Props) {
  const features = [
    { 
      icon: Film, 
      title: "Scene Detection", 
      description: "Instantly divides text into structured scenes, auto-classifying INT/EXT, environments, and day/night splits.",
      color: "from-amber-400/20 to-orange-500/20",
      accent: "text-amber-400"
    },
    { 
      icon: Users, 
      title: "Cast Breakdown", 
      description: "Scans dialogues and descriptions to detect characters, speech frequency, and timeline mapping.",
      color: "from-blue-400/20 to-indigo-500/20",
      accent: "text-blue-400"
    },
    { 
      icon: Wrench, 
      title: "Props Tracking", 
      description: "Highlights key physical props, set dressings, and technical gears mentioned across actions.",
      color: "from-purple-400/20 to-pink-500/20",
      accent: "text-purple-400"
    },
    { 
      icon: Shirt, 
      title: "Costumes & Wardrobe", 
      description: "Catalogs clothing specifications, visual cues, costume changes, and scene-specific garments.",
      color: "from-red-400/20 to-pink-500/20",
      accent: "text-red-400"
    },
    { 
      icon: MapPin, 
      title: "Location Management", 
      description: "Aggregates, lists, and links distinct environments for simplified location scouting and planning.",
      color: "from-emerald-400/20 to-teal-500/20",
      accent: "text-emerald-400"
    },
    { 
      icon: Sparkles, 
      title: "Production Insights", 
      description: "Flags VFX needs, animal performers, vehicles, stunts, and special regulatory requirements.",
      color: "from-cyan-400/20 to-sky-500/20",
      accent: "text-cyan-400"
    },
  ];

  const testimonials = [
    { quote: "We cut screenplay preparation time in half before cameras even rolled. Action Cut is an absolute game-changer.", name: "Sarah Cherian", role: "Chief Assistant Director" },
    { quote: "The accuracy of character breakdowns saved our scheduling team days of manual auditing. Extremely reliable.", name: "Goutham S.", role: "Line Producer" },
    { quote: "An essential pipeline tool for indie filmmakers. Uploading a PDF and getting detailed prop lists in minutes is magic.", name: "Michael Vance", role: "Director & Writer" },
  ];

  const ctaLink = session ? "/dashboard" : "/signup";
  const startBtnText = session ? "Go to Dashboard" : "Start Free";
  const trialBtnText = session ? "Go to Dashboard" : "Start Free Trial";

  return (
    <div className="min-h-screen bg-[#060709] text-white scroll-smooth selection:bg-[#F5C518]/30 selection:text-white custom-scissors-hover relative overflow-x-hidden w-full">
      {/* Inject custom cursor styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scissors-hover a, 
        .custom-scissors-hover button,
        .custom-scissors-hover [role="button"],
        .custom-scissors-hover input[type="submit"],
        .custom-scissors-hover input[type="button"],
        .custom-scissors-hover select {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23F5C518' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='6' cy='6' r='3'></circle><circle cx='6' cy='18' r='3'></circle><line x1='9.8' y1='8.2' x2='20' y2='17'></line><line x1='9.8' y1='15.8' x2='20' y2='7'></line></svg>") 9 12, pointer !important;
        }
      `}} />

      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      {/* Projection Flare Top Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,24,0.11),transparent_65%)] pointer-events-none z-0" />
      <div className="absolute top-[400px] right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_100%_50%,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none z-0" />

      {/* ----------------------------------------------------------------------
          Header / Navigation
          ---------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#060709]/75 backdrop-blur-xl transition-all">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5 font-bold text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C518] to-amber-600 shadow-md shadow-amber-500/10">
              <Clapperboard className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg tracking-tight">ActionCut AI</span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#8F9CAE] md:flex">
            <a href="#features" className="hover:text-white transition-colors relative group py-2">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#F5C518] transition-all group-hover:w-full" />
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors relative group py-2">
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#F5C518] transition-all group-hover:w-full" />
            </a>
            <a href="#compare" className="hover:text-white transition-colors relative group py-2">
              The Comparison
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#F5C518] transition-all group-hover:w-full" />
            </a>
            <a href="#testimonials" className="hover:text-white transition-colors relative group py-2">
              Reviews
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#F5C518] transition-all group-hover:w-full" />
            </a>
          </div>

          <div className="flex items-center gap-4">
            {!session && (
              <Link 
                href="/signin" 
                className="text-sm font-semibold text-[#8F9CAE] hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
            <Link 
              href={ctaLink} 
              className="rounded-lg bg-[#F5C518] px-4.5 py-2 text-sm font-bold text-black hover:brightness-110 shadow-lg shadow-[#F5C518]/15 active:scale-95 transition-all"
            >
              {startBtnText}
            </Link>
          </div>
        </nav>
      </header>

      {/* ----------------------------------------------------------------------
          Hero Section
          ---------------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-28 md:pb-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F5C518]/20 bg-[#F5C518]/5 px-3.5 py-1 text-xs font-semibold tracking-wider text-[#F5C518] uppercase">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Automated Script Breakdown
            </div>
            
            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl text-white">
              Turn Screenplays Into <span className="bg-gradient-to-r from-amber-200 via-[#F5C518] to-amber-500 bg-clip-text text-transparent">Production Plans</span> in Seconds
            </h1>
            
            <p className="max-w-lg text-base leading-relaxed text-[#8F9CAE]">
              Skip days of manual logging. Upload any script and let AI instantly parse scenes, isolate speaking cast, index props, organize locations, and output export-ready reports.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <Link 
                href={ctaLink}
                className="flex items-center gap-2 rounded-lg bg-[#F5C518] px-6 py-3.5 text-sm font-extrabold text-black hover:brightness-110 shadow-xl shadow-[#F5C518]/20 transition-all active:scale-97 cursor-pointer"
              >
                {trialBtnText}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a 
                href="#how-it-works"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-97"
              >
                See How It Works
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full"
          >
            <ScriptScannerWidget />
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Target Audience Section
          ---------------------------------------------------------------------- */}
      <section className="border-t border-white/5 bg-white/[0.01] py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-[#8F9CAE]">
            Empowering Film Production Across the Board
          </p>
          <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-5 text-center">
            {[
              { role: "Assistant Directors", desc: "Instantly draft slates" },
              { role: "Line Producers", desc: "Build scheduling budgets" },
              { role: "Indie Filmmakers", desc: "Simplify pre-production" },
              { role: "Production Managers", desc: "Consolidate prop sheets" },
              { role: "Film Students", desc: "Learn script breakdown fast" }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="rounded-xl border border-white/5 bg-[#0F1015]/40 p-4 transition-all hover:border-[#F5C518]/20 hover:bg-[#0F1015]/80"
              >
                <p className="text-sm font-bold text-white">{item.role}</p>
                <p className="mt-1 text-[11px] text-[#8F9CAE]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Features Grid Section
          ---------------------------------------------------------------------- */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
            Granular Extracts, Zero Manual Typing
          </h2>
          <p className="mt-4 text-base text-[#8F9CAE]">
            Our models look beyond simple regex splits. We leverage LLMs to read between dialogue lanes, tracking elements contextually.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                whileHover={{ y: -6, borderColor: "rgba(255, 255, 255, 0.15)" }} 
                key={idx} 
                className="group relative rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-sm transition-all"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} ${feature.accent} mb-5`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#F5C518] transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#8F9CAE]">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          How It Works Section
          ---------------------------------------------------------------------- */}
      <section id="how-it-works" className="border-t border-b border-white/5 bg-white/[0.01] py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              The 3-Step Production Pipeline
            </h2>
            <p className="mt-4 text-base text-[#8F9CAE]">
              From final script draft to production checklists in less than a minute.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 relative">
            {/* Visual connector lines */}
            <div className="hidden lg:block absolute top-[52px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-0" />
            
            {[
              { step: "01", icon: FileText, title: "Upload screenplay", desc: "Drag screenplay files directly into your dashboard. Supports PDF, Word, and text configurations." },
              { step: "02", icon: WandSparkles, title: "Review AI breakdown", desc: "Our engine separates scenes and indexes elements. Edit cast list and location types in an active editor." },
              { step: "03", icon: Clapperboard, title: "Export schedules", desc: "Print clean PDF reports, compile summary sheets, and export breakdowns to share with team leaders." }
            ].map((stepItem, idx) => {
              const StepIcon = stepItem.icon;
              return (
                <div key={idx} className="relative rounded-2xl border border-white/5 bg-[#0A0B0E]/60 p-6 flex flex-col items-center text-center z-10 hover:border-white/10 transition-all">
                  <span className="absolute top-4 right-5 text-2xl font-black text-[#F5C518]/15 font-mono select-none">
                    {stepItem.step}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-4">
                    <StepIcon className="h-5 w-5 text-[#F5C518]" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{stepItem.title}</h3>
                  <p className="text-xs leading-relaxed text-[#8F9CAE]">{stepItem.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Traditional vs Action Cut AI Comparison
          ---------------------------------------------------------------------- */}
      <section id="compare" className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-extrabold text-white">
            Why Switch to ActionCut?
          </h2>
          <p className="mt-3 text-sm text-[#8F9CAE]">
            How automated analysis stacks up against conventional spreadsheet tagging.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Traditional Card */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6.5 shadow-lg">
            <h3 className="text-lg font-bold text-red-400 border-b border-white/5 pb-3">
              Traditional Script Breakdowns
            </h3>
            <ul className="mt-5 space-y-3.5 text-xs text-[#8F9CAE]">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-red-500/10 p-0.5 text-red-400 border border-red-500/20">
                  <ChevronRight className="h-3 w-3" />
                </span>
                <span>Requires hours of tedious reading, highlighting, and manual entry per draft.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-red-500/10 p-0.5 text-red-400 border border-red-500/20">
                  <ChevronRight className="h-3 w-3" />
                </span>
                <span>Prone to human omission errors—missed prop mentions can stall production.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-red-500/10 p-0.5 text-red-400 border border-red-500/20">
                  <ChevronRight className="h-3 w-3" />
                </span>
                <span>Scrambled file versions between department heads causing budget conflicts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-red-500/10 p-0.5 text-red-400 border border-red-500/20">
                  <ChevronRight className="h-3 w-3" />
                </span>
                <span>No automated scheduling metrics—everything is re-calculated in spreadsheets.</span>
              </li>
            </ul>
          </div>

          {/* Action Cut AI Card */}
          <div className="rounded-2xl border border-[#F5C518]/30 bg-gradient-to-b from-[#F5C518]/5 to-transparent p-6.5 shadow-2xl relative">
            <div className="absolute -top-3.5 right-6 rounded-full bg-[#F5C518] px-3.5 py-1 text-[10px] font-extrabold text-black tracking-wide uppercase">
              RECOMENDED
            </div>
            <h3 className="text-lg font-bold text-[#F5C518] border-b border-[#F5C518]/15 pb-3">
              ActionCut AI Platform
            </h3>
            <ul className="mt-5 space-y-3.5 text-xs text-white">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-emerald-500/15 p-0.5 text-emerald-400 border border-emerald-500/25">
                  <Check className="h-3 w-3" />
                </span>
                <span>Complete scene classification and breakdowns in less than 10 seconds.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-emerald-500/15 p-0.5 text-emerald-400 border border-emerald-500/25">
                  <Check className="h-3 w-3" />
                </span>
                <span>Consistent semantic scan detects props, costumes, and vehicles contextually.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-emerald-500/15 p-0.5 text-emerald-400 border border-emerald-500/25">
                  <Check className="h-3 w-3" />
                </span>
                <span>Unified project workspace with single-source edit locks and history tracking.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-full bg-emerald-500/15 p-0.5 text-emerald-400 border border-emerald-500/25">
                  <Check className="h-3 w-3" />
                </span>
                <span>Immediate day/night, location split charts, and exportable PDF breakdown logs.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Global Language Section
          ---------------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-12 text-center border-t border-white/5">
        <h3 className="text-lg font-extrabold text-white">Global Script Understanding</h3>
        <p className="mt-2 text-sm text-[#8F9CAE]">Analyze, edit, and translate scripts across multiple regional contexts.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["English", "Malayalam", "Hindi", "Tamil", "Telugu"].map((lang) => (
            <span key={lang} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white">
              <Globe className="h-3.5 w-3.5 text-[#F5C518]" />
              {lang}
            </span>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Testimonials Section
          ---------------------------------------------------------------------- */}
      <section id="testimonials" className="border-t border-white/5 bg-white/[0.01] py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-extrabold text-center text-white mb-14">
            Trusted by the Crew
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-white/5 bg-[#0F1015]/50 p-6 flex flex-col justify-between"
              >
                <p className="text-sm leading-relaxed text-[#8F9CAE] italic">
                  "{t.quote}"
                </p>
                <div className="mt-6">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-[#8F9CAE] mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          Call To Action (Slate Banner)
          ---------------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#F5C518]/25 bg-gradient-to-br from-[#101115] via-[#0A0B0E] to-[#12131A] p-10 md:p-14 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/30">
              <Zap className="h-6 w-6 text-[#F5C518]" />
            </div>
            
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              Ready to Accelerate Your Script Prep?
            </h2>
            
            <p className="text-sm text-[#8F9CAE] leading-relaxed">
              Join assistant directors, independent creators, and line producers already saving hundreds of hours on screenplay breakdowns. Start your first script analysis for free.
            </p>
            
            <div className="pt-2">
              <Link 
                href={ctaLink} 
                className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-7 py-4 font-extrabold text-sm text-black hover:brightness-110 shadow-lg shadow-[#F5C518]/20 transition-all active:scale-95 cursor-pointer"
              >
                {trialBtnText}
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
