"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  MapPin, 
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { ProcessingSummary, Scene, SceneListResponse } from "@/lib/screenplay-types";
import { SceneBreakdownView } from "../summary/scene-breakdown-view";
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
          className={`flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs outline-none text-white ${focusRing}`}
        />
        <Button size="sm" variant="secondary" onClick={add} className="h-8 bg-white/10 hover:bg-white/20 text-white border-0 text-xs">Add</Button>
        {hasChanges && (
          <Button size="sm" variant="ghost" onClick={handleUndo} className="h-8 px-2 text-[#8F9CAE] hover:text-white" title="Undo changes">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button 
          size="sm" 
          className="h-8 bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold border-0 cursor-pointer text-xs" 
          onClick={onSave} 
          disabled={isSaving || !hasChanges}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
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
        {items.length === 0 && <p className="text-xs text-[#8F9CAE]/60 italic">None detected</p>}
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

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEnv, setFilterEnv] = useState<"ALL" | "INT" | "EXT">("ALL");
  
  // Single-Scene Focus Mode State
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const totalScenes = scenes.length;

  // Set first scene as active if none is active
  useEffect(() => {
    if (scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0].id);
    }
  }, [scenes, activeSceneId]);

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

  const removeScene = (sceneId: string) => {
    setScenes((current) => current.filter((s) => s.id !== sceneId));
    setHasUnsavedChanges(true);
  };

  const saveAllChanges = async () => {
    setBusy(true);
    toast.loading("Saving all changes...", { id: "save-all" });

    try {
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

  // Memoized Search & Filtering
  const filteredScenes = useMemo(() => {
    return scenes.filter(scene => {
      const headingUpper = scene.heading.toUpperCase();
      const contentUpper = (scene.content || "").toUpperCase();
      const query = searchQuery.trim().toUpperCase();
      
      const matchesSearch = !query || headingUpper.includes(query) || contentUpper.includes(query);
      
      let matchesEnv = true;
      if (filterEnv === "INT") {
        matchesEnv = headingUpper.includes("INT.") || headingUpper.includes("INT ") || headingUpper.includes("INDOOR");
      } else if (filterEnv === "EXT") {
        matchesEnv = headingUpper.includes("EXT.") || headingUpper.includes("EXT ") || headingUpper.includes("OUTDOOR");
      }
      
      return matchesSearch && matchesEnv;
    });
  }, [scenes, searchQuery, filterEnv]);

  // Auto-select first filtered scene if active scene is filtered out
  useEffect(() => {
    if (filteredScenes.length > 0) {
      const isStillVisible = filteredScenes.some(s => s.id === activeSceneId);
      if (!isStillVisible) {
        setActiveSceneId(filteredScenes[0].id);
      }
    }
  }, [filteredScenes, activeSceneId]);

  const activeScene = useMemo(() => {
    return scenes.find(s => s.id === activeSceneId);
  }, [scenes, activeSceneId]);

  const activeIndexInFiltered = useMemo(() => {
    return filteredScenes.findIndex(s => s.id === activeSceneId);
  }, [filteredScenes, activeSceneId]);

  const activeIndexInOverall = useMemo(() => {
    return scenes.findIndex(s => s.id === activeSceneId);
  }, [scenes, activeSceneId]);

  const goToPrevScene = () => {
    if (activeIndexInFiltered > 0) {
      setActiveSceneId(filteredScenes[activeIndexInFiltered - 1].id);
    }
  };

  const goToNextScene = () => {
    if (activeIndexInFiltered < filteredScenes.length - 1) {
      setActiveSceneId(filteredScenes[activeIndexInFiltered + 1].id);
    }
  };

  const handleAddNewScene = () => {
    const newId = `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newScene: Scene = {
      id: newId,
      script_id: scriptId,
      scene_number: 0,
      heading: "NEW SCENE",
      content: "",
      created_at: new Date().toISOString(),
    };

    const newScenes = [...scenes];
    const insertIdx = activeIndexInOverall !== -1 ? activeIndexInOverall + 1 : scenes.length;
    newScenes.splice(insertIdx, 0, newScene);
    setScenes(newScenes);
    setActiveSceneId(newId);
    startEditing(newScene);
    setHasUnsavedChanges(true);
  };

  const getSceneDuration = (content: string) => {
    const textLength = content ? content.trim().length : 0;
    if (textLength === 0) return "0s";
    const totalSeconds = Math.max(5, Math.round((textLength / 1000) * 60));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  };

  // Scroll editor view into visibility on tab change
  useEffect(() => {
    if (activeSceneId) {
      const element = document.getElementById("active-scene-view");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeSceneId]);

  return (
    <main className="min-h-screen bg-[#060709] text-white flex flex-col relative overflow-x-hidden w-full">
      {/* Background Projector Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.06),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute top-[300px] right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none z-0" />

      {/* Spotlight Cursor Follower */}
      <SpotlightCursorFollower />

      <Toaster richColors position="top-right" />
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-start gap-8 px-5 py-8 flex-grow relative z-10 w-full">
        
        {/* Sticky Sidebar HUD Capsule */}
        <aside className="w-full lg:sticky lg:top-8 lg:w-80 space-y-6 shrink-0">
          <div className="pl-2">
            <Link 
              href={summary.project_id ? `/projects/${summary.project_id}` : "/dashboard"}
              className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#8F9CAE] hover:text-[#F5C518] transition-colors cursor-pointer mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight font-heading">Script Development</h1>
            <p className="mt-1 text-xs text-[#8F9CAE]">Review and edit screenplay scenes</p>
          </div>

          <div className="space-y-5 rounded-[2rem] border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono">Total Scenes</span>
              <span className="text-2xl font-extrabold text-[#F5C518] font-mono">{totalScenes}</span>
            </div>
            
            <div className="h-px bg-white/5" />
            
            <Button 
              className="w-full bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold h-11 transition-all active:scale-95 cursor-pointer shadow-md shadow-[#F5C518]/10 text-xs"
              onClick={saveAllChanges}
              disabled={busy || !hasUnsavedChanges}
            >
              <Save className="mr-1.5 h-4.5 w-4.5" />
              {busy ? "Saving..." : "Save All Changes"}
            </Button>
            
            {hasUnsavedChanges ? (
              <p className="text-center text-xs text-orange-400 font-bold">
                You have unsaved changes
              </p>
            ) : (
              <p className="text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" /> All changes saved
              </p>
            )}

            {/* Scene Index Map Jumper */}
            <div className="h-px bg-white/5" />
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider font-mono">Scene Index Map</span>
              <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin text-xs">
                {scenes.map((s, idx) => {
                  const isFilteredOut = !filteredScenes.some(fs => fs.id === s.id);
                  const isEditing = editingIds.has(s.id);
                  const isActive = activeSceneId === s.id;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSceneId(s.id)}
                      disabled={isFilteredOut}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all truncate block cursor-pointer text-[11px] ${
                        isFilteredOut 
                          ? "opacity-30 border-transparent text-[#8F9CAE]" 
                          : isActive
                            ? "border-[#F5C518]/30 bg-[#F5C518]/10 text-[#F5C518]"
                            : isEditing
                              ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                              : "border-white/5 hover:border-white/20 hover:bg-white/[0.02] text-white"
                      }`}
                    >
                      <span className="font-mono text-[#F5C518] mr-1.5 font-bold">#{idx + 1}</span>
                      <span className="font-medium">{s.heading || "Empty Heading"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content (Scene Editor) */}
        <section className="flex-1 w-full space-y-6 min-w-0">
          
          {/* Cardless Heading Details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#8F9CAE] font-mono pb-4 border-b border-white/5 select-none">
            <span>{summary.language}</span>
            <span>•</span>
            <span>{labelForStructure(summary.structure_type)}</span>
            <span>•</span>
            <span>{summary.scene_count ?? totalScenes} Scenes</span>
            <span>•</span>
            <span>{summary.character_count ?? 0} Characters</span>
            <span>•</span>
            <span>{summary.location_count ?? 0} Locations</span>
            <span>•</span>
            <span className="capitalize text-emerald-400 font-extrabold">{summary.processing_status}</span>
          </div>

          {/* Optional Review Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Characters Panel */}
            <div className="rounded-2xl border border-white/5 bg-[#0F1015]/45 hover:bg-[#0F1015]/65 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setShowCharactersPanel(!showCharactersPanel)}
                className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-white hover:text-[#F5C518] transition-colors cursor-pointer uppercase tracking-wider font-mono"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-indigo-400" />
                  Review Characters ({summary.character_count ?? 0})
                </span>
                {showCharactersPanel ? <ChevronUp className="h-4 w-4 text-[#8F9CAE]" /> : <ChevronDown className="h-4 w-4 text-[#8F9CAE]" />}
              </button>
              <AnimatePresence initial={false}>
                {showCharactersPanel && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Locations Panel */}
            <div className="rounded-2xl border border-white/5 bg-[#0F1015]/45 hover:bg-[#0F1015]/65 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setShowLocationsPanel(!showLocationsPanel)}
                className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-white hover:text-[#F5C518] transition-colors cursor-pointer uppercase tracking-wider font-mono"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4.5 w-4.5 text-emerald-400" />
                  Review Locations ({summary.location_count ?? 0})
                </span>
                {showLocationsPanel ? <ChevronUp className="h-4 w-4 text-[#8F9CAE]" /> : <ChevronDown className="h-4 w-4 text-[#8F9CAE]" />}
              </button>
              <AnimatePresence initial={false}>
                {showLocationsPanel && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search & Filter HUD Pill */}
          <div className="rounded-2xl border border-white/5 bg-[#0F1015]/65 p-4 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); }}
                placeholder="Search scenes headings or content..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none text-white focus:border-[#F5C518] transition-colors placeholder:text-[#8F9CAE]/60 font-medium"
              />
            </div>
            
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex bg-black/30 border border-white/5 rounded-lg p-0.5 select-none text-[11px] font-bold">
                <button
                  onClick={() => { setFilterEnv("ALL"); }}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterEnv === "ALL" ? "bg-white/10 text-white" : "text-[#8F9CAE] hover:text-white"}`}
                >
                  All
                </button>
                <button
                  onClick={() => { setFilterEnv("INT"); }}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterEnv === "INT" ? "bg-white/10 text-white" : "text-[#8F9CAE] hover:text-white"}`}
                >
                  INT
                </button>
                <button
                  onClick={() => { setFilterEnv("EXT"); }}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${filterEnv === "EXT" ? "bg-white/10 text-white" : "text-[#8F9CAE] hover:text-white"}`}
                >
                  EXT
                </button>
              </div>
            </div>
          </div>

          {filteredScenes.length === 0 && (
            <div className="text-center py-12 border border-white/5 border-dashed rounded-2xl text-[#8F9CAE] bg-[#0F1015]/20">
              No scenes match the search or filter settings.
            </div>
          )}

          {/* Active Scene Panel (Single-Scene Focus Mode) */}
          {activeScene ? (
            (() => {
              const scene = activeScene;
              const isEditing = editingIds.has(scene.id);
              const edits = editValues[scene.id];
              const displayIndex = activeIndexInOverall + 1;

              return (
                <div 
                  id="active-scene-view"
                  className="rounded-2xl border border-white/5 bg-[#0F1015]/65 p-6 shadow-2xl backdrop-blur-xl relative"
                >
                  {/* Scene Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F5C518]/25 bg-black text-xs font-extrabold text-[#F5C518] shadow-md shadow-[#F5C518]/5 select-none">
                        {displayIndex}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold font-mono text-[#8F9CAE] uppercase tracking-wider block">Scene {displayIndex}</span>
                        {isEditing ? (
                          <input
                            value={edits?.heading ?? ""}
                            onChange={(e) => updateEditValue(scene.id, "heading", e.target.value)}
                            className="bg-transparent border-b border-white/10 px-1 py-0.5 text-base font-extrabold text-white outline-none focus:border-[#F5C518] transition-colors"
                            placeholder="SCENE HEADING..."
                          />
                        ) : (
                          <h2 className="text-base font-extrabold text-white tracking-tight">{scene.heading}</h2>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold font-mono text-[#8F9CAE] bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded select-none">
                        Est: {getSceneDuration(scene.content)}
                      </span>
                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Scene"
                            onClick={() => startEditing(scene)}
                            className="h-8 w-8 text-[#8F9CAE] hover:text-[#F5C518] hover:bg-white/5 cursor-pointer rounded-lg transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Scene"
                            onClick={() => {
                              removeScene(scene.id);
                              // Calculate next active scene index
                              const nextActiveIdx = activeIndexInOverall > 0 ? activeIndexInOverall - 1 : 1;
                              const fallbackScene = scenes.filter(s => s.id !== scene.id)[nextActiveIdx] || scenes.filter(s => s.id !== scene.id)[0];
                              setActiveSceneId(fallbackScene ? fallbackScene.id : null);
                            }}
                            className="h-8 w-8 text-[#8F9CAE] hover:text-red-400 hover:bg-red-400/10 cursor-pointer rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Editor or View */}
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={edits?.content ?? ""}
                        onChange={(e) => updateEditValue(scene.id, "content", e.target.value)}
                        rows={12}
                        className="w-full resize-y rounded-xl border border-white/5 bg-black/45 p-4 text-sm leading-relaxed text-white outline-none focus:border-[#F5C518] transition-colors font-mono"
                        placeholder="Scene description and dialogue..."
                      />
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => cancelEditing(scene.id)} className="text-[#8F9CAE] hover:text-white cursor-pointer h-9 px-4">
                          <X className="mr-1.5 h-4 w-4" /> Cancel
                        </Button>
                        <Button onClick={() => saveSceneLocally(scene.id)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white cursor-pointer h-9 px-4">
                          <Check className="mr-1.5 h-4 w-4" /> Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono pl-4 border-l-2 border-white/5 py-1 text-[#C8D1D9]">
                        {scene.content || <span className="italic opacity-30 text-xs font-mono">No screenplay content initialized. Click Edit to write.</span>}
                      </div>
                      
                      <SceneBreakdownView sceneId={scene.id} apiBaseUrl={apiBaseUrl} accessToken={backendAccessToken} />
                    </div>
                  )}

                  {/* Scene Jumper Bottom Nav */}
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between select-none">
                    <Button
                      variant="ghost"
                      onClick={goToPrevScene}
                      disabled={activeIndexInFiltered <= 0}
                      className="text-xs text-[#8F9CAE] hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Prev Scene
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleAddNewScene}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:text-white rounded-full text-xs px-4"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Insert Scene
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={goToNextScene}
                      disabled={activeIndexInFiltered >= filteredScenes.length - 1}
                      className="text-xs text-[#8F9CAE] hover:text-white cursor-pointer"
                    >
                      Next Scene <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            scenes.length === 0 && (
              <div className="text-center py-16 border border-white/5 border-dashed rounded-2xl text-[#8F9CAE] bg-[#0F1015]/20">
                <p className="mb-4">No scenes available in screenplay.</p>
                <Button onClick={handleAddNewScene} className="bg-[#F5C518] hover:bg-[#E2B30F] text-black hover:text-black font-bold">
                  <Plus className="mr-1.5 h-4 w-4" /> Create First Scene
                </Button>
              </div>
            )
          )}
          
        </section>
      </div>
      <Footer />
    </main>
  );
}
