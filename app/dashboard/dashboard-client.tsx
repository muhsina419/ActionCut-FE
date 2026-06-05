"use client";

import { useState } from "react";
import { Eye, FileUp, FolderX, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import type { ProcessingStatus, ProcessingSummary } from "@/lib/screenplay-types";

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
  initialData: DashboardResponse;
};

type ConfirmAction =
  | { type: "delete-script"; screenplayId: string; projectId: string; title: string }
  | { type: "reprocess-script"; screenplayId: string; projectId: string; title: string }
  | { type: "delete-project"; projectId: string; title: string };

const projectLanguages = ["Malayalam", "English", "Hindi", "Tamil", "Telugu"];

export default function DashboardClient({ initialData }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [data, setData] = useState(initialData);
  const [busyProjectId, setBusyProjectId] = useState<string>("");
  const [busyScreenplayId, setBusyScreenplayId] = useState<string>("");
  const [busyLabel, setBusyLabel] = useState<string>("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState("Malayalam");
  const [creatingProject, setCreatingProject] = useState(false);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_email: data.email,
          title,
          language: newProjectLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Project creation failed"));
      }

      const created = (await res.json()) as { id: string; title: string; language: string };
      const newProject: ProjectSummary = {
        id: created.id,
        title: created.title,
        language: created.language,
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
      const message = e instanceof Error ? e.message : "Unexpected project creation error";
      setError(message);
      toast.error(message, { id: "create-project" });
    } finally {
      setCreatingProject(false);
    }
  };

  const uploadScriptToProject = async (projectId: string, language: string, file: File | null) => {
    if (!file) return;
    setBusyProjectId(projectId);
    setBusyLabel("Uploading...");
    setError("");
    let activeToastId = "";
    let createdScreenplayId = "";
    let stopPolling = () => {};

    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("language", language);
      formData.append("file", file);

      const res = await fetch(`${apiBaseUrl}/api/screenplays/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Upload failed");
      }

      const created = (await res.json()) as {
        id: string;
        title: string;
        language: string;
        file_path: string;
      };
      createdScreenplayId = created.id;

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

      setData((prev) => {
        const updatedProjects = prev.projects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            screenplay_count: project.screenplay_count + 1,
            screenplays: [newScreenplay, ...project.screenplays],
          };
        });

        return {
          ...prev,
          total_screenplays: prev.total_screenplays + 1,
          projects: updatedProjects,
        };
      });

      setBusyScreenplayId(created.id);
      setBusyLabel("Processing...");
      updateScreenplay(projectId, created.id, {
        processing_status: "extracting_text",
        processing_progress: 1,
        processing_message: "Starting processing",
      });
      activeToastId = created.id;
      toast.loading("Processing script...", { id: created.id });
      stopPolling = startProcessingPoll(created.id, projectId);
      const processRes = await fetch(`${apiBaseUrl}/api/screenplays/${created.id}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const body = await processRes.json().catch(() => ({}));
        throw new Error(body.detail ?? "Processing failed");
      }

      toast.success("Script processed successfully", { id: created.id });
      router.push(`/screenplays/${created.id}/summary`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected upload error";
      if (createdScreenplayId) {
        updateScreenplay(projectId, createdScreenplayId, {
          processing_status: "failed",
          processing_progress: 0,
          processing_message: "Failed",
        });
      }
      setError(message);
      toast.error(message, activeToastId ? { id: activeToastId } : undefined);
    } finally {
      stopPolling();
      setBusyProjectId("");
      setBusyScreenplayId("");
      setBusyLabel("");
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "delete-script") {
      await deleteScript(confirmAction.screenplayId, confirmAction.projectId, confirmAction.title);
    }

    if (confirmAction.type === "reprocess-script") {
      await reprocessScript(confirmAction.screenplayId, confirmAction.projectId, confirmAction.title);
    }

    if (confirmAction.type === "delete-project") {
      await deleteProject(confirmAction.projectId, confirmAction.title);
    }

    setConfirmAction(null);
  };

  const deleteScript = async (screenplayId: string, projectId: string, title: string) => {
    setBusyScreenplayId(screenplayId);
    setBusyLabel("Deleting...");
    setError("");
    toast.loading(`Deleting ${title}...`, { id: screenplayId });

    try {
      const res = await fetch(`${apiBaseUrl}/api/scripts/${screenplayId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Delete failed"));
      }

      setData((prev) => {
        const projects = prev.projects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            screenplay_count: Math.max(0, project.screenplay_count - 1),
            screenplays: project.screenplays.filter((screenplay) => screenplay.id !== screenplayId),
          };
        });

        return {
          ...prev,
          total_screenplays: Math.max(0, prev.total_screenplays - 1),
          projects,
        };
      });

      toast.success("Script deleted", { id: screenplayId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected delete error";
      setError(message);
      toast.error(message, { id: screenplayId });
    } finally {
      setBusyScreenplayId("");
      setBusyLabel("");
    }
  };

  const reprocessScript = async (screenplayId: string, projectId: string, title: string) => {
    setBusyScreenplayId(screenplayId);
    setBusyLabel("Re-processing...");
    setError("");
    toast.loading(`Re-processing ${title}...`, { id: screenplayId });
    updateScreenplay(projectId, screenplayId, {
      processing_status: "extracting_text",
      processing_progress: 1,
      processing_message: "Starting processing",
    });

    let stopPolling = () => {};
    try {
      stopPolling = startProcessingPoll(screenplayId, projectId);
      const res = await fetch(`${apiBaseUrl}/api/scripts/${screenplayId}/reprocess`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Re-process failed"));
      }

      const summary = (await res.json()) as ProcessingSummary;
      updateScreenplay(projectId, screenplayId, {
        language: summary.language,
        language_code: summary.language_code,
        structure_type: summary.structure_type,
        total_scenes: summary.total_scenes,
        processing_status: summary.processing_status,
        processing_progress: summary.processing_progress,
        processing_message: summary.processing_message,
      });
      toast.success("Script re-processed", { id: screenplayId });
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected re-process error";
      updateScreenplay(projectId, screenplayId, {
        processing_status: "failed",
        processing_progress: 0,
        processing_message: "Failed",
      });
      setError(message);
      toast.error(message, { id: screenplayId });
    } finally {
      stopPolling();
      setBusyScreenplayId("");
      setBusyLabel("");
    }
  };

  const deleteProject = async (projectId: string, title: string) => {
    const project = data.projects.find((item) => item.id === projectId);
    setBusyProjectId(projectId);
    setBusyLabel("Deleting...");
    setError("");
    toast.loading(`Deleting ${title}...`, { id: projectId });

    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, "Project delete failed"));
      }

      setData((prev) => ({
        ...prev,
        total_projects: Math.max(0, prev.total_projects - 1),
        total_screenplays: Math.max(0, prev.total_screenplays - (project?.screenplay_count ?? 0)),
        projects: prev.projects.filter((item) => item.id !== projectId),
      }));

      toast.success("Project deleted", { id: projectId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected project delete error";
      setError(message);
      toast.error(message, { id: projectId });
    } finally {
      setBusyProjectId("");
      setBusyLabel("");
    }
  };

  const updateScreenplay = (
    projectId: string,
    screenplayId: string,
    updates: Partial<ScreenplaySummary>,
  ) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          screenplays: project.screenplays.map((screenplay) =>
            screenplay.id === screenplayId ? { ...screenplay, ...updates } : screenplay,
          ),
        };
      }),
    }));
  };

  const startProcessingPoll = (screenplayId: string, projectId: string) => {
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/screenplays/${screenplayId}/processing-summary`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const summary = (await res.json()) as ProcessingSummary;
        updateScreenplay(projectId, screenplayId, {
          language: summary.language,
          language_code: summary.language_code,
          structure_type: summary.structure_type,
          total_scenes: summary.total_scenes,
          processing_status: summary.processing_status,
          processing_progress: summary.processing_progress,
          processing_message: summary.processing_message,
        });
      } catch {
        // Polling is best-effort; the primary process request still handles errors.
      }
    }, 1500);

    return () => window.clearInterval(interval);
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] px-6 py-10 text-white">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-xl border border-[#FFC107]/30 bg-[#1A1A1A] p-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-[#A0A0A0]">Welcome back, {data.name}</p>
          <p className="text-sm text-[#A0A0A0]">{data.email}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
            <p className="text-sm text-[#A0A0A0]">Projects</p>
            <p className="mt-2 text-2xl font-semibold">{data.total_projects}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
            <p className="text-sm text-[#A0A0A0]">Uploaded Scripts</p>
            <p className="mt-2 text-2xl font-semibold">{data.total_screenplays}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
            <p className="text-sm text-[#A0A0A0]">Languages</p>
            <p className="mt-2 text-2xl font-semibold">
              {new Set(data.projects.map((p) => p.language)).size}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
            <p className="text-sm text-[#A0A0A0]">Profile Status</p>
            <p className="mt-2 text-2xl font-semibold">Active</p>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Projects & Script Details</h2>
            <Button type="button" onClick={() => setShowCreateProject(true)}>
              <Plus />
              Add Project
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {data.projects.length === 0 ? (
              <p className="text-sm text-[#A0A0A0]">No projects found yet.</p>
            ) : (
              data.projects.map((project) => (
                <article key={project.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-medium">{project.title}</h3>
                      <span className="mt-1 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-[#A0A0A0]">
                        {project.language}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busyProjectId === project.id}
                      onClick={() =>
                        setConfirmAction({
                          type: "delete-project",
                          projectId: project.id,
                          title: project.title,
                        })
                      }
                    >
                      <FolderX />
                      {busyProjectId === project.id ? busyLabel : "Delete Project"}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-[#A0A0A0]">
                    Created: {new Date(project.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-[#A0A0A0]">
                    Screenplays uploaded: {project.screenplay_count}
                  </p>

                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#FFC107] px-4 py-2 text-sm font-semibold text-black hover:brightness-110">
                    <FileUp className="h-4 w-4" />
                    {busyProjectId === project.id ? busyLabel : "Upload Script to This Project"}
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      className="hidden"
                      onChange={(e) =>
                        uploadScriptToProject(project.id, project.language, e.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  {project.screenplays.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {project.screenplays.map((screenplay) => (
                        <div key={screenplay.id} className="rounded-md border border-white/10 bg-[#1A1A1A] p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{screenplay.title}</p>
                              <p className="text-xs text-[#A0A0A0]">
                                {screenplay.language} | {new Date(screenplay.created_at).toLocaleString()}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#A0A0A0]">
                                {screenplay.file_path ?? "No file path"}
                              </p>
                              <p className="mt-2 text-xs text-[#A0A0A0]">
                                Status: {screenplay.processing_status} | Scenes: {screenplay.total_scenes}
                              </p>
                              <ProcessingProgress screenplay={screenplay} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/screenplays/${screenplay.id}/summary`)}
                              >
                                <Eye />
                                View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyScreenplayId === screenplay.id}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "reprocess-script",
                                    screenplayId: screenplay.id,
                                    projectId: project.id,
                                    title: screenplay.title,
                                  })
                                }
                              >
                                <RotateCcw />
                                {busyScreenplayId === screenplay.id ? busyLabel : "Re-Process"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={busyScreenplayId === screenplay.id}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "delete-script",
                                    screenplayId: screenplay.id,
                                    projectId: project.id,
                                    title: screenplay.title,
                                  })
                                }
                              >
                                <Trash2 />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        </section>
      </div>
      <ConfirmationModal
        action={confirmAction}
        busy={Boolean(busyProjectId || busyScreenplayId)}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />
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
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) {
    return "Unauthorized access";
  }

  if (response.status === 404) {
    return "Script or project not found";
  }

  if (response.status === 409) {
    return "Processing already running";
  }

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
      body: `Delete "${action.title}" and all processed scene data? This cannot be undone.`,
      confirm: "Delete",
    },
    "reprocess-script": {
      title: "Re-Process Script",
      body: `Re-run processing for "${action.title}" using the existing uploaded file? Current extracted scenes will be replaced.`,
      confirm: "Re-Process",
    },
    "delete-project": {
      title: "Delete Project",
      body: `Delete project "${action.title}" with all uploaded scripts and processed data? This cannot be undone.`,
      confirm: "Delete Project",
    },
  }[action.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-white shadow-2xl">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#A0A0A0]">{copy.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={action.type === "reprocess-script" ? "default" : "destructive"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working..." : copy.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProcessingProgress({ screenplay }: { screenplay: ScreenplaySummary }) {
  const activeStatuses: ProcessingStatus[] = [
    "processing",
    "extracting_text",
    "validating_text",
    "sample_ocr",
    "full_ocr",
    "gemini_ocr",
    "scene_detection",
  ];

  if (!activeStatuses.includes(screenplay.processing_status)) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, screenplay.processing_progress));
  return (
    <div className="mt-3 w-full max-w-md rounded-md border border-[#FFC107]/20 bg-black/20 p-3">
      <p className="text-sm font-medium text-white">Processing screenplay</p>
      <p className="mt-1 text-xs text-[#A0A0A0]">{screenplay.processing_message ?? screenplay.processing_status}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#FFC107] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#A0A0A0]">{progress}%</p>
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-white shadow-2xl">
        <h2 className="text-lg font-semibold">Add Project</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="new-project-title">
              Project Name
            </label>
            <input
              id="new-project-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
              placeholder="My Next Film Project"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="new-project-language">
              Language
            </label>
            <select
              id="new-project-language"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#FFC107]"
            >
              {projectLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onCreate}>
            <Plus />
            {busy ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
