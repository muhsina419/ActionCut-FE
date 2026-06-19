"use client";

import { useState } from "react";
import { ArrowLeft, Users, MapPin, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

type ProjectCharacter = {
  id: string;
  name: string;
  scene_count: number;
};

type ProjectLocation = {
  id: string;
  name: string;
  location_type: string;
  scene_count: number;
};

type BreakdownSummary = {
  characters: ProjectCharacter[];
  locations: ProjectLocation[];
  total_characters: number;
  total_locations: number;
};

type Props = {
  projectId: string;
  backendAccessToken: string;
  initialData: BreakdownSummary | null;
  user: { name: string; email: string };
};

export default function BreakdownClient({ projectId, backendAccessToken, initialData, user }: Props) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const authHeaders = { Authorization: `Bearer ${backendAccessToken}` };

  const [data, setData] = useState<BreakdownSummary | null>(initialData);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBreakdown = async () => {
    setIsGenerating(true);
    toast.loading("Generating breakdown...", { id: "generate" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}/breakdown/generate`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to generate breakdown");
      
      toast.success("Breakdown generation started! This may take a while. Refresh the page later to see results.", { id: "generate" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error", { id: "generate" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar user={user} apiBaseUrl={apiBaseUrl} />
      <main className="px-6 py-8">
        <Toaster richColors position="top-right" />
        <div className="mx-auto max-w-6xl space-y-6">
          
          <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm text-[#A0A0A0] hover:text-[#FFC107] transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Link>

          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-white">Breakdown Dashboard (V1)</h1>
            <Button onClick={generateBreakdown} disabled={isGenerating} className="bg-[#FFC107] text-black hover:brightness-110">
              <Play className="mr-2 h-4 w-4" /> {isGenerating ? "Generating..." : "Generate Breakdown"}
            </Button>
          </div>

          {!data || (data.total_characters === 0 && data.total_locations === 0) ? (
            <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-12 text-center mt-6">
              <p className="text-[#A0A0A0]">No breakdown data available yet.</p>
              <p className="mt-1 text-sm text-[#A0A0A0]/70">Click 'Generate Breakdown' to process scenes.</p>
            </div>
          ) : (
            <>
              {/* Top Cards */}
              <section className="grid gap-4 sm:grid-cols-2 mt-6">
                <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A0A0A0]">Characters Detected</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{data.total_characters}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 transition-colors hover:border-[#FFC107]/50 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A0A0A0]">Locations Detected</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{data.total_locations}</p>
                  </div>
                </div>
              </section>

              {/* Data Tables */}
              <div className="grid gap-6 md:grid-cols-2 mt-6">
                {/* Characters Section */}
                <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
                  <h2 className="text-xl font-medium text-white mb-4">Characters</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[#A0A0A0]">
                      <thead className="border-b border-white/10 text-xs uppercase text-[#A0A0A0]/70">
                        <tr>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4 text-right">Scene Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.characters.sort((a, b) => b.scene_count - a.scene_count).map(char => (
                          <tr key={char.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">{char.name}</td>
                            <td className="py-3 px-4 text-right">{char.scene_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Locations Section */}
                <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
                  <h2 className="text-xl font-medium text-white mb-4">Locations</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[#A0A0A0]">
                      <thead className="border-b border-white/10 text-xs uppercase text-[#A0A0A0]/70">
                        <tr>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4 text-right">Scene Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.locations.sort((a, b) => b.scene_count - a.scene_count).map(loc => (
                          <tr key={loc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">{loc.name}</td>
                            <td className="py-3 px-4">{loc.location_type || "-"}</td>
                            <td className="py-3 px-4 text-right">{loc.scene_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
