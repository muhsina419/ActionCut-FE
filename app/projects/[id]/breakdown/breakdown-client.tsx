"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, MapPin, Play, FolderX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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

type ProjectCharacter = {
  id: string;
  name: string;
  scene_count: number;
};

type ProjectLocation = {
  id: string;
  name: string;
  location_type: string;
  scene_count: number;
};

type BreakdownSummary = {
  characters: ProjectCharacter[];
  locations: ProjectLocation[];
  total_characters: number;
  total_locations: number;
};

type Props = {
  projectId: string;
  backendAccessToken: string;
  initialData: BreakdownSummary | null;
  user: { name: string; email: string };
};

export default function BreakdownClient({ projectId, backendAccessToken, initialData, user }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [data, setData] = useState<BreakdownSummary | null>(initialData);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBreakdown = async () => {
    setIsGenerating(true);
    toast.loading("Generating breakdown...", { id: "generate" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}/breakdown/generate`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to generate breakdown");
      
      toast.success("Breakdown generation started! This may take a while. Refresh the page later to see results.", { id: "generate" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error", { id: "generate" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col relative overflow-x-hidden w-full">
      {/* Background Projector Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute top-[300px] right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none z-0" />

      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="px-4 sm:px-6 py-6 sm:py-8 flex-grow relative z-10">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-6">
          
          <Link href={`/projects/${projectId}`} className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#8F9CAE] hover:text-[#F5C518] transition-colors cursor-pointer mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Link>

          {/* Frosted Glass Header Slate */}
          <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,24,0.04),transparent_40%)]" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">Script Breakdown Dashboard</h1>
                <p className="mt-1 text-xs text-[#8F9CAE]">Analyze characters, locations, and screenplay metrics.</p>
              </div>
              <Button 
                onClick={generateBreakdown} 
                disabled={isGenerating} 
                className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-10 px-5 active:scale-95 transition-all cursor-pointer shadow-md shadow-[#F5C518]/10"
              >
                <Play className="mr-1.5 h-4 w-4 fill-black text-black" /> {isGenerating ? "Generating..." : "Generate Breakdown"}
              </Button>
            </div>
          </section>

          {!data || (data.total_characters === 0 && data.total_locations === 0) ? (
            <div className="rounded-2xl border border-white/5 border-dashed bg-[#0F1015]/45 p-12 text-center text-[#8F9CAE]">
              <FolderX className="mx-auto h-12 w-12 opacity-35 mb-4" />
              <p className="text-xs">No breakdown data available yet.</p>
              <p className="mt-1 text-[10px] opacity-75">Click 'Generate Breakdown' to process scenes and extract screenplay elements.</p>
            </div>
          ) : (
            <>
              {/* HUD Summary Section */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-black/25 p-5 flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/20 shadow-lg shadow-[#F5C518]/5">
                    <Users className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono">Characters Detected</p>
                    <p className="mt-1 text-2xl font-extrabold text-white font-heading">{data.total_characters}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/25 p-5 flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                    <MapPin className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono">Locations Detected</p>
                    <p className="mt-1 text-2xl font-extrabold text-white font-heading">{data.total_locations}</p>
                  </div>
                </div>
              </section>

              {/* Data Frequency Tracks */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Characters Section */}
                <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl">
                  <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
                    <Users className="h-5 w-5 text-[#F5C518]" /> Characters List
                  </h2>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                    {data.characters.length === 0 ? (
                      <p className="text-xs text-[#8F9CAE]/70 italic">No characters detected.</p>
                    ) : (
                      (() => {
                        const maxCharScenes = Math.max(...data.characters.map(c => c.scene_count), 1);
                        return data.characters.sort((a, b) => b.scene_count - a.scene_count).map(char => {
                          const charPercent = Math.round((char.scene_count / maxCharScenes) * 100);
                          return (
                            <div key={char.id} className="group flex flex-col gap-2.5 p-3.5 bg-black/20 hover:bg-black/35 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F5C518]/25 bg-[#F5C518]/10 text-xs font-extrabold text-[#F5C518]">
                                    {char.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-extrabold text-white group-hover:text-[#F5C518] transition-colors">{char.name}</span>
                                </div>
                                <span className="text-xs font-mono text-[#8F9CAE] bg-white/5 px-2.5 py-0.5 rounded border border-white/5 font-extrabold">
                                  {char.scene_count} scene{char.scene_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#F5C518] to-amber-500 rounded-full" style={{ width: `${charPercent}%` }} />
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </section>

                {/* Locations Section */}
                <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl">
                  <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
                    <MapPin className="h-5 w-5 text-emerald-400" /> Locations List
                  </h2>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                    {data.locations.length === 0 ? (
                      <p className="text-xs text-[#8F9CAE]/70 italic">No locations detected.</p>
                    ) : (
                      (() => {
                        const maxLocScenes = Math.max(...data.locations.map(l => l.scene_count), 1);
                        return data.locations.sort((a, b) => b.scene_count - a.scene_count).map(loc => {
                          const locPercent = Math.round((loc.scene_count / maxLocScenes) * 100);
                          return (
                            <div key={loc.id} className="group flex flex-col gap-2.5 p-3.5 bg-black/20 hover:bg-black/35 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[120px] sm:max-w-none">{loc.name}</span>
                                  {loc.location_type && (
                                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[8px] font-extrabold text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                                      {loc.location_type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-[#8F9CAE] bg-white/5 px-2.5 py-0.5 rounded border border-white/5 font-extrabold">
                                  {loc.scene_count} scene{loc.scene_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${locPercent}%` }} />
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
