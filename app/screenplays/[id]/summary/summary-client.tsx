"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Download, FileText, Users, MapPin, Film, FolderX, ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { ProcessingSummary, SceneListResponse } from "@/lib/screenplay-types";
import { Footer } from "@/components/footer";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

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
      className="pointer-events-none fixed top-0 left-0 z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.18)_0%,rgba(245,197,24,0)_70%)] blur-[2px] print:hidden"
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

type Props = {
  backendAccessToken: string;
  scriptId: string;
  initialSummary: ProcessingSummary;
  initialScenesData: SceneListResponse;
};

export default function SummaryClient({ backendAccessToken, scriptId, initialSummary, initialScenesData }: Props) {
  const router = useRouter();
  
  // Accordion states
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);

  const handleDownload = async () => {
    const toastId = toast.loading("Generating PDF breakdown...");
    try {
      // ESM default export fallback compatibility
      const html2canvasFunc = (html2canvas as any).default || html2canvas;
      if (typeof html2canvasFunc !== "function") {
        throw new Error("html2canvas is not loaded as a function");
      }

      // Get all rendered pages in the DOM
      const elements = Array.from(document.querySelectorAll('[id^="pdf-page-"]')) as HTMLElement[];
      const totalPages = elements.length;

      if (totalPages === 0) {
        throw new Error("No PDF Page elements found to print");
      }

      // Update page numbers in the DOM elements dynamically before capturing
      elements.forEach((el, idx) => {
        const pageNumEl = el.querySelector(".pdf-page-number-target");
        if (pageNumEl) {
          pageNumEl.textContent = `Page ${idx + 1} of ${totalPages}`;
        }
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let isFirstPage = true;
      for (let idx = 0; idx < totalPages; idx++) {
        const el = elements[idx];
        if (!isFirstPage) {
          pdf.addPage();
        }

        const canvas = await html2canvasFunc(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
        isFirstPage = false;
      }

      const fileName = `${initialSummary.structure_type || "screenplay"}_breakdown_summary.pdf`;
      pdf.save(fileName);
      toast.success("PDF summary downloaded successfully!", { id: toastId });
    } catch (error: any) {
      console.error("PDF generation failed:", error);
      toast.error(`Failed to generate PDF summary: ${error?.message || error}`, { id: toastId });
    }
  };

  const labelForStructure = (value: string) =>
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const totalScenes = initialScenesData.scenes.length;

  const normalizeText = (text: string) => {
    if (!text) return "";
    return text
      .trim()
      .toUpperCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero width joiners/spaces
      .replace(/\s+/g, ' '); // normalize multiple spaces to a single space
  };

  const characterSceneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (initialSummary.characters) {
      initialSummary.characters.forEach(char => {
        const charUpper = normalizeText(char);
        counts[char] = initialScenesData.scenes.filter(s => normalizeText(s.content).includes(charUpper)).length;
      });
    }
    return counts;
  }, [initialSummary.characters, initialScenesData.scenes]);

  const locationSceneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (initialSummary.locations) {
      initialSummary.locations.forEach(loc => {
        const locUpper = normalizeText(loc);
        counts[loc] = initialScenesData.scenes.filter(s => 
          normalizeText(s.heading).includes(locUpper) || normalizeText(s.content).includes(locUpper)
        ).length;
      });
    }
    return counts;
  }, [initialSummary.locations, initialScenesData.scenes]);

  const sortedChars = useMemo(() => {
    return initialSummary.characters 
      ? [...initialSummary.characters].sort((a, b) => (characterSceneCounts[b] || 0) - (characterSceneCounts[a] || 0))
      : [];
  }, [initialSummary.characters, characterSceneCounts]);

  const sortedLocs = useMemo(() => {
    return initialSummary.locations
      ? [...initialSummary.locations].sort((a, b) => (locationSceneCounts[b] || 0) - (locationSceneCounts[a] || 0))
      : [];
  }, [initialSummary.locations, locationSceneCounts]);

  const isShortScript = sortedChars.length <= 15 && sortedLocs.length <= 10;

  const getSceneStats = () => {
    let day = 0;
    let night = 0;
    let indoor = 0;
    let outdoor = 0;

    initialScenesData.scenes.forEach(scene => {
      const heading = scene.heading.toUpperCase();
      
      // Check Day/Morning/Afternoon (English + Malayalam: പകൽ, രാവിലെ, ഉച്ച)
      if (
        heading.includes('DAY') || heading.includes('MORNING') || heading.includes('AFTERNOON') ||
        heading.includes('പകൽ') || heading.includes('രാവിലെ') || heading.includes('ഉച്ച')
      ) {
        day++;
      } 
      // Check Night/Evening (English + Malayalam: രാത്രി, വൈകുന്നേരം, സന്ധ്യ)
      else if (
        heading.includes('NIGHT') || heading.includes('EVENING') ||
        heading.includes('രാത്രി') || heading.includes('വൈകുന്നേരം') || heading.includes('സന്ധ്യ')
      ) {
        night++;
      }

      // Check Indoor/Int (English + Malayalam: അകം, അകത്ത്, ഉള്ളിൽ)
      if (
        heading.includes('INT.') || heading.includes('INT ') || heading.includes('INDOOR') ||
        heading.includes('അകം') || heading.includes('അകത്ത്') || heading.includes('ഉള്ളിൽ')
      ) {
        indoor++;
      } 
      // Check Outdoor/Ext (English + Malayalam: പുറത്ത്, പുറം)
      else if (
        heading.includes('EXT.') || heading.includes('EXT ') || heading.includes('OUTDOOR') ||
        heading.includes('പുറത്ത്') || heading.includes('പുറം')
      ) {
        outdoor++;
      }
    });

    return { day, night, indoor, outdoor };
  };

  const sceneStats = getSceneStats();

  return (
    <main className="min-h-screen bg-[#060709] text-white print:bg-white print:text-black flex flex-col relative overflow-x-hidden w-full">
      {/* Background Projector Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none z-0 print:hidden" />
      <div className="absolute top-[300px] right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none z-0 print:hidden" />

      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      <Toaster richColors position="top-right" className="print:hidden" />
      
      {/* Main Container */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 py-6 sm:py-8 flex-grow relative z-10 w-full">
        
        {/* Full-width Header Panel (Replaces Sidebar) */}
        <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-5 sm:p-6 shadow-2xl backdrop-blur-xl print:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,24,0.04),transparent_40%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link 
                href={initialSummary.project_id ? `/projects/${initialSummary.project_id}` : "/dashboard"}
                className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#8F9CAE] hover:text-[#F5C518] transition-colors cursor-pointer mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
              </Link>
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">Script Summary Dashboard</h1>
              <p className="text-xs text-[#8F9CAE]">AI analysis, time splits, character logs, and locations.</p>
            </div>
            
            <div className="flex items-center gap-3.5 self-start md:self-center">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                Analysis: {initialSummary.processing_status}
              </span>
              <Button 
                onClick={handleDownload}
                className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-10 px-5 active:scale-95 transition-all cursor-pointer shadow-md shadow-[#F5C518]/10"
              >
                <Download className="mr-1.5 h-4.5 w-4.5" /> Download PDF Summary
              </Button>
            </div>
          </div>
        </section>

        {/* Printable Title Block */}
        <div className="hidden print:block mb-8">
          <h1 className="text-4xl font-bold border-b pb-4 mb-4">Screenplay Breakdown Summary</h1>
          <p className="text-gray-600">Generated automatically by ActionCut AI</p>
        </div>

        {/* Overview Statistics HUD */}
        <div className="rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl print:border-gray-300 print:bg-white print:text-black print:shadow-none">
          <h2 className="text-base font-bold text-white mb-6 print:text-black flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F5C518] print:text-black" />
            Overview Statistics
          </h2>
          
          {/* Core Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-black/25 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono print:text-gray-500">Language</p>
              <p className="text-lg font-extrabold text-white mt-1 print:text-black truncate">{initialSummary.language}</p>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono print:text-gray-500">Format</p>
              <p className="text-sm font-extrabold text-white mt-1.5 print:text-black truncate">{labelForStructure(initialSummary.structure_type || "")}</p>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono print:text-gray-500">Total Scenes</p>
              <p className="text-xl font-extrabold text-[#F5C518] mt-1 print:text-black">{initialSummary.scene_count ?? totalScenes}</p>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono print:text-gray-500">Characters</p>
              <p className="text-xl font-extrabold text-indigo-400 mt-1 print:text-black">{initialSummary.character_count ?? (initialSummary.characters?.length || 0)}</p>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono print:text-gray-500">Locations</p>
              <p className="text-xl font-extrabold text-emerald-400 mt-1 print:text-black">{initialSummary.location_count ?? (initialSummary.locations?.length || 0)}</p>
            </div>
          </div>

          {/* Time & Environment Split Segments */}
          <div className="mt-6 grid gap-6 md:grid-cols-2 pt-6 border-t border-white/5 print:border-gray-200">
            {/* Day/Night Split */}
            <div className="bg-black/15 border border-white/5 rounded-xl p-4.5 print:bg-transparent print:border-gray-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#8F9CAE]">
                <span className="font-bold uppercase tracking-wider font-mono">Day / Night Split</span>
                <span className="font-mono">{sceneStats.day} Day / {sceneStats.night} Night</span>
              </div>
              {(() => {
                const total = sceneStats.day + sceneStats.night || 1;
                const dayPct = Math.round((sceneStats.day / total) * 100);
                const nightPct = 100 - dayPct;
                return (
                  <div className="mt-3.5">
                    <div className="w-full bg-blue-950 h-3 rounded-full overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-amber-300 to-[#F5C518] rounded-l-full" style={{ width: `${dayPct}%` }} title={`Day: ${dayPct}%`} />
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-900 rounded-r-full" style={{ width: `${nightPct}%` }} title={`Night: ${nightPct}%`} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-[#8F9CAE]/75 font-mono">
                      <span>Day: {dayPct}%</span>
                      <span>Night: {nightPct}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Indoor/Outdoor Split */}
            <div className="bg-black/15 border border-white/5 rounded-xl p-4.5 print:bg-transparent print:border-gray-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#8F9CAE]">
                <span className="font-bold uppercase tracking-wider font-mono">Interior / Exterior Split</span>
                <span className="font-mono">{sceneStats.indoor} INT / {sceneStats.outdoor} EXT</span>
              </div>
              {(() => {
                const total = sceneStats.indoor + sceneStats.outdoor || 1;
                const indoorPct = Math.round((sceneStats.indoor / total) * 100);
                const outdoorPct = 100 - indoorPct;
                return (
                  <div className="mt-3.5">
                    <div className="w-full bg-teal-950 h-3 rounded-full overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-amber-600 rounded-l-full" style={{ width: `${indoorPct}%` }} title={`INT: ${indoorPct}%`} />
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-r-full" style={{ width: `${outdoorPct}%` }} title={`EXT: ${outdoorPct}%`} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-[#8F9CAE]/75 font-mono">
                      <span>INT (Indoor): {indoorPct}%</span>
                      <span>EXT (Outdoor): {outdoorPct}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Collapsible Accordion Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block print:space-y-6">
          
          {/* Characters Section */}
          <div className="rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 print:border-gray-300 print:bg-white print:text-black">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 print:text-black">
              <Users className="h-5 w-5 text-indigo-400 print:text-black" />
              Detected Characters
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {initialSummary.characters && initialSummary.characters.length > 0 ? (
                (() => {
                  const sortedChars = [...initialSummary.characters].sort((a, b) => (characterSceneCounts[b] || 0) - (characterSceneCounts[a] || 0));
                  return sortedChars.map((char, idx) => {
                    const charCount = characterSceneCounts[char] || 0;
                    const isExpanded = expandedChar === char;
                    const appearances = initialScenesData.scenes.filter(s => normalizeText(s.content).includes(normalizeText(char)));
                    
                    return (
                      <div 
                        key={idx} 
                        className="group border border-white/5 bg-black/20 hover:bg-black/35 rounded-xl transition-all duration-300 print:border-gray-200 print:bg-gray-50 overflow-hidden"
                      >
                        {/* Trigger Header */}
                        <div 
                          onClick={() => setExpandedChar(isExpanded ? null : char)}
                          className="flex items-center justify-between p-4.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F5C518]/25 bg-[#F5C518]/10 text-xs font-extrabold text-[#F5C518] print:border-gray-300 print:text-black">
                              {char.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-extrabold text-white group-hover:text-[#F5C518] transition-colors print:text-black truncate max-w-[140px] sm:max-w-none">{char}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#8F9CAE] bg-white/5 px-2.5 py-0.5 rounded border border-white/5 font-extrabold print:border-gray-300 print:text-black">
                              {charCount} scene{charCount !== 1 ? 's' : ''}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-[#8F9CAE] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''} print:hidden`} />
                          </div>
                        </div>

                        {/* Collapsible scene listings */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                              <div className="px-4.5 pb-4.5 pt-1.5 border-t border-white/5 space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin print:block">
                                <p className="text-[9px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono mb-2">Appears in scenes:</p>
                                {appearances.length === 0 ? (
                                  <p className="text-xs text-[#8F9CAE]/50 italic">No scene details found in screenplay.</p>
                                ) : (
                                  appearances.map(s => (
                                    <div key={s.id} className="flex justify-between items-center text-xs text-[#8F9CAE] bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-md hover:text-white hover:bg-white/[0.03] transition-colors">
                                      <span className="truncate pr-4">Scene {s.scene_number}: {s.heading}</span>
                                      <span className="text-[9px] font-mono opacity-75 shrink-0">Scene {s.scene_number}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-sm text-[#AAB4BF] italic print:text-gray-500">No characters detected</p>
              )}
            </div>
          </div>

          {/* Locations Section */}
          <div className="rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 print:border-gray-300 print:bg-white print:text-black">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 print:text-black">
              <MapPin className="h-5 w-5 text-emerald-400 print:text-black" />
              Detected Locations
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {initialSummary.locations && initialSummary.locations.length > 0 ? (
                (() => {
                  const sortedLocs = [...initialSummary.locations].sort((a, b) => (locationSceneCounts[b] || 0) - (locationSceneCounts[a] || 0));
                  return sortedLocs.map((loc, idx) => {
                    const locCount = locationSceneCounts[loc] || 0;
                    const isExpanded = expandedLoc === loc;
                    const appearances = initialScenesData.scenes.filter(s => normalizeText(s.heading).includes(normalizeText(loc)) || normalizeText(s.content).includes(normalizeText(loc)));
                    
                    return (
                      <div 
                        key={idx} 
                        className="group border border-white/5 bg-black/20 hover:bg-black/35 rounded-xl transition-all duration-300 print:border-gray-200 print:bg-gray-50 overflow-hidden"
                      >
                        {/* Trigger Header */}
                        <div 
                          onClick={() => setExpandedLoc(isExpanded ? null : loc)}
                          className="flex items-center justify-between p-4.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 print:border-gray-300 print:text-black">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors print:text-black truncate max-w-[140px] sm:max-w-none">{loc}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#8F9CAE] bg-white/5 px-2.5 py-0.5 rounded border border-white/5 font-extrabold print:border-gray-300 print:text-black">
                              {locCount} scene{locCount !== 1 ? 's' : ''}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-[#8F9CAE] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''} print:hidden`} />
                          </div>
                        </div>

                        {/* Collapsible scene listings */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                              <div className="px-4.5 pb-4.5 pt-1.5 border-t border-white/5 space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin print:block">
                                <p className="text-[9px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono mb-2">Scenes set here:</p>
                                {appearances.length === 0 ? (
                                  <p className="text-xs text-[#8F9CAE]/50 italic">No scene details found in screenplay.</p>
                                ) : (
                                  appearances.map(s => (
                                    <div key={s.id} className="flex justify-between items-center text-xs text-[#8F9CAE] bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-md hover:text-white hover:bg-white/[0.03] transition-colors">
                                      <span className="truncate pr-4">Scene {s.scene_number}: {s.heading}</span>
                                      <span className="text-[9px] font-mono opacity-75 shrink-0">Scene {s.scene_number}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-sm text-[#AAB4BF] italic print:text-gray-500">No locations detected</p>
              )}
            </div>
          </div>
        </div>

      </div>
      <div className="print:hidden w-full">
        <Footer />
      </div>

      {/* Hidden PDF Print Template for html2canvas to render Unicode Malayalam/Hindi perfectly */}
      <div 
        id="pdf-print-template" 
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px"
        }}
      >
        {isShortScript ? (
          /* ==========================================
             SHORT SCRIPT: Single Page Layout
             ========================================== */
          <div 
            id="pdf-page-1"
            style={{
              width: "800px",
              height: "1130px",
              backgroundColor: "#ffffff",
              color: "#1E293B",
              padding: "40px",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              position: "relative",
              boxSizing: "border-box"
            }}
          >
            {/* Header Block */}
            <div style={{ backgroundColor: "#0F1015", borderBottom: "4px solid #F5C518", padding: "24px", color: "#ffffff", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "0.05em", color: "#ffffff", margin: 0 }}>ACTIONCUT AI</h1>
                <span style={{ fontSize: "10px", textTransform: "uppercase", backgroundColor: "rgba(255,255,255,0.1)", padding: "2px 8px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", fontFamily: "monospace", marginLeft: "auto" }}>Screenplay Summary Report</span>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginTop: "16px", letterSpacing: "-0.025em", margin: "16px 0 0 0" }}>Screenplay Breakdown Report</h2>
              <div style={{ display: "flex", gap: "24px", marginTop: "16px", fontSize: "12px", fontWeight: "bold", color: "#F5C518" }}>
                <span>FORMAT: {labelForStructure(initialSummary.structure_type || "")}</span>
                <span style={{ color: "#ffffff" }}>|</span>
                <span>LANGUAGE: {initialSummary.language.toUpperCase()}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Total Scenes", value: String(initialSummary.scene_count ?? totalScenes) },
                { label: "Characters", value: String(initialSummary.character_count ?? (initialSummary.characters?.length || 0)) },
                { label: "Locations", value: String(initialSummary.location_count ?? (initialSummary.locations?.length || 0)) },
                { label: "Day Scenes", value: String(sceneStats.day) },
                { label: "Night Scenes", value: String(sceneStats.night) },
                { label: "Indoor Scenes", value: String(sceneStats.indoor) },
              ].map((stat, idx) => (
                <div key={idx} style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{stat.label}</p>
                  <p style={{ fontSize: "16px", fontWeight: "900", color: "#0F1015", marginTop: "2px", margin: "2px 0 0 0" }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Characters Table */}
            {sortedChars.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>1. Detected Characters</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                      <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>CHARACTER NAME</th>
                      <th style={{ padding: "8px" }}>SCENE APPEARANCES</th>
                      <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>APPEARANCE RATIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedChars.map((char, idx) => {
                      const count = characterSceneCounts[char] || 0;
                      const total = (initialSummary.scene_count ?? totalScenes) || 1;
                      const ratio = `${Math.round((count / total) * 100)}%`;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{char}</td>
                          <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                          <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Locations Table */}
            {sortedLocs.length > 0 && (
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>2. Detected Locations</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                      <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>LOCATION SETTING</th>
                      <th style={{ padding: "8px" }}>SCENE COUNT</th>
                      <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>SETTING PERCENTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLocs.map((loc, idx) => {
                      const count = locationSceneCounts[loc] || 0;
                      const total = (initialSummary.scene_count ?? totalScenes) || 1;
                      const ratio = `${Math.round((count / total) * 100)}%`;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{loc}</td>
                          <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                          <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Footer */}
            <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
              <span>Generated by ActionCut AI</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        ) : (
          /* ==========================================
             LONG SCRIPT: Multi-page Paginated Layout
             ========================================== */
          <>
            {/* PAGE 1: Cover + Stats + Characters (0 to 14) */}
            <div 
              id="pdf-page-1"
              style={{
                width: "800px",
                height: "1130px",
                backgroundColor: "#ffffff",
                color: "#1E293B",
                padding: "40px",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                position: "relative",
                boxSizing: "border-box"
              }}
            >
              <div style={{ backgroundColor: "#0F1015", borderBottom: "4px solid #F5C518", padding: "24px", color: "#ffffff", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h1 style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "0.05em", color: "#ffffff", margin: 0 }}>ACTIONCUT AI</h1>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", backgroundColor: "rgba(255,255,255,0.1)", padding: "2px 8px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", fontFamily: "monospace", marginLeft: "auto" }}>Screenplay Summary Report</span>
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginTop: "16px", letterSpacing: "-0.025em", margin: "16px 0 0 0" }}>Screenplay Breakdown Report</h2>
                <div style={{ display: "flex", gap: "24px", marginTop: "16px", fontSize: "12px", fontWeight: "bold", color: "#F5C518" }}>
                  <span>FORMAT: {labelForStructure(initialSummary.structure_type || "")}</span>
                  <span style={{ color: "#ffffff" }}>|</span>
                  <span>LANGUAGE: {initialSummary.language.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "Total Scenes", value: String(initialSummary.scene_count ?? totalScenes) },
                  { label: "Characters", value: String(initialSummary.character_count ?? (initialSummary.characters?.length || 0)) },
                  { label: "Locations", value: String(initialSummary.location_count ?? (initialSummary.locations?.length || 0)) },
                  { label: "Day Scenes", value: String(sceneStats.day) },
                  { label: "Night Scenes", value: String(sceneStats.night) },
                  { label: "Indoor Scenes", value: String(sceneStats.indoor) },
                ].map((stat, idx) => (
                  <div key={idx} style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{stat.label}</p>
                    <p style={{ fontSize: "16px", fontWeight: "900", color: "#0F1015", marginTop: "2px", margin: "2px 0 0 0" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>1. Detected Characters</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                    <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>CHARACTER NAME</th>
                    <th style={{ padding: "8px" }}>SCENE APPEARANCES</th>
                    <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>APPEARANCE RATIO</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChars.slice(0, 15).map((char, idx) => {
                    const count = characterSceneCounts[char] || 0;
                    const total = (initialSummary.scene_count ?? totalScenes) || 1;
                    const ratio = `${Math.round((count / total) * 100)}%`;
                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{char}</td>
                        <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                        <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {sortedChars.length > 15 && (
                <div style={{ textAlign: "right", fontSize: "10px", color: "#94A3B8", fontWeight: "bold", marginTop: "10px", fontFamily: "sans-serif" }}>
                  Continued on Page 2...
                </div>
              )}

              <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
                <span>Generated by ActionCut AI</span>
                <span className="pdf-page-number-target">Page 1</span>
              </div>
            </div>

            {/* PAGE 2: Characters continued (15 to 39) */}
            {sortedChars.length > 15 && (
              <div 
                id="pdf-page-2"
                style={{
                  width: "800px",
                  height: "1130px",
                  backgroundColor: "#ffffff",
                  color: "#1E293B",
                  padding: "40px",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  position: "relative",
                  boxSizing: "border-box"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #F5C518", paddingBottom: "8px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>ACTIONCUT AI | SCREENPLAY BREAKDOWN</span>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>CHARACTERS LOG</span>
                </div>

                <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>1. Detected Characters (Continued)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                      <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>CHARACTER NAME</th>
                      <th style={{ padding: "8px" }}>SCENE APPEARANCES</th>
                      <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>APPEARANCE RATIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedChars.slice(15, 40).map((char, idx) => {
                      const count = characterSceneCounts[char] || 0;
                      const total = (initialSummary.scene_count ?? totalScenes) || 1;
                      const ratio = `${Math.round((count / total) * 100)}%`;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{char}</td>
                          <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                          <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {sortedChars.length > 40 && (
                  <div style={{ textAlign: "right", fontSize: "10px", color: "#94A3B8", fontWeight: "bold", marginTop: "10px", fontFamily: "sans-serif" }}>
                    Continued on Page 3...
                  </div>
                )}

                <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
                  <span>Generated by ActionCut AI</span>
                  <span className="pdf-page-number-target">Page 2</span>
                </div>
              </div>
            )}

            {/* PAGE 3: Characters (40+) + Locations (0 to 14) */}
            <div 
              id="pdf-page-3"
              style={{
                width: "800px",
                height: "1130px",
                backgroundColor: "#ffffff",
                color: "#1E293B",
                padding: "40px",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                position: "relative",
                boxSizing: "border-box"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #F5C518", paddingBottom: "8px", marginBottom: "20px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>ACTIONCUT AI | SCREENPLAY BREAKDOWN</span>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>LOCATIONS & LOGS</span>
              </div>

              {/* Characters remaining (index 40+) */}
              {sortedChars.length > 40 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>1. Detected Characters (Concluded)</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <tbody>
                      {sortedChars.slice(40).map((char, idx) => {
                        const count = characterSceneCounts[char] || 0;
                        const total = (initialSummary.scene_count ?? totalScenes) || 1;
                        const ratio = `${Math.round((count / total) * 100)}%`;
                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B", width: "40%" }}>{char}</td>
                            <td style={{ padding: "6px 8px", color: "#475569", width: "35%" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                            <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold", width: "25%" }}>{ratio}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Locations (index 0 to 14) */}
              {sortedLocs.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>2. Detected Locations</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                        <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>LOCATION SETTING</th>
                        <th style={{ padding: "8px" }}>SCENE COUNT</th>
                        <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>SETTING PERCENTAGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLocs.slice(0, 15).map((loc, idx) => {
                        const count = locationSceneCounts[loc] || 0;
                        const total = (initialSummary.scene_count ?? totalScenes) || 1;
                        const ratio = `${Math.round((count / total) * 100)}%`;
                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{loc}</td>
                            <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                            <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {sortedLocs.length > 15 && (
                <div style={{ textAlign: "right", fontSize: "10px", color: "#94A3B8", fontWeight: "bold", marginTop: "10px", fontFamily: "sans-serif" }}>
                  Continued on Page 4...
                </div>
              )}

              <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
                <span>Generated by ActionCut AI</span>
                <span className="pdf-page-number-target">Page 3</span>
              </div>
            </div>

            {/* PAGE 4: Locations continued (15 to 39) */}
            {sortedLocs.length > 15 && (
              <div 
                id="pdf-page-4"
                style={{
                  width: "800px",
                  height: "1130px",
                  backgroundColor: "#ffffff",
                  color: "#1E293B",
                  padding: "40px",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  position: "relative",
                  boxSizing: "border-box"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #F5C518", paddingBottom: "8px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>ACTIONCUT AI | SCREENPLAY BREAKDOWN</span>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>LOCATIONS LOG</span>
                </div>

                <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>2. Detected Locations (Continued)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                      <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>LOCATION SETTING</th>
                      <th style={{ padding: "8px" }}>SCENE COUNT</th>
                      <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>SETTING PERCENTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLocs.slice(15, 40).map((loc, idx) => {
                      const count = locationSceneCounts[loc] || 0;
                      const total = (initialSummary.scene_count ?? totalScenes) || 1;
                      const ratio = `${Math.round((count / total) * 100)}%`;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{loc}</td>
                          <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                          <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {sortedLocs.length > 40 && (
                  <div style={{ textAlign: "right", fontSize: "10px", color: "#94A3B8", fontWeight: "bold", marginTop: "10px", fontFamily: "sans-serif" }}>
                    Continued on Page 5...
                  </div>
                )}

                <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
                  <span>Generated by ActionCut AI</span>
                  <span className="pdf-page-number-target">Page 4</span>
                </div>
              </div>
            )}

            {/* PAGE 5: Locations continued (40+) */}
            {sortedLocs.length > 40 && (
              <div 
                id="pdf-page-5"
                style={{
                  width: "800px",
                  height: "1130px",
                  backgroundColor: "#ffffff",
                  color: "#1E293B",
                  padding: "40px",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  position: "relative",
                  boxSizing: "border-box"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #F5C518", paddingBottom: "8px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>ACTIONCUT AI | SCREENPLAY BREAKDOWN</span>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748B" }}>LOCATIONS LOG</span>
                </div>

                <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#0F1015", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", margin: "0 0 8px 0" }}>2. Detected Locations (Concluded)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0F1015", color: "#ffffff", textAlign: "left", fontWeight: "bold" }}>
                      <th style={{ padding: "8px", paddingLeft: "12px", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}>LOCATION SETTING</th>
                      <th style={{ padding: "8px" }}>SCENE COUNT</th>
                      <th style={{ padding: "8px", paddingRight: "12px", borderTopRightRadius: "4px", borderBottomRightRadius: "4px", textAlign: "right" }}>SETTING PERCENTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLocs.slice(40).map((loc, idx) => {
                      const count = locationSceneCounts[loc] || 0;
                      const total = (initialSummary.scene_count ?? totalScenes) || 1;
                      const ratio = `${Math.round((count / total) * 100)}%`;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#F8FAFC" : "#ffffff", borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", paddingLeft: "12px", fontWeight: "bold", color: "#1E293B" }}>{loc}</td>
                          <td style={{ padding: "6px 8px", color: "#475569" }}>{count} scene{count !== 1 ? 's' : ''}</td>
                          <td style={{ padding: "6px 8px", paddingRight: "12px", textAlign: "right", color: "#475569", fontFamily: "monospace", fontWeight: "bold" }}>{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ position: "absolute", bottom: "40px", left: "40px", right: "40px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8", fontFamily: "monospace" }}>
                  <span>Generated by ActionCut AI</span>
                  <span className="pdf-page-number-target">Page 5</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
