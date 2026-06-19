"use client";

import { useState, useEffect } from "react";
import { Users, MapPin, Loader2 } from "lucide-react";

type SceneBreakdown = {
  scene_id: string;
  characters: string[];
  location: {
    name: string;
    type: string;
  } | null;
};

export function SceneBreakdownView({ sceneId, apiBaseUrl, accessToken }: { sceneId: string, apiBaseUrl: string, accessToken: string }) {
  const [data, setData] = useState<SceneBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sceneId.startsWith("new-")) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    const fetchBreakdown = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/scenes/${sceneId}/breakdown`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) {
                setData(null);
                setLoading(false);
            }
            return;
          }
          throw new Error("Failed");
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    fetchBreakdown();
    return () => { isMounted = false; };
  }, [sceneId, apiBaseUrl, accessToken]);

  if (loading) {
    return (
      <div className="mt-4 flex items-center text-xs text-[#A0A0A0]">
        <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading breakdown...
      </div>
    );
  }

  if (error || !data) {
    return null; // Don't show anything if no breakdown is generated yet
  }

  return (
    <div className="mt-4 rounded-md border border-white/5 bg-black/20 p-3 flex flex-col sm:flex-row gap-4 sm:gap-8">
      <div>
        <h4 className="flex items-center text-xs font-semibold uppercase text-[#A0A0A0] tracking-wider mb-2">
          <Users className="mr-1.5 h-3 w-3" /> Characters
        </h4>
        {data.characters.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {data.characters.map((char, i) => (
              <span key={i} className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 border border-blue-500/20">
                {char}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#A0A0A0]/60">None detected</p>
        )}
      </div>

      {data.location && (
        <div>
          <h4 className="flex items-center text-xs font-semibold uppercase text-[#A0A0A0] tracking-wider mb-2">
            <MapPin className="mr-1.5 h-3 w-3" /> Location
          </h4>
          <div className="flex items-center gap-2">
            <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20">
              {data.location.name}
            </span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-[#A0A0A0] border border-white/10">
              {data.location.type || "Unknown"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
