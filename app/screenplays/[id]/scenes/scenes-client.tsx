"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Save, Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronUp, Users, MapPin, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProcessingSummary, Scene, SceneListResponse } from "@/lib/screenplay-types";
import { SceneBreakdownView } from "../summary/scene-breakdown-view";

function EditableTagList({
  items,
  originalItems,
  onChange,
  onSave,
  isSaving,
  colorScheme
}: {
  items: string[];
  originalItems: string[];
  onChange: (newItems: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
  colorScheme: "blue" | "green";
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [newItem, setNewItem] = useState("");

  const colorClasses = colorScheme === "blue" 
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
    : "bg-green-500/10 text-green-400 border-green-500/20";

  const focusRing = colorScheme === "blue" ? "focus:border-blue-500/50" : "focus:border-green-500/50";

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingVal(items[idx]);
  };

  const saveEdit = (idx: number) => {
    if (editingVal.trim()) {
      const next = [...items];
      next[idx] = editingVal.trim();
      onChange(next);
    }
    setEditingIdx(null);
  };

  const remove = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    onChange(next);
  };

  const add = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);
  const handleUndo = () => onChange([...originalItems]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <input 
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add new..."
          className={`flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm outline-none text-white ${focusRing}`}
        />
        <Button size="sm" variant="secondary" onClick={add} className="h-8 bg-white/10 hover:bg-white/20 text-white border-0">Add</Button>
        {hasChanges && (
          <Button size="sm" variant="ghost" onClick={handleUndo} className="h-8 px-2 text-[#AAB4BF] hover:text-white" title="Undo changes">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" className="h-8 bg-[#FFC107] text-black hover:brightness-110" onClick={onSave} disabled={isSaving || !hasChanges}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div key={idx} className={`flex items-center gap-1 rounded border px-2.5 py-1 text-xs ${colorClasses}`}>
            {editingIdx === idx ? (
              <input
                autoFocus
                value={editingVal}
                onChange={e => setEditingVal(e.target.value)}
                onBlur={() => saveEdit(idx)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') setEditingIdx(null); }}
                className="bg-transparent outline-none w-24 text-inherit"
              />
            ) : (
              <span className="cursor-pointer" onClick={() => handleEdit(idx)}>{item}</span>
            )}
            <button onClick={() => remove(idx)} className="ml-1 opacity-50 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-[#AAB4BF]/60 italic">None detected</p>}
      </div>
    </div>
  );
}

type Props = {
  backendAccessToken: string;
  scriptId: string;
  initialSummary: ProcessingSummary;
  initialScenesData: SceneListResponse;
};

export default function ScenesClient({ backendAccessToken, scriptId, initialSummary, initialScenesData }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [summary, setSummary] = useState<ProcessingSummary>(initialSummary);
  const [scenes, setScenes] = useState<Scene[]>(initialScenesData.scenes);
  const [busy, setBusy] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showCharactersPanel, setShowCharactersPanel] = useState(false);
  const [showLocationsPanel, setShowLocationsPanel] = useState(false);

  const [characters, setCharacters] = useState<string[]>(initialSummary.characters || []);
  const [locations, setLocations] = useState<string[]>(initialSummary.locations || []);
  const [savingCharacters, setSavingCharacters] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);

  // Keep track of which scenes are currently being edited
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, { heading: string; content: string }>>({});

  const totalScenes = scenes.length;

  const saveMetadata = async (type: "characters" | "locations", data: string[]) => {
    const isChar = type === "characters";
    const setSaving = isChar ? setSavingCharacters : setSavingLocations;
    setSaving(true);
    toast.loading(`Saving ${type}...`, { id: `save-${type}` });
    try {
      const payload = isChar ? { characters: data } : { locations: data };
      const response = await fetch(`${apiBaseUrl}/api/screenplays/${scriptId}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? `Failed to save ${type}`);
      }

      const updatedData = await response.json() as ProcessingSummary;
      setSummary(updatedData);
      if (isChar) {
        setCharacters(updatedData.characters || []);
      } else {
        setLocations(updatedData.locations || []);
      }

      toast.success(`${type === "characters" ? "Characters" : "Locations"} saved successfully`, { id: `save-${type}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to save ${type}`, { id: `save-${type}` });
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-3xl font-semibold">Script Development</h1>
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
          
          {/* Summary Card */}
          <div className="rounded-xl border border-white/10 bg-[#1A1D21] p-6 shadow-md">
            <h2 className="text-xl font-bold text-white mb-4">Screenplay Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold">Language</p>
                <p className="text-lg font-bold text-white mt-1">{summary.language}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold">Scenes</p>
                <p className="text-lg font-bold text-[#FFC107] mt-1">{summary.scene_count ?? totalScenes}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold">Characters</p>
                <p className="text-lg font-bold text-blue-400 mt-1">{summary.character_count ?? 0}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-[#AAB4BF] uppercase font-semibold">Locations</p>
                <p className="text-lg font-bold text-green-400 mt-1">{summary.location_count ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Optional Review Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Characters Panel */}
            <div className="rounded-xl border border-white/10 bg-[#1A1D21] overflow-hidden">
              <button
                onClick={() => setShowCharactersPanel(!showCharactersPanel)}
                className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Review Characters ({summary.character_count ?? 0})
                </span>
                {showCharactersPanel ? <ChevronUp className="h-4 w-4 text-[#AAB4BF]" /> : <ChevronDown className="h-4 w-4 text-[#AAB4BF]" />}
              </button>
              {showCharactersPanel && (
                <div className="p-4 border-t border-white/5 bg-black/20 max-h-80 overflow-y-auto">
                  <EditableTagList
                    items={characters}
                    originalItems={summary.characters || []}
                    onChange={setCharacters}
                    onSave={() => saveMetadata("characters", characters)}
                    isSaving={savingCharacters}
                    colorScheme="blue"
                  />
                </div>
              )}
            </div>

            {/* Locations Panel */}
            <div className="rounded-xl border border-white/10 bg-[#1A1D21] overflow-hidden">
              <button
                onClick={() => setShowLocationsPanel(!showLocationsPanel)}
                className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-400" />
                  Review Locations ({summary.location_count ?? 0})
                </span>
                {showLocationsPanel ? <ChevronUp className="h-4 w-4 text-[#AAB4BF]" /> : <ChevronDown className="h-4 w-4 text-[#AAB4BF]" />}
              </button>
              {showLocationsPanel && (
                <div className="p-4 border-t border-white/5 bg-black/20 max-h-80 overflow-y-auto">
                  <EditableTagList
                    items={locations}
                    originalItems={summary.locations || []}
                    onChange={setLocations}
                    onSave={() => saveMetadata("locations", locations)}
                    isSaving={savingLocations}
                    colorScheme="green"
                  />
                </div>
              )}
            </div>
          </div>

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
                        <SceneBreakdownView sceneId={scene.id} apiBaseUrl={apiBaseUrl} accessToken={backendAccessToken} />
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
