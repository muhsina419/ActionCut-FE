"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, FileUp, RotateCcw, Trash2, ArrowLeft, FileText, MoreVertical, Edit2, Copy, Archive, FolderX, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import type { ProcessingStatus, ProcessingSummary } from "@/lib/screenplay-types";

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

export default function ProjectClient({ backendAccessToken, initialProject, user }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [project, setProject] = useState(initialProject);
  const [busyScreenplayId, setBusyScreenplayId] = useState<string>("");
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

      toast.success("Script processed successfully", { id: screenplayId });
      router.push(`/screenplays/${screenplayId}/summary`);
    } catch (e) {
      updateScreenplay(screenplayId, {
        processing_status: "failed",
        processing_progress: 0,
        processing_message: "Failed",
      });
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
      toast.success("Script re-processed", { id: screenplayId });
    } catch (e) {
      updateScreenplay(screenplayId, {
        processing_status: "failed",
        processing_progress: 0,
        processing_message: "Failed",
      });
      toast.error(e instanceof Error ? e.message : "Unexpected error", { id: screenplayId });
    } finally {
      stopPolling();
      setBusyScreenplayId("");
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
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="px-6 py-8">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-6">
          
          <Link href="/dashboard" className="inline-flex items-center text-sm text-[#A0A0A0] hover:text-[#FFC107] transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>

          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold text-white">{project.title}</h1>
                  {project.is_archived && (
                    <span className="w-fit rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">ARCHIVED</span>
                  )}
                  
                  <div className="relative ml-2" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {menuOpen && (
                      <div className="absolute left-0 mt-2 w-48 origin-top-left rounded-md border border-white/10 bg-[#1A1A1A] py-1 shadow-lg z-50">
                        <button
                          onClick={() => { setMenuOpen(false); setNewTitle(project.title); setShowRenameModal(true); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" /> Rename
                        </button>
                        <button
                          onClick={duplicateProject}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmAction({ type: "archive-project" }); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                        >
                          <Archive className="h-4 w-4" /> {project.is_archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmAction({ type: "delete-project" }); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[#A0A0A0]">
                    Language: {project.language}
                  </span>
                  <span className="inline-flex items-center text-sm text-[#A0A0A0]">
                    <FileText className="mr-1.5 h-4 w-4" />
                    {project.screenplay_count} Scripts Total
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#A0A0A0]/70">Created on {new Date(project.created_at).toLocaleString()}</p>
              </div>

              {!project.is_archived && (
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FFC107] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
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

          <section>
            <h2 className="mb-4 text-xl font-medium text-white">Uploaded Scripts</h2>
            {project.screenplays.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-[#A0A0A0] opacity-30" />
                <p className="mt-4 text-[#A0A0A0]">No scripts uploaded yet.</p>
                <p className="mt-1 text-sm text-[#A0A0A0]/70">Upload a script to begin the AI breakdown.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {project.screenplays.map((screenplay) => (
                  <div key={screenplay.id} className="rounded-xl border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-white/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white">{screenplay.title}</h3>
                        <p className="mt-1 flex items-center text-xs text-[#A0A0A0]">
                          {screenplay.language} • {new Date(screenplay.created_at).toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm text-[#A0A0A0]">
                          <span className="font-medium text-white/80">Status:</span> {screenplay.processing_status} <span className="mx-2">|</span> 
                          <span className="font-medium text-white/80">Scenes:</span> {screenplay.total_scenes}
                        </p>
                        
                        <ProcessingProgress screenplay={screenplay} />
                      </div>
                      
                      <div className="flex items-center gap-2 self-start flex-wrap">
                        {screenplay.processing_status === "uploaded" && (
                           <Button
                             type="button"
                             size="sm"
                             disabled={busyScreenplayId === screenplay.id}
                             onClick={() => proceedScript(screenplay.id)}
                             className="bg-[#FFC107] text-black hover:brightness-110"
                           >
                             <Play className="mr-2 h-4 w-4" /> Proceed
                           </Button>
                        )}
                        
                        {screenplay.processing_status !== "uploaded" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/screenplays/${screenplay.id}/summary`)}
                            className="border-white/20 hover:bg-white/10"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Breakdown
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2">
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
                            className="h-9 w-9"
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
                              className="h-9 w-9 border-white/20 hover:bg-white/10"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            
                            {openScriptMenuId === screenplay.id && (
                              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-white/10 bg-[#1A1A1A] py-1 shadow-lg z-50">
                                <button
                                  onClick={() => router.push(`/screenplays/${screenplay.id}/scenes`)}
                                  className="flex w-full items-center px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                                >
                                  Script Development
                                </button>
                                <button
                                  onClick={() => toast.info("Pre-production Planning is coming soon!")}
                                  className="flex w-full items-center px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                                >
                                  Pre-production Planning
                                </button>
                                <button
                                  onClick={() => toast.info("Budget Estimation is coming soon!")}
                                  className="flex w-full items-center px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                                >
                                  Budget Estimation
                                </button>
                                <button
                                  onClick={() => toast.info("Creative Analysis is coming soon!")}
                                  className="flex w-full items-center px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white"
                                >
                                  Creative Analysis
                                </button>
                                <div className="my-1 h-px bg-white/10" />
                                <button
                                  disabled={busyScreenplayId === screenplay.id}
                                  onClick={() => {
                                    setOpenScriptMenuId(null);
                                    setConfirmAction({
                                      type: "reprocess-script",
                                      screenplayId: screenplay.id,
                                      title: screenplay.title,
                                    });
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-white/5 hover:text-white disabled:opacity-50"
                                >
                                  <RotateCcw className="h-4 w-4" /> Re-Process Script
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </section>
        </div>

        <ConfirmationModal
          action={confirmAction}
          busy={Boolean(busyScreenplayId)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
        
        {/* Rename Modal */}
        {showRenameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-white shadow-2xl">
              <h2 className="text-lg font-semibold text-white">Rename Project</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-[#A0A0A0]">New Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
                    placeholder="New title..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" disabled={isRenaming} onClick={() => setShowRenameModal(false)} className="border-white/20 hover:bg-white/10">
                  Cancel
                </Button>
                <Button disabled={isRenaming || !newTitle.trim()} onClick={renameProject} className="bg-[#FFC107] text-black hover:brightness-110">
                  {isRenaming ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function ProcessingProgress({ screenplay }: { screenplay: ScreenplaySummary }) {
  const activeStatuses: ProcessingStatus[] = [
    "processing", "extracting_text", "validating_text", 
    "sample_ocr", "full_ocr", "gemini_ocr", "scene_detection",
  ];

  if (!activeStatuses.includes(screenplay.processing_status as ProcessingStatus)) return null;

  const progress = Math.max(0, Math.min(100, screenplay.processing_progress));
  return (
    <div className="mt-4 w-full max-w-lg rounded-md border border-[#FFC107]/20 bg-black/40 p-3">
      <div className="flex justify-between items-center text-xs text-[#A0A0A0]">
        <span>{screenplay.processing_message ?? screenplay.processing_status}</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#FFC107] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) return "Unauthorized access";
  if (response.status === 404) return "Not found";
  if (response.status === 409) return "Processing already running";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-white shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#A0A0A0]">{copy.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="border-white/20 hover:bg-white/10">
            Cancel
          </Button>
          <Button
            type="button"
            variant={copy.variant as any}
            disabled={busy}
            onClick={onConfirm}
            className={copy.variant === "default" ? "bg-[#FFC107] text-black hover:brightness-110" : ""}
          >
            {busy ? "Working..." : copy.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
