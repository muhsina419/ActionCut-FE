"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FolderX,
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  Filter,
  ArrowDownUp,
  Clock,
  Film,
  Users,
  MapPin,
  Wrench,
  Layers,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import type { ProcessingStatus } from "@/lib/screenplay-types";
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

type ScreenplaySummary = {
  id: string;
  title: string;
  language: string;
  language_code: string | null;
  structure_type: string | null;
  total_scenes: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_message: string | null;
  created_at: string;
  file_path: string | null;
};

type ProjectSummary = {
  id: string;
  title: string;
  language: string;
  is_archived: boolean;
  created_at: string;
  screenplay_count: number;
  screenplays: ScreenplaySummary[];
};

type DashboardResponse = {
  id: string;
  name: string;
  email: string;
  onboarding_required: boolean;
  total_projects: number;
  total_screenplays: number;
  projects: ProjectSummary[];
};

type Props = {
  backendAccessToken: string;
  initialData: DashboardResponse;
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(date));
}

const projectLanguages = ["Malayalam", "English", "Hindi", "Tamil", "Telugu"];

type SortOption = "newest" | "oldest" | "a-z" | "scripts";

export default function DashboardClient({
  backendAccessToken,
  initialData,
}: Props) {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "archived"
  >("active");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Create Project state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState("Malayalam");
  const [creatingProject, setCreatingProject] = useState(false);
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const user = {
    name: data.name,
    email: data.email,
  };

  const createProject = async () => {
    const title = newProjectTitle.trim();
    if (!title) {
      toast.error("Project name is required");
      return;
    }

    setCreatingProject(true);
    setError("");
    toast.loading("Creating project...", { id: "create-project" });

    try {
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title,
          language: newProjectLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error(
          await responseErrorMessage(res, "Project creation failed"),
        );
      }

      const created = (await res.json()) as {
        id: string;
        title: string;
        language: string;
      };
      const newProject: ProjectSummary = {
        id: created.id,
        title: created.title,
        language: created.language,
        is_archived: false,
        created_at: new Date().toISOString(),
        screenplay_count: 0,
        screenplays: [],
      };

      setData((prev) => ({
        ...prev,
        total_projects: prev.total_projects + 1,
        projects: [newProject, ...prev.projects],
      }));
      setNewProjectTitle("");
      setNewProjectLanguage("Malayalam");
      setShowCreateProject(false);
      toast.success("Project created", { id: "create-project" });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unexpected project creation error";
      setError(message);
      toast.error(message, { id: "create-project" });
    } finally {
      setCreatingProject(false);
    }
  };

  // Recent Activity Computation
  const recentActivity = useMemo(() => {
    type Activity = {
      id: string;
      type: "project" | "script";
      title: string;
      date: Date;
      targetUrl: string;
    };
    const activities: Activity[] = [];

    data.projects.forEach((p) => {
      activities.push({
        id: `p-${p.id}`,
        type: "project",
        title: `Created project "${p.title}"`,
        date: new Date(p.created_at),
        targetUrl: `/projects/${p.id}`,
      });
      p.screenplays.forEach((s) => {
        activities.push({
          id: `s-${s.id}`,
          type: "script",
          title: `Uploaded script "${s.title}" in ${p.title}`,
          date: new Date(s.created_at),
          targetUrl: `/projects/${p.id}`,
        });
      });
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 4);
  }, [data.projects]);

  // Filter & Sort Projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = data.projects;

    // Search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(lowerQ));
    }

    // Status Filter
    if (statusFilter === "active")
      result = result.filter((p) => !p.is_archived);
    if (statusFilter === "archived")
      result = result.filter((p) => p.is_archived);

    // Language Filter
    if (languageFilter !== "all") {
      result = result.filter((p) => p.language === languageFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "scripts") return b.screenplay_count - a.screenplay_count;
      return 0;
    });

    return result;
  }, [data.projects, searchQuery, statusFilter, languageFilter, sortBy]);

  // Calculations for HUD Control Deck
  const languagesCount = new Set(data.projects.map((p) => p.language)).size;
  const projectCapacityRatio = Math.min(
    100,
    Math.round((data.total_projects / 20) * 100),
  ); // Cap of 20 mock projects

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col relative overflow-x-hidden w-full">
      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      {/* Background Projector Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute top-[300px] right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none z-0" />

      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="relative z-10 px-4 sm:px-6 py-6 sm:py-10 flex-grow">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-8">
          {/* ----------------------------------------------------------------------
              HUD Control Deck
              ---------------------------------------------------------------------- */}
          <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,24,0.04),transparent_40%)]" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-xs font-bold tracking-widest text-[#8F9CAE] uppercase font-mono">
                  Workspace HUD Deck
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#8F9CAE] opacity-75 self-start sm:self-auto">
                STATUS: SYSTEM ACTIVE
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:gap-6 md:grid-cols-3">
              {/* Circular Project Dial */}
              <div className="flex items-center gap-5 bg-black/25 rounded-xl border border-white/5 p-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-full w-full -rotate-95" viewBox="0 0 36 36">
                    <path
                      className="text-white/5"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#F5C518] transition-all duration-500 ease-out"
                      strokeWidth="3.5"
                      strokeDasharray={`${projectCapacityRatio}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-extrabold text-white">
                      {data.total_projects}
                    </span>
                    <span className="text-[7px] text-[#8F9CAE] uppercase tracking-wider font-bold">
                      Limit 20
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Project Registry
                  </h4>
                  <p className="text-xs text-[#8F9CAE] mt-0.5">
                    Capacity tracking metrics.
                  </p>
                </div>
              </div>

              {/* Screenplay Tracker Bar */}
              <div className="flex flex-col justify-center bg-black/25 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <FileText className="h-4.5 w-4.5 text-[#3B82F6]" />{" "}
                    Screenplays parsed
                  </h4>
                  <span className="text-sm font-extrabold text-white">
                    {data.total_screenplays}
                  </span>
                </div>
                <div className="mt-3.5 w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-[#3B82F6] rounded-full"
                    style={{
                      width: `${Math.min(100, (data.total_screenplays / 15) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-[#8F9CAE] font-mono">
                  <span>Usage: {data.total_screenplays} / 15 parsed</span>
                  <span>
                    {Math.round(
                      Math.min(100, (data.total_screenplays / 15) * 100),
                    )}
                    %
                  </span>
                </div>
              </div>

              {/* Language Cluster */}
              <div className="flex items-center gap-4 bg-black/25 rounded-xl border border-white/5 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-baseline gap-1.5">
                    {languagesCount}{" "}
                    <span className="text-xs font-normal text-[#8F9CAE]">
                      Languages Active
                    </span>
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from(new Set(data.projects.map((p) => p.language)))
                      .slice(0, 3)
                      .map((l) => (
                        <span
                          key={l}
                          className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20"
                        >
                          {l}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------------
              Recent Activity & Search/Filter Section
              ---------------------------------------------------------------------- */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Project List Timeline Tracks - Reordered to top on mobile */}
            <div className="lg:col-span-2 space-y-4 order-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#F5C518]" /> Project Tracks
                </h2>
                <Button
                  type="button"
                  onClick={() => setShowCreateProject(true)}
                  className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black hover:brightness-110 h-9 font-bold px-4 py-0 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Project
                </Button>
              </div>

              {/* Filters Panel */}
              <div className="flex flex-col lg:flex-row gap-3 w-full">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                  <input
                    type="text"
                    placeholder="Search screenplay project tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/45 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#F5C518] placeholder-[#8F9CAE]/55"
                  />
                </div>

                {/* Balanced Grouped Filter and Sort Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full lg:w-36 group">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="appearance-none w-full rounded-lg border border-white/10 bg-black/45 pl-3 pr-8 py-2 text-xs text-white outline-none focus:border-[#F5C518] cursor-pointer transition-all hover:bg-black/60"
                    >
                      <option value="all" className="bg-[#101114] text-white">All Status</option>
                      <option value="active" className="bg-[#101114] text-white">Active</option>
                      <option value="archived" className="bg-[#101114] text-white">Archived</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8F9CAE] group-hover:text-white transition-colors" />
                  </div>
                  
                  <div className="relative w-full lg:w-40 group">
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="appearance-none w-full rounded-lg border border-white/10 bg-black/45 pl-3 pr-8 py-2 text-xs text-white outline-none focus:border-[#F5C518] cursor-pointer transition-all hover:bg-black/60"
                    >
                      <option value="all" className="bg-[#101114] text-white">All Languages</option>
                      {projectLanguages.map((l) => (
                        <option key={l} value={l} className="bg-[#101114] text-white">
                          {l}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8F9CAE] group-hover:text-white transition-colors" />
                  </div>

                  <div className="relative w-full lg:w-40 group">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none w-full rounded-lg border border-white/10 bg-black/45 pl-3 pr-8 py-2 text-xs text-white outline-none focus:border-[#F5C518] cursor-pointer transition-all hover:bg-black/60"
                    >
                      <option value="newest" className="bg-[#101114] text-white">Newest first</option>
                      <option value="oldest" className="bg-[#101114] text-white">Oldest first</option>
                      <option value="a-z" className="bg-[#101114] text-white">Name A-Z</option>
                      <option value="scripts" className="bg-[#101114] text-white">Scripts count</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8F9CAE] group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-3 pt-2">
                {filteredAndSortedProjects.length === 0 ? (
                  <div className="py-12 text-center rounded-2xl border border-white/5 border-dashed text-[#8F9CAE]">
                    <FolderX className="mx-auto h-12 w-12 opacity-35 mb-4" />
                    <p className="text-xs">
                      No projects match the selected timeline filters.
                    </p>
                  </div>
                ) : (
                  filteredAndSortedProjects.map((project) => (
                    <article
                      key={project.id}
                      className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/5 bg-[#0F1015]/45 hover:bg-[#0F1015]/80 p-5 transition-all duration-300 gap-4"
                    >
                      {/* Playhead Hover Indicator */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-[#F5C518] group-hover:h-1/2 transition-all duration-300 rounded-r-md" />

                      <Link
                        href={`/projects/${project.id}`}
                        className="absolute inset-0 z-10 rounded-xl"
                      >
                        <span className="sr-only">Open timeline track</span>
                      </Link>

                      {/* Title & Language */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-[300px]">
                            {project.title}
                          </h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-[#8F9CAE]">
                            {project.language}
                          </span>
                          {project.is_archived && (
                            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[8px] font-extrabold text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] font-mono text-[#8F9CAE]/75">
                          Initialized:{" "}
                          {formatDate(project.created_at)}
                        </p>
                      </div>

                      {/* Screenplays Progress Shutter Timeline */}
                      <div className="flex items-center gap-1.5 shrink-0 max-w-[150px] overflow-hidden select-none">
                        {project.screenplays.length === 0 ? (
                          <span className="text-[10px] text-[#8F9CAE]/50 italic">
                            No screenplays uploaded
                          </span>
                        ) : (
                          project.screenplays.slice(0, 4).map((script) => {
                            const isCompleted =
                              script.processing_status === "completed" ||
                              script.processing_status === "corrected";
                            const isFailed =
                              script.processing_status === "failed";
                            const isProcessing =
                              !isCompleted &&
                              !isFailed &&
                              script.processing_status !== "uploaded";

                            const bubbleBg = isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : isFailed
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : isProcessing
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                                  : "bg-white/5 text-[#8F9CAE] border-white/10";

                            return (
                              <div
                                key={script.id}
                                className={`flex h-6.5 w-6.5 items-center justify-center rounded-full border text-[9px] font-extrabold ${bubbleBg}`}
                                title={`${script.title} (${script.processing_status})`}
                              >
                                {script.title.charAt(0).toUpperCase()}
                              </div>
                            );
                          })
                        )}
                        {project.screenplays.length > 4 && (
                          <span className="text-[10px] font-bold text-[#8F9CAE]">
                            +{project.screenplays.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Scripts Counter & Open details */}
                      <div className="flex items-center gap-5 justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-[#8F9CAE]">
                          <FileText className="h-4 w-4" />
                          <span>
                            {project.screenplay_count} script
                            {project.screenplay_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="flex items-center text-xs font-bold text-[#F5C518] transition-transform group-hover:translate-x-1 cursor-pointer">
                          Open Track{" "}
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {error ? (
                <p className="mt-4 text-xs text-red-400">{error}</p>
              ) : null}
            </div>

            {/* Shutter Activity Timeline - Reordered below projects on mobile */}
            <div className="lg:col-span-1 order-2">
              <section className="h-full rounded-2xl border border-white/5 bg-[#0F1015]/65 p-4 sm:p-6 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Clock className="h-4.5 w-4.5 text-[#F5C518]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Timeline activity
                  </h2>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-[#8F9CAE] italic text-xs">
                    No activity registered yet.
                  </div>
                ) : (
                  <div className="relative mt-5 pl-4 border-l border-white/5 space-y-5">
                    {recentActivity.map((activity, idx) => (
                      <div key={activity.id} className="relative group">
                        {/* Timeline Node Point */}
                        <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#060709] border border-white/20 group-hover:border-[#F5C518] group-hover:bg-[#F5C518] transition-all" />
                        <div>
                          <p className="text-xs font-medium text-white/90 leading-tight pr-6">
                            {activity.title}
                          </p>
                          <span className="mt-1 block text-[10px] font-mono text-[#8F9CAE]/75">
                            {formatDate(activity.date)}
                          </span>
                        </div>
                        <Link
                          href={activity.targetUrl}
                          className="absolute right-0 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 p-1 text-[10px] text-[#F5C518] opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Create Project Frosted Modal */}
        <CreateProjectModal
          busy={creatingProject}
          language={newProjectLanguage}
          open={showCreateProject}
          title={newProjectTitle}
          onCancel={() => setShowCreateProject(false)}
          onCreate={createProject}
          onLanguageChange={setNewProjectLanguage}
          onTitleChange={setNewProjectTitle}
        />
      </main>
      <Footer />
    </div>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403)
    return "Unauthorized access";
  if (response.status === 404) return "Script or project not found";
  if (response.status === 409) return "Processing already running";
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}

function CreateProjectModal({
  busy,
  language,
  open,
  title,
  onCancel,
  onCreate,
  onLanguageChange,
  onTitleChange,
}: {
  busy: boolean;
  language: string;
  open: boolean;
  title: string;
  onCancel: () => void;
  onCreate: () => void;
  onLanguageChange: (value: string) => void;
  onTitleChange: (value: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1015]/90 p-6 text-white shadow-2xl backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_40%)] pointer-events-none" />

        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Plus className="h-4.5 w-4.5 text-[#F5C518]" /> Add Screenplay Track
        </h2>

        <div className="mt-5 space-y-4 relative z-10">
          <div>
            <label
              className="mb-2 block text-xs font-bold text-[#8F9CAE] uppercase tracking-wide"
              htmlFor="new-project-title"
            >
              Project Track Title
            </label>
            <input
              id="new-project-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/35 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F5C518]"
              placeholder="e.g. My Next Sci-Fi Screenplay"
              autoFocus
            />
          </div>
          <div>
            <label
              className="mb-2 block text-xs font-bold text-[#8F9CAE] uppercase tracking-wide"
              htmlFor="new-project-language"
            >
              Screenplay Language
            </label>
            <div className="relative group">
              <select
                id="new-project-language"
                value={language}
                onChange={(event) => onLanguageChange(event.target.value)}
                className="appearance-none w-full rounded-lg border border-white/10 bg-black/35 pl-3.5 pr-8 py-2.5 text-xs text-white outline-none focus:border-[#F5C518] cursor-pointer transition-all hover:bg-black/50"
              >
                {projectLanguages.map((item) => (
                  <option key={item} value={item} className="bg-[#101114] text-white">
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE] group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3 relative z-10">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 px-4 py-0 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={onCreate}
            className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black hover:brightness-110 h-9 font-bold px-4 py-0 transition-all active:scale-95 cursor-pointer"
          >
            {busy ? "Initializing..." : "Create Track"}
          </Button>
        </div>
      </div>
    </div>
  );
}
