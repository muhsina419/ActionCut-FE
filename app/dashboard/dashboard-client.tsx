"use client";

import { useState, useMemo } from "react";
import { FolderX, Plus, ChevronRight, FileText, Search, Filter, ArrowDownUp, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import type { ProcessingStatus } from "@/lib/screenplay-types";

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

const projectLanguages = ["Malayalam", "English", "Hindi", "Tamil", "Telugu"];

type SortOption = "newest" | "oldest" | "a-z" | "scripts";

export default function DashboardClient({ backendAccessToken, initialData }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  
  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
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
        throw new Error(await responseErrorMessage(res, "Project creation failed"));
      }

      const created = (await res.json()) as { id: string; title: string; language: string };
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
      const message = e instanceof Error ? e.message : "Unexpected project creation error";
      setError(message);
      toast.error(message, { id: "create-project" });
    } finally {
      setCreatingProject(false);
    }
  };

  // Recent Activity Computation
  const recentActivity = useMemo(() => {
    type Activity = { id: string; type: "project" | "script"; title: string; date: Date; targetUrl: string };
    const activities: Activity[] = [];
    
    data.projects.forEach(p => {
      activities.push({
        id: `p-${p.id}`,
        type: "project",
        title: `Created project "${p.title}"`,
        date: new Date(p.created_at),
        targetUrl: `/projects/${p.id}`
      });
      p.screenplays.forEach(s => {
        activities.push({
          id: `s-${s.id}`,
          type: "script",
          title: `Uploaded script "${s.title}" in ${p.title}`,
          date: new Date(s.created_at),
          targetUrl: `/projects/${p.id}`
        });
      });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);
  }, [data.projects]);

  // Filter & Sort Projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = data.projects;

    // Search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerQ));
    }

    // Status Filter
    if (statusFilter === "active") result = result.filter(p => !p.is_archived);
    if (statusFilter === "archived") result = result.filter(p => p.is_archived);

    // Language Filter
    if (languageFilter !== "all") {
      result = result.filter(p => p.language === languageFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "scripts") return b.screenplay_count - a.screenplay_count;
      return 0;
    });

    return result;
  }, [data.projects, searchQuery, statusFilter, languageFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="px-6 py-10">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-8">
          
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50">
              <p className="text-sm text-[#A0A0A0]">Total Projects</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.total_projects}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50">
              <p className="text-sm text-[#A0A0A0]">Uploaded Scripts</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.total_screenplays}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50">
              <p className="text-sm text-[#A0A0A0]">Languages Used</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {new Set(data.projects.map((p) => p.language)).size}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50">
              <p className="text-sm text-[#A0A0A0]">Profile Status</p>
              <p className="mt-2 text-3xl font-semibold text-white">Active</p>
            </div>
          </section>

          {recentActivity.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Clock className="h-5 w-5 text-[#FFC107]" />
                <h2 className="text-lg font-medium text-white">Recent Activity</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {activity.type === "project" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                          <FolderX className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white/90">{activity.title}</p>
                        <p className="text-xs text-[#A0A0A0]">{activity.date.toLocaleString()}</p>
                      </div>
                    </div>
                    <Link href={activity.targetUrl} className="text-sm text-[#FFC107] opacity-0 transition-opacity group-hover:opacity-100">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white">Your Projects</h2>
              <Button type="button" onClick={() => setShowCreateProject(true)} className="bg-[#FFC107] text-black hover:brightness-110">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
            
            {/* Filters and Search */}
            <div className="mt-4 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FFC107]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#A0A0A0]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
                >
                  <option value="all">All Languages</option>
                  {projectLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ArrowDownUp className="h-4 w-4 text-[#A0A0A0] ml-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="a-z">Name (A-Z)</option>
                  <option value="scripts">Most Scripts</option>
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedProjects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-[#A0A0A0]">
                  <FolderX className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p>No projects match your search/filters.</p>
                </div>
              ) : (
                filteredAndSortedProjects.map((project) => (
                  <article key={project.id} className="group relative flex flex-col justify-between rounded-lg border border-white/10 bg-black/40 p-5 transition-all hover:border-[#FFC107]/50 hover:bg-black/60">
                    <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10 rounded-lg">
                      <span className="sr-only">View Project</span>
                    </Link>
                    
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <h3 className="text-lg font-medium text-white truncate pr-4">{project.title}</h3>
                          {project.is_archived && (
                            <span className="mt-1 w-fit rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">ARCHIVED</span>
                          )}
                        </div>
                        <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-[#A0A0A0]">
                          {project.language}
                        </span>
                      </div>
                      <p className="mt-3 flex items-center text-sm text-[#A0A0A0]">
                        <FileText className="mr-1.5 h-4 w-4" />
                        {project.screenplay_count} Script{project.screenplay_count !== 1 ? 's' : ''}
                      </p>
                      <p className="mt-1 text-xs text-[#A0A0A0]/70">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="flex items-center text-sm font-medium text-[#FFC107] transition-transform group-hover:translate-x-1">
                        View Details <ChevronRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
          </section>
        </div>

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
    </div>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) return "Unauthorized access";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-white shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Add Project</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#A0A0A0]" htmlFor="new-project-title">
              Project Name
            </label>
            <input
              id="new-project-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
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
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#FFC107]"
            >
              {projectLanguages.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="border-white/20 hover:bg-white/10">
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onCreate} className="bg-[#FFC107] text-black hover:brightness-110">
            <Plus className="mr-2 h-4 w-4" />
            {busy ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
