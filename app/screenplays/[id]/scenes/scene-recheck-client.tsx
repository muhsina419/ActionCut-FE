"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Merge, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Scene, SceneListResponse } from "@/lib/screenplay-types";

type Props = {
  initialData: SceneListResponse;
};

export default function SceneRecheckClient({ initialData }: Props) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [scenes, setScenes] = useState<Scene[]>(initialData.scenes);
  const [totalScenes, setTotalScenes] = useState<number>(initialData.total_scenes);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saved, setSaved] = useState<boolean>(false);

  const selectedCount = selectedSceneIds.length;
  const summaryHref = `/screenplays/${initialData.script_id}/summary`;

  const selectedSceneNames = useMemo(() => {
    const selected = new Set(selectedSceneIds);
    return scenes
      .filter((scene) => selected.has(scene.id))
      .map((scene) => `#${scene.scene_number}`)
      .join(", ");
  }, [scenes, selectedSceneIds]);

  const updateSceneField = (sceneId: string, field: "heading" | "content", value: string) => {
    setScenes((current) =>
      current.map((scene) => (scene.id === sceneId ? { ...scene, [field]: value } : scene)),
    );
    setSaved(false);
  };

  const toggleSelected = (sceneId: string) => {
    setSelectedSceneIds((current) =>
      current.includes(sceneId) ? current.filter((id) => id !== sceneId) : [...current, sceneId],
    );
  };

  const replaceFromListResponse = (data: SceneListResponse) => {
    setScenes(data.scenes);
    setTotalScenes(data.total_scenes);
    setSelectedSceneIds([]);
  };

  const saveScene = async (scene: Scene) => {
    setBusyId(scene.id);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/screenplays/${initialData.script_id}/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heading: scene.heading, content: scene.content }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Scene save failed");
      }

      const updated = (await response.json()) as Scene;
      setScenes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected scene save error");
    } finally {
      setBusyId("");
    }
  };

  const deleteScene = async (sceneId: string) => {
    setBusyId(sceneId);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/screenplays/${initialData.script_id}/scenes/${sceneId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Scene delete failed");
      }

      replaceFromListResponse((await response.json()) as SceneListResponse);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected scene delete error");
    } finally {
      setBusyId("");
    }
  };

  const mergeSelectedScenes = async () => {
    if (selectedSceneIds.length < 2) return;
    setBusyId("merge");
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/screenplays/${initialData.script_id}/scenes/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_ids: selectedSceneIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Scene merge failed");
      }

      replaceFromListResponse((await response.json()) as SceneListResponse);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected scene merge error");
    } finally {
      setBusyId("");
    }
  };

  const saveCorrections = async () => {
    setBusyId("corrections");
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/screenplays/${initialData.script_id}/scenes/corrections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_scenes: totalScenes,
          scenes: scenes.map((scene, index) => ({
            id: scene.id,
            scene_number: index + 1,
            heading: scene.heading,
            content: scene.content,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Correction save failed");
      }

      replaceFromListResponse((await response.json()) as SceneListResponse);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected correction save error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="min-h-screen bg-[#101114] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <Button asChild variant="ghost" className="mb-3 text-[#C8D1D9]">
              <Link href={summaryHref}>
                <ArrowLeft />
                Summary
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold">Recheck Scenes</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-[#C8D1D9]">
              Scene Count
              <input
                type="number"
                min="0"
                value={totalScenes}
                onChange={(event) => {
                  setTotalScenes(Number(event.target.value));
                  setSaved(false);
                }}
                className="h-9 w-24 rounded-md border border-white/15 bg-[#1A1D21] px-3 text-white outline-none focus:border-[#FFC107]"
              />
            </label>
            <Button type="button" disabled={busyId === "corrections"} onClick={saveCorrections}>
              <Save />
              {busyId === "corrections" ? "Saving..." : "Save Corrections"}
            </Button>
          </div>
        </div>

        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#1A1D21] p-4">
          <p className="text-sm text-[#C8D1D9]">Selected: {selectedCount}</p>
          {selectedSceneNames ? <p className="text-sm text-[#86D8C8]">{selectedSceneNames}</p> : null}
          <Button
            type="button"
            variant="outline"
            disabled={selectedCount < 2 || busyId === "merge"}
            onClick={mergeSelectedScenes}
          >
            <Merge />
            {busyId === "merge" ? "Merging..." : "Merge Scenes"}
          </Button>
          {saved ? (
            <p className="inline-flex items-center gap-1 text-sm text-[#86D8C8]">
              <Check className="h-4 w-4" />
              Saved
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </section>

        <section className="space-y-4">
          {scenes.map((scene) => (
            <article key={scene.id} className="rounded-lg border border-white/10 bg-[#1A1D21] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSceneIds.includes(scene.id)}
                    onChange={() => toggleSelected(scene.id)}
                    className="h-4 w-4 accent-[#FFC107]"
                  />
                  <span className="shrink-0 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-[#C8D1D9]">
                    Scene {scene.scene_number}
                  </span>
                  <input
                    value={scene.heading}
                    onChange={(event) => updateSceneField(scene.id, "heading", event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-white/15 bg-[#111317] px-3 py-2 font-medium text-white outline-none focus:border-[#FFC107]"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    aria-label={`Save scene ${scene.scene_number}`}
                    title={`Save scene ${scene.scene_number}`}
                    disabled={busyId === scene.id}
                    onClick={() => saveScene(scene)}
                  >
                    <Save />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    aria-label={`Delete scene ${scene.scene_number}`}
                    title={`Delete scene ${scene.scene_number}`}
                    disabled={busyId === scene.id}
                    onClick={() => deleteScene(scene.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <textarea
                value={scene.content}
                onChange={(event) => updateSceneField(scene.id, "content", event.target.value)}
                rows={8}
                className="mt-3 w-full resize-y rounded-md border border-white/15 bg-[#111317] p-3 text-sm leading-6 text-[#E6ECF2] outline-none focus:border-[#FFC107]"
              />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
