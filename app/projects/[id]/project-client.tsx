"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Eye, 
  FileUp, 
  RotateCcw, 
  Trash2, 
  ArrowLeft, 
  FileText, 
  MoreVertical, 
  Edit2, 
  Copy, 
  Archive, 
  FolderX, 
  Play 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { ProcessingStatus, ProcessingSummary } from "@/lib/screenplay-types";

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
  processing_status: ProcessingStatus | "uploaded";
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

type ConfirmAction =
  | { type: "delete-script"; screenplayId: string; title: string }
  | { type: "reprocess-script"; screenplayId: string; title: string }
  | { type: "delete-project" }
  | { type: "archive-project" };

type Props = {
  backendAccessToken: string;
  initialProject: ProjectSummary;
  user: { name: string; email: string };
};

function formatProjectDate(date: Date | string, includeTime = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
    ...(includeTime && { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  }).format(new Date(date));
}

export default function ProjectClient({ backendAccessToken, initialProject, user }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [project, setProject] = useState(initialProject);
  const [busyScreenplayId, setBusyScreenplayId] = useState<string>("");
  const [cancellingScreenplayId, setCancellingScreenplayId] = useState<string>("");
  const [busyLabel, setBusyLabel] = useState<string>("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Project Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Script Menu State
  const [openScriptMenuId, setOpenScriptMenuId] = useState<string | null>(null);
  
  // Rename State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      // Close script menu if clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.script-menu-container')) {
        setOpenScriptMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateScreenplay = (screenplayId: string, updates: Partial<ScreenplaySummary>) => {
    setProject((prev) => ({
      ...prev,
      screenplays: prev.screenplays.map((sp) => (sp.id === screenplayId ? { ...sp, ...updates } : sp)),
    }));
  };

  const renameProject = async () => {
    if (!newTitle.trim()) return;
    setIsRenaming(true);
    toast.loading("Renaming project...", { id: "rename" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Rename failed"));
      
      const updated = await res.json();
      setProject(prev => ({ ...prev, title: updated.title }));
      setShowRenameModal(false);
      toast.success("Project renamed", { id: "rename" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename error", { id: "rename" });
    } finally {
      setIsRenaming(false);
    }
  };

  const duplicateProject = async () => {
    setMenuOpen(false);
    toast.loading("Duplicating project...", { id: "duplicate" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Duplicate failed"));
      toast.success("Project duplicated", { id: "duplicate" });
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate error", { id: "duplicate" });
    }
  };

  const uploadScriptToProject = async (file: File | null) => {
    if (!file) return;
    setBusyLabel("Uploading...");
    setError("");
    let activeToastId = "";

    try {
      const formData = new FormData();
      formData.append("project_id", project.id);
      formData.append("language", project.language);
      formData.append("file", file);

      activeToastId = "uploading";
      toast.loading("Uploading script...", { id: activeToastId });

      const res = await fetch(`${apiBaseUrl}/api/screenplays/upload`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Upload failed"));
      }

      const created = (await res.json()) as {
        id: string;
        title: string;
        language: string;
        file_path: string;
      };

      const newScreenplay: ScreenplaySummary = {
        id: created.id,
        title: created.title,
        language: created.language,
        language_code: null,
        structure_type: null,
        total_scenes: 0,
        processing_status: "uploaded",
        processing_progress: 0,
        processing_message: null,
        created_at: new Date().toISOString(),
        file_path: created.file_path,
      };

      setProject((prev) => ({
        ...prev,
        screenplay_count: prev.screenplay_count + 1,
        screenplays: [newScreenplay, ...prev.screenplays],
      }));

      toast.success("Script uploaded successfully. Click Proceed to analyze.", { id: activeToastId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected upload error";
      setError(message);
      toast.error(message, activeToastId ? { id: activeToastId } : undefined);
    } finally {
      setBusyLabel("");
    }
  };

  const proceedScript = async (screenplayId: string) => {
    setBusyScreenplayId(screenplayId);
    toast.loading("Processing script...", { id: screenplayId });
    updateScreenplay(screenplayId, {
      processing_status: "extracting_text",
      processing_progress: 1,
      processing_message: "Starting processing",
    });

    let stopPolling = () => {};
    try {
      stopPolling = startProcessingPoll(screenplayId);
      const res = await fetch(`${apiBaseUrl}/api/screenplays/${screenplayId}/process`, {
        method: "POST",
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Processing failed"));
      }

      const summary = (await res.json()) as ProcessingSummary;
      if (summary.processing_status === "cancelled") {
        toast.info("Script processing cancelled", { id: screenplayId });
      } else {
        toast.success("Script processed successfully", { id: screenplayId });
        router.push(`/screenplays/${screenplayId}/summary`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unexpected error", { id: screenplayId });
    } finally {
      stopPolling();
      setBusyScreenplayId("");
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "delete-script") {
      await deleteScript(confirmAction.screenplayId, confirmAction.title);
    } else if (confirmAction.type === "reprocess-script") {
      await reprocessScript(confirmAction.screenplayId, confirmAction.title);
    } else if (confirmAction.type === "archive-project") {
      await toggleArchiveProject();
    } else if (confirmAction.type === "delete-project") {
      await deleteProject();
    }

    setConfirmAction(null);
  };

  const deleteScript = async (screenplayId: string, title: string) => {
    setBusyScreenplayId(screenplayId);
    setError("");
    toast.loading(`Deleting ${title}...`, { id: screenplayId });

    try {
      const res = await fetch(`${apiBaseUrl}/api/scripts/${screenplayId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error(await responseErrorMessage(res, "Delete failed"));

      setProject((prev) => ({
        ...prev,
        screenplay_count: Math.max(0, prev.screenplay_count - 1),
        screenplays: prev.screenplays.filter((sp) => sp.id !== screenplayId),
      }));

      toast.success("Script deleted", { id: screenplayId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unexpected error", { id: screenplayId });
    } finally {
      setBusyScreenplayId("");
    }
  };

  const toggleArchiveProject = async () => {
    toast.loading(project.is_archived ? "Unarchiving..." : "Archiving...", { id: "archive" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ is_archived: !project.is_archived }),
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Archive failed"));
      
      setProject(prev => ({ ...prev, is_archived: !prev.is_archived }));
      toast.success(project.is_archived ? "Project unarchived" : "Project archived", { id: "archive" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error", { id: "archive" });
    }
  };

  const deleteProject = async () => {
    toast.loading("Deleting project...", { id: "delete-proj" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${project.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(await responseErrorMessage(res, "Delete failed"));
      toast.success("Project deleted", { id: "delete-proj" });
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete error", { id: "delete-proj" });
    }
  };

  const reprocessScript = async (screenplayId: string, title: string) => {
    setBusyScreenplayId(screenplayId);
    setError("");
    toast.loading(`Re-processing ${title}...`, { id: screenplayId });
    updateScreenplay(screenplayId, {
      processing_status: "extracting_text",
      processing_progress: 1,
      processing_message: "Starting processing",
    });

    let stopPolling = () => {};
    try {
      stopPolling = startProcessingPoll(screenplayId);
      const res = await fetch(`${apiBaseUrl}/api/scripts/${screenplayId}/reprocess`, {
        method: "POST",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error(await responseErrorMessage(res, "Re-process failed"));

      const summary = (await res.json()) as ProcessingSummary;
      updateScreenplay(screenplayId, {
        language: summary.language,
        language_code: summary.language_code,
        structure_type: summary.structure_type,
        total_scenes: summary.total_scenes,
        processing_status: summary.processing_status,
        processing_progress: summary.processing_progress,
        processing_message: summary.processing_message,
      });
      if (summary.processing_status === "cancelled") {
        toast.info("Script re-processing cancelled", { id: screenplayId });
      } else {
        toast.success("Script re-processed", { id: screenplayId });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unexpected error", { id: screenplayId });
    } finally {
      stopPolling();
      setBusyScreenplayId("");
    }
  };

  const cancelProcessing = async (screenplayId: string) => {
    setCancellingScreenplayId(screenplayId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/screenplays/${screenplayId}/cancel`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Cancellation request failed"));
      }

      const summary = (await res.json()) as ProcessingSummary;
      updateScreenplay(screenplayId, {
        processing_status: summary.processing_status,
        processing_progress: summary.processing_progress,
        processing_message: summary.processing_message,
      });
      toast.info("Cancellation requested. Re-processing is available once the current step stops.", {
        id: screenplayId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancellation request failed", {
        id: screenplayId,
      });
    } finally {
      setCancellingScreenplayId("");
    }
  };

  const startProcessingPoll = (screenplayId: string) => {
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/screenplays/${screenplayId}/processing-summary`, {
          cache: "no-store",
          headers: authHeaders,
        });
        if (!res.ok) return;

        const summary = (await res.json()) as ProcessingSummary;
        updateScreenplay(screenplayId, {
          language: summary.language,
          language_code: summary.language_code,
          structure_type: summary.structure_type,
          total_scenes: summary.total_scenes,
          processing_status: summary.processing_status,
          processing_progress: summary.processing_progress,
          processing_message: summary.processing_message,
        });
      } catch {}
    }, 1500);

    return () => window.clearInterval(interval);
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col relative overflow-hidden">
      {/* Background Projector Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute top-[300px] right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none z-0" />

      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="px-6 py-8 flex-grow relative z-10">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-6">
          
          <Link href="/dashboard" className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#8F9CAE] hover:text-[#F5C518] transition-colors cursor-pointer">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>

          {/* Frosted glass header slate */}
          <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,24,0.04),transparent_40%)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">{project.title}</h1>
                  {project.is_archived && (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[8px] font-extrabold text-amber-500 border border-amber-500/20 uppercase tracking-wide">ARCHIVED</span>
                  )}
                  
                  <div className="relative ml-2" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    {menuOpen && (
                      <div className="absolute left-0 mt-2 w-48 origin-top-left rounded-md border border-white/10 bg-[#0F1015] py-1 shadow-2xl z-50">
                        <button
                          onClick={() => { setMenuOpen(false); setNewTitle(project.title); setShowRenameModal(true); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button
                          onClick={duplicateProject}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmAction({ type: "archive-project" }); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                        >
                          <Archive className="h-3.5 w-3.5" /> {project.is_archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmAction({ type: "delete-project" }); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-white/5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-[#8F9CAE]">
                    Language: {project.language}
                  </span>
                  <span className="inline-flex items-center text-xs font-bold text-[#8F9CAE]">
                    <FileText className="mr-1.5 h-4 w-4 text-[#F5C518]" />
                    {project.screenplay_count} Script{project.screenplay_count !== 1 ? 's' : ''} Total
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-mono text-[#8F9CAE]/75">Initialized on {formatProjectDate(project.created_at, true)}</p>
              </div>

              {!project.is_archived && (
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#F5C518] hover:bg-[#E2B30F] px-5 py-2.5 text-xs font-bold text-black transition-all active:scale-95 shadow-md shadow-[#F5C518]/10 cursor-pointer">
                    <FileUp className="h-4 w-4" />
                    Upload New Script
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      className="hidden"
                      onChange={(e) => uploadScriptToProject(e.target.files?.[0] ?? null)}
                      disabled={!!busyLabel}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* Scripts list as timeline rows */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#F5C518]" /> Uploaded Screenplay Tracks
            </h2>
            {project.screenplays.length === 0 ? (
              <div className="rounded-2xl border border-white/5 border-dashed bg-[#0F1015]/45 p-12 text-center text-[#8F9CAE]">
                <FolderX className="mx-auto h-12 w-12 opacity-35 mb-4" />
                <p className="text-xs">No scripts uploaded yet.</p>
                <p className="mt-1 text-[10px] opacity-75">Upload a screenplay track to trigger the AI breakdown.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.screenplays.map((screenplay) => (
                  <article 
                    key={screenplay.id} 
                    className="group relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl border border-white/5 bg-[#0F1015]/45 hover:bg-[#0F1015]/80 p-5 transition-all duration-300 gap-4"
                  >
                    {/* Playhead Hover Indicator */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-[#F5C518] group-hover:h-1/2 transition-all duration-300 rounded-r-md" />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-extrabold text-white">{screenplay.title}</h3>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-[#8F9CAE]">
                          {screenplay.language}
                        </span>
                        <span className="text-[10px] font-mono text-[#8F9CAE]/75">
                          Uploaded: {formatProjectDate(screenplay.created_at)}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <span className="text-[#8F9CAE] flex items-center gap-1.5">
                          <span className="font-bold text-white/80">Status:</span> 
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            screenplay.processing_status === "completed" || screenplay.processing_status === "corrected"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : screenplay.processing_status === "failed"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : screenplay.processing_status === "uploaded"
                              ? "bg-white/5 text-[#8F9CAE] border-white/10"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                          }`}>
                            {screenplay.processing_status}
                          </span>
                        </span>
                        <span className="text-[#8F9CAE]"><span className="font-bold text-white/80">Scenes detected:</span> {screenplay.total_scenes}</span>
                      </div>
                      
                      <ProcessingProgress screenplay={screenplay} />
                    </div>
                    
                    <div className="flex items-center gap-3.5 self-end md:self-center shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                      <div className="flex items-center gap-2">
                        {isProcessingStatus(screenplay.processing_status) && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              screenplay.processing_status === "cancel_requested" ||
                              cancellingScreenplayId === screenplay.id
                            }
                            onClick={() => cancelProcessing(screenplay.id)}
                            className="h-9 border-red-500/30 bg-red-500/10 px-3 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                          >
                            {screenplay.processing_status === "cancel_requested"
                              ? "Cancelling..."
                              : cancellingScreenplayId === screenplay.id
                                ? "Requesting..."
                                : "Cancel"}
                          </Button>
                        )}

                        {screenplay.processing_status === "uploaded" && (
                           <Button
                             type="button"
                             disabled={busyScreenplayId === screenplay.id}
                             onClick={() => proceedScript(screenplay.id)}
                             className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-9 px-4 active:scale-95 transition-all cursor-pointer"
                           >
                             <Play className="mr-1.5 h-4 w-4 fill-black text-black" /> Proceed
                           </Button>
                        )}
                        
                        {screenplay.processing_status !== "uploaded" && (
                           <Button
                             type="button"
                             variant="outline"
                             onClick={() => router.push(`/screenplays/${screenplay.id}/summary`)}
                             className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-9 px-4 active:scale-95 transition-all cursor-pointer"
                           >
                             <Eye className="mr-1.5 h-4 w-4" /> View Breakdown
                           </Button>
                        )}
                        
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          disabled={busyScreenplayId === screenplay.id}
                          onClick={() => setConfirmAction({
                            type: "delete-script",
                            screenplayId: screenplay.id,
                            title: screenplay.title,
                          })}
                          className="h-9 w-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-400 border border-red-500/25 active:scale-95 transition-all cursor-pointer"
                          title="Delete Script"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="relative script-menu-container">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenScriptMenuId(openScriptMenuId === screenplay.id ? null : screenplay.id);
                            }}
                            className="h-9 w-9 border-white/10 bg-white/5 text-[#8F9CAE] hover:bg-white/10 hover:text-white active:scale-95 transition-all cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {openScriptMenuId === screenplay.id && (
                            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-white/10 bg-[#0F1015] py-1.5 shadow-2xl z-50">
                              <button
                                onClick={() => router.push(`/screenplays/${screenplay.id}/scenes`)}
                                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                              >
                                Script Development
                              </button>
                              <button
                                onClick={() => toast.info("Pre-production Planning is coming soon!")}
                                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                              >
                                Pre-production Planning
                              </button>
                              <button
                                onClick={() => toast.info("Budget Estimation is coming soon!")}
                                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                              >
                                Budget Estimation
                              </button>
                              <button
                                onClick={() => toast.info("Creative Analysis is coming soon!")}
                                className="flex w-full items-center px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white cursor-pointer"
                              >
                                Creative Analysis
                              </button>
                              <div className="my-1.5 h-px bg-white/5" />
                              <button
                                disabled={
                                  busyScreenplayId === screenplay.id ||
                                  isProcessingStatus(screenplay.processing_status)
                                }
                                onClick={() => {
                                  setOpenScriptMenuId(null);
                                  setConfirmAction({
                                    type: "reprocess-script",
                                    screenplayId: screenplay.id,
                                    title: screenplay.title,
                                  });
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#8F9CAE] hover:bg-white/5 hover:text-white disabled:opacity-50 cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Re-Process Script
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
          </section>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          action={confirmAction}
          busy={Boolean(busyScreenplayId)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
        
        {/* Rename Modal */}
        {showRenameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1015]/90 p-6 text-white shadow-2xl backdrop-blur-xl relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_40%)] pointer-events-none" />
              
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-[#F5C518]" /> Rename Project Track
              </h2>
              
              <div className="mt-5 space-y-4 relative z-10">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#8F9CAE] uppercase tracking-wide">New Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/35 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F5C518]"
                    placeholder="New title..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="mt-7 flex justify-end gap-3 relative z-10">
                <Button variant="outline" disabled={isRenaming} onClick={() => setShowRenameModal(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 px-4 py-0 cursor-pointer">
                  Cancel
                </Button>
                <Button 
                  disabled={isRenaming || !newTitle.trim()} 
                  onClick={renameProject} 
                  className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-9 px-4 transition-all active:scale-95 cursor-pointer"
                >
                  {isRenaming ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}

function ProcessingProgress({ screenplay }: { screenplay: ScreenplaySummary }) {
  if (!isProcessingStatus(screenplay.processing_status)) return null;

  const progress = Math.max(0, Math.min(100, screenplay.processing_progress));
  return (
    <div className="mt-4 w-full max-w-lg rounded-xl border border-[#F5C518]/25 bg-black/40 p-4">
      <div className="flex justify-between items-center text-xs text-[#8F9CAE]">
        <span>{screenplay.processing_message ?? screenplay.processing_status}</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-amber-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function isProcessingStatus(status: ProcessingStatus | "uploaded"): boolean {
  return [
    "processing",
    "extracting_text",
    "validating_text",
    "sample_ocr",
    "full_ocr",
    "gemini_ocr",
    "scene_detection",
    "character_detection",
    "location_detection",
    "cancel_requested",
  ].includes(status);
}

async function responseErrorMessage(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) return "Unauthorized access";
  if (response.status === 404) return "Not found";
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}

function ConfirmationModal({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const copy = {
    "delete-script": {
      title: "Delete Script",
      body: action.type === "delete-script" ? `Delete "${action.title}" and all processed scene data? This cannot be undone.` : "",
      confirm: "Delete",
      variant: "destructive"
    },
    "reprocess-script": {
      title: "Re-Process Script",
      body: action.type === "reprocess-script" ? `Re-run processing for "${action.title}" using the existing uploaded file? Current extracted scenes will be replaced.` : "",
      confirm: "Re-Process",
      variant: "default"
    },
    "delete-project": {
      title: "Delete Project",
      body: "Are you sure you want to permanently delete this project and all of its scripts? This cannot be undone.",
      confirm: "Delete Project",
      variant: "destructive"
    },
    "archive-project": {
      title: "Archive Project",
      body: "Are you sure you want to toggle the archive status of this project?",
      confirm: "Confirm Archive",
      variant: "default"
    }
  }[action.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1015]/90 p-6 text-white shadow-2xl backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_40%)] pointer-events-none" />
        
        <h2 className="text-base font-extrabold text-white">{copy.title}</h2>
        <p className="mt-3 text-xs leading-5 text-[#8F9CAE]">{copy.body}</p>
        <div className="mt-6 flex justify-end gap-3 relative z-10">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 px-4 py-0 cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            variant={copy.variant as any}
            disabled={busy}
            onClick={onConfirm}
            className={
              copy.variant === "default" 
                ? "bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-9 px-4 cursor-pointer" 
                : "bg-red-600 hover:bg-red-700 text-white h-9 px-4 cursor-pointer"
            }
          >
            {busy ? "Working..." : copy.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
