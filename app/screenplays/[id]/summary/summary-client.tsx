"use client";

import { useState } from "react";
import { ArrowLeft, Download, FileText, Users, MapPin, Film } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProcessingSummary, SceneListResponse } from "@/lib/screenplay-types";

type Props = {
  backendAccessToken: string;
  scriptId: string;
  initialSummary: ProcessingSummary;
  initialScenesData: SceneListResponse;
};

export default function SummaryClient({ backendAccessToken, scriptId, initialSummary, initialScenesData }: Props) {
  const router = useRouter();
  
  const handleDownload = () => {
    // For a clean download layout, we use the browser's built-in print to PDF functionality.
    // In a real application, you might want to call an endpoint that generates a PDF or use a library like jsPDF.
    window.print();
    toast.success("Download started (using browser print)");
  };

  const labelForStructure = (value: string) =>
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const totalScenes = initialScenesData.scenes.length;

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
    <main className="min-h-screen bg-[#101114] text-white print:bg-white print:text-black">
      <Toaster richColors position="top-right" className="print:hidden" />
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-start gap-8 px-5 py-8">
        
        {/* Sticky Sidebar */}
        <aside className="w-full lg:sticky lg:top-8 lg:w-80 space-y-6 print:hidden">
          <div>
            <Button asChild variant="ghost" className="mb-4 text-[#C8D1D9] -ml-4">
              <Link href={initialSummary.project_id ? `/projects/${initialSummary.project_id}` : "/dashboard"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold">Breakdown</h1>
            <p className="mt-2 text-sm text-[#AAB4BF]">Summary and statistics</p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-[#1A1D21] p-5">
            <div>
              <p className="text-xs text-[#AAB4BF] uppercase tracking-wider font-semibold">Status</p>
              <p className="mt-1 text-lg font-medium capitalize text-[#86D8C8]">{initialSummary.processing_status}</p>
            </div>
            <div className="h-px bg-white/10 my-4" />
            <Button 
              onClick={handleDownload}
              className="w-full bg-[#FFC107] text-black hover:brightness-110 h-12 font-semibold text-base"
            >
              <Download className="mr-2 h-5 w-5" />
              Download PDF Summary
            </Button>
          </div>
        </aside>

        {/* Main Content (Breakdown View) */}
        <section className="flex-1 w-full space-y-6 print:w-full print:block">
          
          <div className="hidden print:block mb-8">
            <h1 className="text-4xl font-bold border-b pb-4 mb-4">Screenplay Breakdown Summary</h1>
            <p className="text-gray-600">Generated automatically by ActionCut AI</p>
          </div>

          {/* Summary Card */}
          <div className="rounded-xl border border-white/10 bg-[#1A1D21] p-6 shadow-md print:border-gray-300 print:bg-white print:text-black print:shadow-none">
            <h2 className="text-xl font-bold text-white mb-6 print:text-black flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#FFC107] print:text-black" />
              Overview Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Language</p>
                <p className="text-2xl font-bold text-white mt-1 print:text-black">{initialSummary.language}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Format</p>
                <p className="text-xl font-bold text-white mt-1 print:text-black">{labelForStructure(initialSummary.structure_type || "")}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Total Scenes</p>
                <p className="text-3xl font-bold text-[#FFC107] mt-1 print:text-black">{initialSummary.scene_count ?? totalScenes}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Characters</p>
                <p className="text-3xl font-bold text-blue-400 mt-1 print:text-black">{initialSummary.character_count ?? (initialSummary.characters?.length || 0)}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Locations</p>
                <p className="text-3xl font-bold text-green-400 mt-1 print:text-black">{initialSummary.location_count ?? (initialSummary.locations?.length || 0)}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Day Scenes</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1 print:text-black">{sceneStats.day}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Night Scenes</p>
                <p className="text-3xl font-bold text-blue-300 mt-1 print:text-black">{sceneStats.night}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Indoor Scenes</p>
                <p className="text-3xl font-bold text-orange-400 mt-1 print:text-black">{sceneStats.indoor}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 print:bg-gray-50 print:border-gray-200">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold print:text-gray-500">Outdoor Scenes</p>
                <p className="text-3xl font-bold text-teal-400 mt-1 print:text-black">{sceneStats.outdoor}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block print:space-y-6">
            {/* Characters List */}
            <div className="rounded-xl border border-white/10 bg-[#1A1D21] p-6 print:border-gray-300 print:bg-white print:text-black">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                <Users className="h-5 w-5 text-blue-400 print:text-black" />
                Detected Characters
              </h3>
              <div className="flex flex-wrap gap-2">
                {initialSummary.characters && initialSummary.characters.length > 0 ? (
                  initialSummary.characters.map((char, idx) => (
                    <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-md text-sm font-medium print:border-gray-300 print:text-black print:bg-gray-100">
                      {char}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[#AAB4BF] italic print:text-gray-500">No characters detected</p>
                )}
              </div>
            </div>

            {/* Locations List */}
            <div className="rounded-xl border border-white/10 bg-[#1A1D21] p-6 print:border-gray-300 print:bg-white print:text-black">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                <MapPin className="h-5 w-5 text-green-400 print:text-black" />
                Detected Locations
              </h3>
              <div className="flex flex-wrap gap-2">
                {initialSummary.locations && initialSummary.locations.length > 0 ? (
                  initialSummary.locations.map((loc, idx) => (
                    <span key={idx} className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-md text-sm font-medium print:border-gray-300 print:text-black print:bg-gray-100">
                      {loc}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[#AAB4BF] italic print:text-gray-500">No locations detected</p>
                )}
              </div>
            </div>
          </div>
          
        </section>
      </div>
    </main>
  );
}
