"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Save, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProcessingSummary, Scene, SceneListResponse } from "@/lib/screenplay-types";

type Props = {
  backendAccessToken: string;
  scriptId: string;
  initialSummary: ProcessingSummary;
  initialScenesData: SceneListResponse;
};

export default function SummaryClient({ backendAccessToken, scriptId, initialSummary, initialScenesData }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [summary] = useState<ProcessingSummary>(initialSummary);
  const [scenes, setScenes] = useState<Scene[]>(initialScenesData.scenes);
  const [busy, setBusy] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Keep track of which scenes are currently being edited
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, { heading: string; content: string }>>({});

  const totalScenes = scenes.length;

  const labelForStructure = (value: string) =>
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const startEditing = (scene: Scene) => {
    setEditingIds((prev) => new Set(prev).add(scene.id));
    setEditValues((prev) => ({
      ...prev,
      [scene.id]: { heading: scene.heading, content: scene.content },
    }));
  };

  const cancelEditing = (sceneId: string) => {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(sceneId);
      return next;
    });
    setEditValues((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
    
    // If it was a newly added scene (temporary id starting with 'new-'), remove it entirely if cancelled
    if (sceneId.startsWith("new-")) {
      setScenes(current => current.filter(s => s.id !== sceneId));
      setHasUnsavedChanges(true);
    }
  };

  const updateEditValue = (sceneId: string, field: "heading" | "content", value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], [field]: value },
    }));
    setHasUnsavedChanges(true);
  };

  const saveSceneLocally = (sceneId: string) => {
    const edits = editValues[sceneId];
    if (!edits) return;

    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId ? { ...scene, heading: edits.heading, content: edits.content } : scene
      )
    );
    
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(sceneId);
      return next;
    });
    
    setHasUnsavedChanges(true);
  };

  const addNewScene = (index: number) => {
    const newId = `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newScene: Scene = {
      id: newId,
      script_id: scriptId,
      scene_number: 0, // Will be re-calculated on save
      heading: "NEW SCENE",
      content: "",
      created_at: new Date().toISOString(),
    };

    const newScenes = [...scenes];
    newScenes.splice(index, 0, newScene);
    setScenes(newScenes);
    startEditing(newScene);
    setHasUnsavedChanges(true);
  };

  const removeScene = (sceneId: string) => {
    setScenes((current) => current.filter((s) => s.id !== sceneId));
    setHasUnsavedChanges(true);
  };

  const saveAllChanges = async () => {
    setBusy(true);
    toast.loading("Saving all changes...", { id: "save-all" });

    try {
      // Re-number scenes and remove temporary 'new-' IDs
      const payloadScenes = scenes.map((scene, index) => ({
        id: scene.id.startsWith("new-") ? null : scene.id,
        scene_number: index + 1,
        heading: editingIds.has(scene.id) ? editValues[scene.id].heading : scene.heading,
        content: editingIds.has(scene.id) ? editValues[scene.id].content : scene.content,
      }));

      const response = await fetch(`${apiBaseUrl}/api/screenplays/${scriptId}/scenes/corrections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          total_scenes: payloadScenes.length,
          scenes: payloadScenes,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Failed to save changes");
      }

      const updatedData = (await response.json()) as SceneListResponse;
      setScenes(updatedData.scenes);
      setEditingIds(new Set());
      setEditValues({});
      setHasUnsavedChanges(false);
      toast.success("All changes saved successfully", { id: "save-all" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save", { id: "save-all" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#101114] text-white">
      <Toaster richColors position="top-right" />
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-start gap-8 px-5 py-8">
        
        {/* Sticky Sidebar */}
        <aside className="w-full lg:sticky lg:top-8 lg:w-80 space-y-6">
          <div>
            <Button asChild variant="ghost" className="mb-4 text-[#C8D1D9] -ml-4">
              <Link href={summary.project_id ? `/projects/${summary.project_id}` : "/dashboard"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold">Breakdown</h1>
            <p className="mt-2 text-sm text-[#AAB4BF]">Review and edit your scenes</p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-[#1A1D21] p-5">
            <div>
              <p className="text-xs text-[#AAB4BF] uppercase tracking-wider font-semibold">Total Scenes</p>
              <p className="mt-1 text-4xl font-bold text-[#FFC107]">{totalScenes}</p>
            </div>
            <div className="h-px bg-white/10 my-4" />
            <div>
              <p className="text-xs text-[#AAB4BF] uppercase tracking-wider font-semibold">Language</p>
              <p className="mt-1 text-lg font-medium">{summary.language}</p>
            </div>
            <div>
              <p className="text-xs text-[#AAB4BF] uppercase tracking-wider font-semibold">Format</p>
              <p className="mt-1 text-lg font-medium">{labelForStructure(summary.structure_type)}</p>
            </div>
            <div>
              <p className="text-xs text-[#AAB4BF] uppercase tracking-wider font-semibold">Status</p>
              <p className="mt-1 text-lg font-medium capitalize text-[#86D8C8]">{summary.processing_status}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <Button 
              className="w-full bg-[#FFC107] text-black hover:brightness-110 h-12 font-semibold text-base"
              onClick={saveAllChanges}
              disabled={busy || !hasUnsavedChanges}
            >
              <Save className="mr-2 h-5 w-5" />
              {busy ? "Saving..." : "Save All Changes"}
            </Button>
            {!hasUnsavedChanges && (
              <p className="mt-3 text-center text-xs text-[#AAB4BF] flex items-center justify-center gap-1">
                <Check className="h-3 w-3" /> All changes saved
              </p>
            )}
            {hasUnsavedChanges && (
              <p className="mt-3 text-center text-xs text-orange-400">
                You have unsaved changes
              </p>
            )}
          </div>
        </aside>

        {/* Main Content (Scene Editor) */}
        <section className="flex-1 w-full space-y-4">
          
          <div className="relative group">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button size="sm" onClick={() => addNewScene(0)} className="rounded-full shadow-lg bg-[#2A2E33] hover:bg-[#3A3E43] text-white border border-white/10">
                <Plus className="mr-1.5 h-4 w-4" /> Add Scene
              </Button>
            </div>
            <div className="h-8" />
          </div>

          {scenes.length === 0 && (
            <div className="text-center py-12 border border-white/10 border-dashed rounded-xl text-[#AAB4BF]">
              No scenes found. Add a scene to get started.
            </div>
          )}

          {scenes.map((scene, index) => {
            const isEditing = editingIds.has(scene.id);
            const edits = editValues[scene.id];

            return (
              <div key={scene.id}>
                <article className="group rounded-xl border border-white/10 bg-[#1A1D21] transition-colors hover:border-white/20 overflow-hidden shadow-sm">
                  
                  {isEditing ? (
                    <div className="p-5 space-y-4 bg-[#212529]">
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#FFC107]">
                          Scene {index + 1}
                        </span>
                        <input
                          value={edits?.heading ?? ""}
                          onChange={(e) => updateEditValue(scene.id, "heading", e.target.value)}
                          className="flex-1 bg-transparent border-b border-white/20 px-2 py-1.5 text-lg font-medium text-white outline-none focus:border-[#FFC107] transition-colors"
                          placeholder="SCENE HEADING..."
                          autoFocus={scene.id.startsWith("new-")}
                        />
                      </div>
                      <textarea
                        value={edits?.content ?? ""}
                        onChange={(e) => updateEditValue(scene.id, "content", e.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-lg border border-white/10 bg-black/30 p-4 text-base leading-relaxed text-[#E6ECF2] outline-none focus:border-[#FFC107] transition-colors"
                        placeholder="Scene description and dialogue..."
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => cancelEditing(scene.id)} className="text-[#AAB4BF] hover:text-white">
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button onClick={() => saveSceneLocally(scene.id)} className="bg-white/10 hover:bg-white/20 text-white">
                          <Check className="mr-2 h-4 w-4" /> Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 flex flex-col md:flex-row gap-5 items-start">
                      <div className="flex-1 w-full min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-semibold text-[#AAB4BF]">
                            Scene {index + 1}
                          </span>
                          <h3 className="text-lg font-semibold text-white break-words">{scene.heading}</h3>
                        </div>
                        <div className="whitespace-pre-wrap text-[#C8D1D9] leading-relaxed">
                          {scene.content || <span className="italic opacity-50">Empty scene</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Scene"
                          onClick={() => startEditing(scene)}
                          className="h-9 w-9 text-[#AAB4BF] hover:text-white hover:bg-white/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Scene"
                          onClick={() => removeScene(scene.id)}
                          className="h-9 w-9 text-[#AAB4BF] hover:text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                </article>

                <div className="relative group my-2">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button size="sm" onClick={() => addNewScene(index + 1)} className="rounded-full shadow-lg bg-[#2A2E33] hover:bg-[#3A3E43] text-white border border-white/10">
                      <Plus className="mr-1.5 h-4 w-4" /> Add Scene
                    </Button>
                  </div>
                  <div className="h-8 flex items-center justify-center">
                    <div className="w-full h-px bg-transparent group-hover:bg-white/5 transition-colors" />
                  </div>
                </div>

              </div>
            );
          })}
          
        </section>
      </div>
    </main>
  );
}
