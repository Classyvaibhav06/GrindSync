"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconPlus, IconUsers, IconSearch, IconX, IconLoader2, IconPackage,
  IconBrandGithub, IconSparkles, IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { AppShell } from "@/components/social-grind/AppShell";
import { cn } from "@/lib/utils";

interface ProjectCard {
  _id: string;
  name: string;
  description: string;
  githubRepoUrl: string;
  techStack: string[];
  skillLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  lookingFor: string;
  status: "OPEN" | "CLOSED";
  ownerId: string;
  ownerName: string;
  ownerUsername: string;
  memberCount: number;
  isOwner: boolean;
  isMember: boolean;
  myApplicationStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}

let _projectsCache: { projects: ProjectCard[]; timestamp: number } | null = null;

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const POPULAR_TECH = ["react", "next.js", "typescript", "node.js", "mongodb", "python", "flutter", "tailwind"];

const levelStyle: Record<string, string> = {
  BEGINNER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  INTERMEDIATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  ADVANCED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function MarketplacePage() {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectCard[]>(_projectsCache?.projects ?? []);
  const [loading, setLoading] = useState(!_projectsCache);

  /* filters */
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("ALL");
  const [tech, setTech] = useState<string[]>([]);

  /* create modal */
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [techInput, setTechInput] = useState("");
  const [skill, setSkill] = useState<string>("BEGINNER");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (_projectsCache && Date.now() - _projectsCache.timestamp < 30_000) {
      setProjects(_projectsCache.projects);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const d = await res.json();
      setProjects(d.projects ?? []);
      _projectsCache = { projects: d.projects ?? [], timestamp: Date.now() };
    } catch (err) {
      console.error("Projects fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (level !== "ALL" && p.skillLevel !== level) return false;
      if (tech.length > 0 && !tech.every((t) => p.techStack.includes(t))) return false;
      if (q && !(`${p.name} ${p.description} ${p.techStack.join(" ")}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [projects, query, level, tech]);

  const toggleTech = (t: string) =>
    setTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const createProject = async () => {
    if (!name.trim()) { toast.error("Give your project a name"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          githubRepoUrl: repoUrl,
          lookingFor,
          skillLevel: skill,
          techStack: techInput.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create project");
      _projectsCache = null;
      toast.success("Project listed on the marketplace!");
      router.push(`/marketplace/${d.project._id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not create project");
      setCreating(false);
    }
  };

  return (
    <AppShell title="Contribution Marketplace">
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">Contribution Marketplace</h1>
            <p className="text-xs text-[#6b7a99] mt-0.5">
              Find projects that match your stack and skill level — or recruit contributors.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}
          >
            <IconPlus size={15} /> <span>List Project</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#1b1b20] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-primary/40 transition-colors">
              <IconSearch size={14} className="text-[#6b7a99] flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, stacks…"
                className="flex-1 bg-transparent text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <IconAdjustmentsHorizontal size={13} className="text-[#6b7a99]" />
            {["ALL", ...LEVELS].map((l) => (
              <button key={l} onClick={() => setLevel(l)}
                className={cn("text-[10px] font-black uppercase tracking-wide rounded-full px-2.5 py-1 border transition-colors",
                  level === l ? "bg-primary text-white border-primary" : "text-[#6b7a99] border-white/[0.08] hover:border-primary/30 hover:text-[#e4e1e9]")}>
                {l === "ALL" ? "All levels" : l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {POPULAR_TECH.map((t) => (
              <button key={t} onClick={() => toggleTech(t)}
                className={cn("text-[10px] font-bold rounded-full px-2.5 py-1 border transition-colors",
                  tech.includes(t) ? "bg-primary/15 text-primary border-primary/40" : "text-[#6b7a99] border-white/[0.08] hover:border-primary/30 hover:text-[#e4e1e9]")}>
                {t}
              </button>
            ))}
            {tech.length > 0 && (
              <button onClick={() => setTech([])} className="text-[10px] font-black text-[#6b7a99] hover:text-red-400 px-1">clear</button>
            )}
          </div>
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="h-4 w-2/3 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-full bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1b1b20] rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <IconPackage size={26} className="text-primary" />
            </div>
            <h2 className="text-sm font-black">No projects match those filters</h2>
            <p className="text-xs text-[#6b7a99] max-w-xs leading-relaxed">
              Try clearing filters — or list your own project and let contributors come to you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <Link key={p._id} href={`/marketplace/${p._id}`}>
                <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:bg-[#1f1f26] transition-colors h-full">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-[#e4e1e9] truncate">{p.name}</h3>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-1 border flex-shrink-0",
                      p.status === "OPEN" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-[#6b7a99] bg-white/[0.04] border-white/[0.08]")}>
                      {p.status}
                    </span>
                  </div>
                  {p.description && <p className="text-[11px] text-[#6b7a99] leading-relaxed line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {p.techStack.slice(0, 4).map((t) => (
                      <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                    <span className={cn("text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 border", levelStyle[p.skillLevel])}>
                      {p.skillLevel}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#6b7a99]">
                      <IconUsers size={12} /> {p.memberCount}
                      {p.myApplicationStatus === "PENDING" && <span className="text-amber-400 ml-1">· pending</span>}
                      {p.isMember && <span className="text-emerald-400 ml-1">· member</span>}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#6b7a99]">by {p.ownerName}{p.ownerUsername ? ` · @${p.ownerUsername}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Project Modal ──────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-[#16161c] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black flex items-center gap-2"><IconSparkles size={16} className="text-primary" /> List a Project</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Project name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                  placeholder="e.g. GrindSync mobile app"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3}
                  placeholder="What is it and why would someone contribute?"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">GitHub repo URL</label>
                  <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/…"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Tech stack (comma separated)</label>
                  <input value={techInput} onChange={(e) => setTechInput(e.target.value)}
                    placeholder="react, node.js, mongodb"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Skill level needed</label>
                <div className="flex gap-1.5">
                  {LEVELS.map((l) => (
                    <button key={l} onClick={() => setSkill(l)}
                      className={cn("flex-1 text-[10px] font-black uppercase rounded-xl px-2 py-2 border transition-colors",
                        skill === l ? "bg-primary text-white border-primary" : "text-[#6b7a99] border-white/[0.08] hover:border-primary/30")}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Looking for</label>
                <input value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} maxLength={200}
                  placeholder='e.g. "2 contributors for the dashboard UI"'
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors" />
              </div>
            </div>

            <button onClick={createProject} disabled={creating || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
              {creating ? <IconLoader2 size={16} className="animate-spin" /> : <IconBrandGithub size={15} />}
              {creating ? "Listing…" : "Publish project"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
