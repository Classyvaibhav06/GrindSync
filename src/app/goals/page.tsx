"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  IconTarget, IconPlus, IconX, IconLoader2, IconTrash, IconCheck,
  IconCode, IconBrandGithub, IconClock, IconFlame, IconCalendarDue,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { AppShell } from "@/components/social-grind/AppShell";
import { cn } from "@/lib/utils";

interface Goal {
  _id: string;
  title: string;
  type: "DAILY" | "DEADLINE";
  target: number;
  unit: string;
  progress: number;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
}
interface TodayAuto {
  problemsSolved: number;
  commits: number;
  challengesCompleted: number;
  studySeconds: number;
}

let _goalsCache: { goals: Goal[]; todayAuto: TodayAuto; timestamp: number } | null = null;

const UNITS = [
  { value: "problems", label: "Problems" },
  { value: "hours", label: "Hours" },
  { value: "commits", label: "Commits" },
  { value: "custom", label: "Sessions" },
];

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(_goalsCache?.goals ?? []);
  const [todayAuto, setTodayAuto] = useState<TodayAuto>(_goalsCache?.todayAuto ?? { problemsSolved: 0, commits: 0, challengesCompleted: 0, studySeconds: 0 });
  const [loading, setLoading] = useState(!_goalsCache);

  /* create form */
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"DAILY" | "DEADLINE">("DAILY");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("problems");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (_goalsCache && Date.now() - _goalsCache.timestamp < 20_000) {
      setGoals(_goalsCache.goals);
      setTodayAuto(_goalsCache.todayAuto);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      const d = await res.json();
      setGoals(d.goals ?? []);
      setTodayAuto(d.todayAuto ?? { problemsSolved: 0, commits: 0, challengesCompleted: 0, studySeconds: 0 });
      _goalsCache = { goals: d.goals ?? [], todayAuto: d.todayAuto, timestamp: Date.now() };
    } catch (err) {
      console.error("Goals fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const createGoal = async () => {
    if (!title.trim()) { toast.error("Give your goal a title"); return; }
    const t = Number(target);
    if (!Number.isFinite(t) || t <= 0) { toast.error("Target must be a positive number"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, unit, target: t, deadline: type === "DEADLINE" ? deadline : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create goal");
      _goalsCache = null;
      toast.success("Goal created — grind time!");
      setShowCreate(false);
      setTitle(""); setTarget("1"); setDeadline("");
      await fetchGoals();
    } catch (err: any) {
      toast.error(err.message || "Could not create goal");
    } finally {
      setCreating(false);
    }
  };

  const patchGoal = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      _goalsCache = null;
      await fetchGoals();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      _goalsCache = null;
      toast.success("Goal deleted");
      await fetchGoals();
    } catch {
      toast.error("Could not delete goal");
    } finally {
      setBusyId(null);
    }
  };

  const activeGoals = goals.filter((g) => !g.completedAt);
  const doneGoals = goals.filter((g) => g.completedAt);
  const todayStr = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <AppShell title="Goals">
      <div className="space-y-4 sm:space-y-6">

        {/* Today's automatic progress */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { icon: <IconCode size={14} className="text-primary" />, label: "Problems solved", value: String(todayAuto.problemsSolved), sub: "today" },
            { icon: <IconBrandGithub size={14} className="text-emerald-400" />, label: "Commits", value: String(todayAuto.commits), sub: "today" },
            { icon: <IconFlame size={14} className="text-orange-400" />, label: "Challenges", value: String(todayAuto.challengesCompleted), sub: "completed today" },
            { icon: <IconClock size={14} className="text-violet-400" />, label: "Grind time", value: fmtTime(todayAuto.studySeconds), sub: "timed today" },
          ].map((s) => (
            <div key={s.label} className="bg-[#1b1b20] rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                {s.icon}
                <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99]">{s.label}</p>
              </div>
              <p className="text-lg sm:text-xl font-black text-[#e4e1e9] tabular-nums leading-none">{loading ? "…" : s.value}</p>
              <p className="text-[9px] text-[#6b7a99] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">My Goals</h1>
            <p className="text-xs text-[#6b7a99] mt-0.5">Daily habits and deadline targets — log progress as you go.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
            <IconPlus size={15} /> <span>New Goal</span>
          </button>
        </div>

        {/* Active goals */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="h-4 w-2/3 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-2 w-full bg-white/[0.04] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : activeGoals.length === 0 && doneGoals.length === 0 ? (
          <div className="bg-[#1b1b20] rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <IconTarget size={26} className="text-primary" />
            </div>
            <h2 className="text-sm font-black">No goals yet</h2>
            <p className="text-xs text-[#6b7a99] max-w-xs leading-relaxed">
              Set a daily habit like "2 DSA problems" or a deadline goal — your auto stats above show how today is going.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="mt-1 text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
              Create your first goal →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {activeGoals.map((g) => {
              const pct = Math.min(100, Math.round((g.progress / g.target) * 100));
              const daysLeft = g.deadline
                ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
                : null;
              return (
                <div key={g._id} className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border",
                          g.type === "DAILY" ? "text-orange-400 bg-orange-400/10 border-orange-400/20" : "text-violet-400 bg-violet-500/10 border-violet-500/20")}>
                          {g.type === "DAILY" ? "Daily" : "Deadline"}
                        </span>
                        {daysLeft !== null && (
                          <span className="text-[9px] font-bold text-[#6b7a99] flex items-center gap-1">
                            <IconCalendarDue size={10} /> {daysLeft >= 0 ? `${daysLeft}d left` : "overdue"}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-[#e4e1e9] truncate mt-1">{g.title}</h3>
                    </div>
                    <button onClick={() => deleteGoal(g._id)} disabled={busyId === g._id}
                      className="text-[#6b7a99] hover:text-red-400 transition-colors flex-shrink-0 no-min-size p-1">
                      <IconTrash size={14} />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-[#c4c5d9] tabular-nums">
                        {g.progress} / {g.target} {g.unit === "hours" ? "hrs" : g.unit}
                      </span>
                      <span className="text-[10px] font-black text-[#6b7a99]">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg,#2547f4,#8c25f4)" }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => patchGoal(g._id, { action: "increment", amount: 1 })} disabled={busyId === g._id}
                      className="flex-1 text-[11px] font-black text-primary border border-primary/30 bg-primary/10 rounded-xl py-2 hover:bg-primary/20 transition-colors disabled:opacity-50">
                      +1
                    </button>
                    <button onClick={() => patchGoal(g._id, { action: "increment", amount: 5 })} disabled={busyId === g._id}
                      className="flex-1 text-[11px] font-black text-primary border border-primary/30 bg-primary/10 rounded-xl py-2 hover:bg-primary/20 transition-colors disabled:opacity-50">
                      +5
                    </button>
                    <button onClick={() => patchGoal(g._id, { action: "complete" })} disabled={busyId === g._id}
                      className="flex items-center justify-center gap-1 text-[11px] font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-3 py-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                      <IconCheck size={12} /> Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {doneGoals.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#6b7a99] mb-2">Completed 🎉</h2>
            <div className="space-y-2">
              {doneGoals.map((g) => (
                <div key={g._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <IconCheck size={12} className="text-emerald-400" />
                  </div>
                  <p className="text-[12px] font-bold text-[#e4e1e9] truncate flex-1">{g.title}</p>
                  <span className="text-[10px] text-[#6b7a99] flex-shrink-0">
                    {g.type === "DAILY" ? "daily" : g.deadline ? new Date(g.deadline).toLocaleDateString() : ""}
                  </span>
                  <button onClick={() => deleteGoal(g._id)} className="text-[#6b7a99] hover:text-red-400 transition-colors flex-shrink-0">
                    <IconTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Goal Modal ─────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-[#16161c] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black flex items-center gap-2"><IconTarget size={16} className="text-primary" /> New Goal</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Goal *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
                  placeholder="e.g. Solve 2 DSA problems"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setType("DAILY")}
                  className={cn("text-[10px] font-black uppercase rounded-xl px-2 py-2.5 border transition-colors",
                    type === "DAILY" ? "bg-primary text-white border-primary" : "text-[#6b7a99] border-white/[0.08] hover:border-primary/30")}>
                  Daily habit
                </button>
                <button onClick={() => setType("DEADLINE")}
                  className={cn("text-[10px] font-black uppercase rounded-xl px-2 py-2.5 border transition-colors",
                    type === "DEADLINE" ? "bg-primary text-white border-primary" : "text-[#6b7a99] border-white/[0.08] hover:border-primary/30")}>
                  Deadline
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Target *</label>
                  <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] outline-none focus:border-primary/40 transition-colors tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] outline-none focus:border-primary/40 transition-colors [&>option]:bg-[#16161c]">
                    {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              {type === "DEADLINE" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Deadline *</label>
                  <input type="date" min={todayStr} value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] outline-none focus:border-primary/40 transition-colors [color-scheme:dark]" />
                </div>
              )}
            </div>

            <button onClick={createGoal} disabled={creating || !title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
              {creating ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={15} />}
              {creating ? "Creating…" : "Create goal"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
