"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  IconArrowLeft, IconUsers, IconX, IconLoader2, IconBrandGithub,
  IconCheck, IconClipboardText, IconCrown, IconSend, IconLock,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { AppShell } from "@/components/social-grind/AppShell";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Member { userId: string; role: "OWNER" | "CONTRIBUTOR"; joinedAt: string; name: string; username: string; image: string | null }
interface Application { _id: string; userId: string; status: "PENDING" | "APPROVED" | "REJECTED"; message: string; appliedAt: string; name: string; username: string; image: string | null }
interface ProjectDetail {
  _id: string; name: string; description: string; githubRepoUrl: string;
  techStack: string[]; skillLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  lookingFor: string; status: "OPEN" | "CLOSED";
  ownerId: string; ownerName: string; ownerUsername: string;
  isOwner: boolean; isMember: boolean; myApplicationStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  members: Member[]; applications: Application[];
}

const levelStyle: Record<string, string> = {
  BEGINNER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  INTERMEDIATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  ADVANCED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function ProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  /* apply modal */
  const [showApply, setShowApply] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applying, setApplying] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error("Failed to load project");
      const d = await res.json();
      setProject(d.project);
    } catch (err) {
      console.error("Project fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (session?.user?.id) fetchProject(); }, [session?.user?.id, fetchProject]);

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/projects/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMsg }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not apply");
      toast.success("Application sent!");
      setShowApply(false);
      setApplyMsg("");
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || "Could not apply");
    } finally {
      setApplying(false);
    }
  };

  const review = async (appId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/projects/${id}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not update application");
      toast.success(status === "APPROVED" ? "Contributor added!" : "Application declined");
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || "Could not update application");
    }
  };

  const toggleStatus = async () => {
    if (!project) return;
    const next = project.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next === "OPEN" ? "Project reopened" : "Project closed");
      await fetchProject();
    } catch {
      toast.error("Could not update project");
    }
  };

  if (notFound) {
    return (
      <AppShell title="Marketplace">
        <div className="bg-[#1b1b20] rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-3 text-center">
          <IconClipboardText size={28} className="text-[#6b7a99] opacity-40" />
          <h2 className="text-sm font-black">Project not found</h2>
          <Link href="/marketplace" className="text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
            ← Back to marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={project ? project.name : "Project"}>
      {loading || !project ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight">{project.name}</h1>
                  <p className="text-[11px] text-[#6b7a99] mt-0.5">
                    by {project.ownerName}{project.ownerUsername ? ` · @${project.ownerUsername}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-1 border",
                    project.status === "OPEN" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-[#6b7a99] bg-white/[0.04] border-white/[0.08]")}>
                    {project.status}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 border", levelStyle[project.skillLevel])}>
                    {project.skillLevel}
                  </span>
                </div>
              </div>

              {project.description && (
                <p className="text-xs text-[#c4c5d9] leading-relaxed whitespace-pre-wrap">{project.description}</p>
              )}

              {project.lookingFor && (
                <div className="bg-primary/[0.06] border border-primary/20 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Looking for</p>
                  <p className="text-xs text-[#e4e1e9] leading-relaxed">{project.lookingFor}</p>
                </div>
              )}

              {project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((t) => (
                    <span key={t} className="text-[10px] font-bold bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-2 py-1">{t}</span>
                  ))}
                </div>
              )}

              {project.githubRepoUrl && (
                <a href={project.githubRepoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-primary hover:text-primary/80 transition-colors">
                  <IconBrandGithub size={14} /> View repository
                </a>
              )}
            </div>

            {/* Owner: applications manager */}
            {project.isOwner && (
              <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
                <h2 className="text-sm font-black flex items-center gap-2 mb-3">
                  <IconClipboardText size={14} className="text-primary" /> Applications
                  <span className="text-[10px] font-black text-[#6b7a99]">({project.applications.length})</span>
                </h2>
                {project.applications.length === 0 ? (
                  <p className="text-[11px] text-[#6b7a99] py-3 text-center">No applications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {project.applications.map((a) => (
                      <div key={a._id} className="p-3 rounded-xl bg-white/[0.03] space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                            {a.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-[#e4e1e9] truncate">{a.name}{a.username ? ` · @${a.username}` : ""}</p>
                            <p className="text-[9px] text-[#6b7a99]">{new Date(a.appliedAt).toLocaleDateString()}</p>
                          </div>
                          {a.status === "PENDING" ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => review(a._id, "APPROVED")}
                                className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1.5 hover:bg-emerald-500/20 transition-colors">
                                <IconCheck size={11} /> Accept
                              </button>
                              <button onClick={() => review(a._id, "REJECTED")}
                                className="text-[10px] font-black text-[#6b7a99] hover:text-red-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-1.5 transition-colors">
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className={cn("text-[9px] font-black uppercase rounded-full px-2 py-1 border flex-shrink-0",
                              a.status === "APPROVED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-[#6b7a99] bg-white/[0.04] border-white/[0.08]")}>
                              {a.status}
                            </span>
                          )}
                        </div>
                        {a.message && <p className="text-[11px] text-[#c4c5d9] leading-relaxed pl-10">{a.message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Side column ── */}
          <div className="space-y-4">
            {/* Call to action */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 space-y-3">
              {project.isOwner ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <IconCrown size={14} />
                    <span className="text-xs font-black">You own this project</span>
                  </div>
                  <button onClick={toggleStatus}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-[#e4e1e9] bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors">
                    <IconLock size={13} /> {project.status === "OPEN" ? "Close to new applications" : "Reopen project"}
                  </button>
                </>
              ) : project.isMember ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <IconCheck size={14} />
                  <span className="text-xs font-black">You're a contributor 🎉</span>
                </div>
              ) : project.myApplicationStatus === "PENDING" ? (
                <div className="flex items-center gap-2 text-amber-400">
                  <IconLoader2 size={14} className="animate-spin" />
                  <span className="text-xs font-black">Application pending review</span>
                </div>
              ) : project.status === "CLOSED" ? (
                <p className="text-xs text-[#6b7a99] font-bold text-center py-2">This project is closed to new contributors.</p>
              ) : (
                <>
                  <p className="text-[11px] text-[#6b7a99] leading-relaxed">
                    Want to contribute? Send a short note about what you can help with.
                  </p>
                  <button onClick={() => setShowApply(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99]"
                    style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
                    <IconSend size={14} /> Apply to contribute
                  </button>
                  {project.myApplicationStatus === "REJECTED" && (
                    <p className="text-[10px] text-[#6b7a99] text-center">Your previous application was declined — you can reapply.</p>
                  )}
                </>
              )}
            </div>

            {/* Members */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
              <h2 className="text-sm font-black flex items-center gap-2 mb-3">
                <IconUsers size={14} className="text-primary" /> Team
                <span className="text-[10px] font-black text-[#6b7a99]">({project.members.length})</span>
              </h2>
              <div className="space-y-1.5">
                {project.members.map((m) => (
                  <Link key={m.userId} href={`/profile/${m.userId}`}>
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#e4e1e9] truncate flex items-center gap-1">
                          {m.name}
                          {m.role === "OWNER" && <IconCrown size={11} className="text-amber-400 flex-shrink-0" />}
                        </p>
                        {m.username && <p className="text-[9px] text-[#6b7a99] truncate">@{m.username}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Modal ───────────────────────────────── */}
      {showApply && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !applying && setShowApply(false)}>
          <div className="bg-[#16161c] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Apply to {project?.name}</h2>
              <button onClick={() => setShowApply(false)} className="text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
            </div>
            <textarea
              value={applyMsg}
              onChange={(e) => setApplyMsg(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Hi! I've worked with react and node.js — happy to take on the dashboard…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors resize-none"
            />
            <button onClick={apply} disabled={applying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
              {applying ? <IconLoader2 size={16} className="animate-spin" /> : <IconSend size={15} />}
              {applying ? "Sending…" : "Send application"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
