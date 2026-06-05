"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Camera,
  Clapperboard,
  FileUp,
  Film,
  Languages,
  MapPin,
  Shirt,
  Sparkles,
  Users,
  WandSparkles,
  Wrench,
} from "lucide-react";

const features = [
  { icon: Film, title: "Scene Detection", description: "Automatically split scripts into structured scenes." },
  { icon: Users, title: "Cast Breakdown", description: "Identify speaking characters and appearances." },
  { icon: Wrench, title: "Props Tracking", description: "Generate complete prop lists for every scene." },
  { icon: Shirt, title: "Costume Reports", description: "Track wardrobe requirements throughout production." },
  { icon: MapPin, title: "Location Analysis", description: "Identify and organize shooting locations." },
  { icon: Sparkles, title: "Production Insights", description: "Highlight stunts, animals, vehicles, VFX, and special requirements." },
];

const testimonials = [
  { quote: "We reduced prep time by more than half before principal photography.", name: "Ananya R.", role: "Assistant Director" },
  { quote: "The breakdown quality is consistent enough for daily production calls.", name: "Rahul K.", role: "Line Producer" },
  { quote: "From screenplay upload to usable reports in one flow. Huge time saver.", name: "Maya T.", role: "Independent Filmmaker" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white scroll-smooth">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Clapperboard className="h-5 w-5 text-[#FFC107]" />
            <span>Action Cut AI</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-[#A0A0A0] md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How It Works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden text-sm text-[#A0A0A0] hover:text-white sm:block">Sign In</Link>
            <Link href="/signup" className="rounded-md bg-[#FFC107] px-4 py-2 text-sm font-semibold text-black hover:brightness-110">Sign Up</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#FFC10722,transparent_40%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <p className="inline-flex rounded-full border border-[#FFC107]/40 bg-[#FFC107]/10 px-3 py-1 text-xs font-medium text-[#FFC107]">
                AI-Powered Film Production Assistant
              </p>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                Turn Screenplays Into Production-Ready Breakdowns in Minutes
              </h1>
              <p className="max-w-xl text-lg text-[#A0A0A0]">
                Upload any screenplay and let AI automatically identify scenes, cast, props, costumes, locations, vehicles, and production requirements.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-md bg-[#FFC107] px-5 py-3 font-semibold text-black hover:brightness-110">Try for free</button>
                <button className="rounded-md border border-white/20 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10">Book a demo</button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-white/10 bg-[#1A1A1A]/80 p-5 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[#A0A0A0]">Dashboard Preview</p>
                <Camera className="h-4 w-4 text-[#FFC107]" />
              </div>
              <div className="rounded-lg border border-dashed border-white/20 p-4 text-sm text-[#A0A0A0]">Upload screenplay.pdf</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["INT. STUDIO - DAY", "Cast: 4", "Props: 12", "Location: Warehouse"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/30 p-3 text-sm">{item}</div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="mb-6 text-center text-xl font-semibold">Built for Modern Filmmakers</h2>
          <div className="grid gap-3 text-center text-sm text-[#A0A0A0] sm:grid-cols-2 md:grid-cols-5">
            {["Film Students", "Assistant Directors", "Producers", "Production Teams", "Independent Filmmakers"].map((item) => (
              <div key={item} className="rounded-md border border-white/10 bg-[#1A1A1A] p-3">{item}</div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-semibold">Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <motion.div whileHover={{ y: -4 }} key={feature.title} className="rounded-lg border border-white/10 bg-[#1A1A1A]/80 p-5">
                <feature.icon className="mb-3 h-5 w-5 text-[#FFC107]" />
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm text-[#A0A0A0]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: FileUp, title: "Upload Script" },
              { icon: WandSparkles, title: "AI Analyzes Screenplay" },
              { icon: Clapperboard, title: "Export Production Reports" },
            ].map((step, idx) => (
              <div key={step.title} className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
                <step.icon className="mb-3 h-5 w-5 text-[#FFC107]" />
                <p className="text-xs text-[#A0A0A0]">Step {idx + 1}</p>
                <h3 className="mt-1 font-medium">{step.title}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-semibold">Dashboard Preview</h2>
          <div className="grid gap-4 lg:grid-cols-4">
            {["48 Scenes", "21 Characters", "134 Props", "12 Locations"].map((metric) => (
              <div key={metric} className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 text-xl font-semibold">{metric}</div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-semibold">Built for Global Storytelling</h2>
          <p className="mt-3 text-[#A0A0A0]">Analyze scripts in English, Malayalam, Hindi, Tamil, Telugu, and more.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["English", "Malayalam", "Hindi", "Tamil", "Telugu"].map((lang) => (
              <span key={lang} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm">
                <Languages className="mr-1 inline h-3 w-3 text-[#FFC107]" />{lang}
              </span>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-semibold">Why Action Cut AI</h2>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1A1A1A]">
                <tr>
                  <th className="p-4">Traditional Manual Breakdown</th>
                  <th className="p-4 text-[#FFC107]">Action Cut AI</th>
                </tr>
              </thead>
              <tbody className="bg-black/20 text-[#A0A0A0]">
                {[
                  ["Hours of work", "Minutes instead of hours"],
                  ["Error-prone", "Consistent results"],
                  ["Difficult collaboration", "Export-ready reports"],
                  ["No predictive insights", "AI-powered insights"],
                ].map(([a, b]) => (
                  <tr key={a} className="border-t border-white/10">
                    <td className="p-4">{a}</td>
                    <td className="p-4 text-white">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-semibold">Testimonials</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5">
                <p className="text-[#A0A0A0]">{t.quote}</p>
                <p className="mt-4 font-medium">{t.name}</p>
                <p className="text-sm text-[#A0A0A0]">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 pt-8">
          <div className="rounded-xl border border-[#FFC107]/30 bg-gradient-to-br from-[#1A1A1A] to-black p-8 text-center">
            <h2 className="text-3xl font-semibold">Your Next Production Starts Here</h2>
            <p className="mt-3 text-[#A0A0A0]">Spend less time organizing and more time creating.</p>
            <button className="mt-6 rounded-md bg-[#FFC107] px-5 py-3 font-semibold text-black hover:brightness-110">Try for free</button>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-white/10 bg-black/30 px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm text-[#A0A0A0] md:grid-cols-6">
          <span className="text-white">Action Cut AI</span>
          <a href="#">Product</a>
          <a href="#">Resources</a>
          <a href="#">Documentation</a>
          <a href="#">Contact</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
        </div>
      </footer>
    </div>
  );
}
