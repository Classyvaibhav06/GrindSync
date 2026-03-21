"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/social-grind/FloatingNav";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconMapPin, IconCalendarEvent, IconLink, IconTrophy,
  IconCode, IconStar, IconX, IconPencil, IconPhoto, IconCheck,
  IconMessageCircle, IconBrandGithub, IconGitFork, IconLoader2,
  IconExternalLink, IconUserPlus, IconUserMinus, IconArrowLeft,
} from "@tabler/icons-react";
import ContributionGraph from "@/components/social-grind/ContributionGraph";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home",    link: "/home" },
  { name: "Chat",    link: "/chat" },
  { name: "Discover",link: "/users" },
  { name: "Network", link: "/network" },
];

/* ─── Preset banners ──────────────────────────────────── */
const PRESET_BANNERS = [
  { id: "gradient-1", style: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",                         label: "Cosmic" },
  { id: "gradient-2", style: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",                         label: "Deep Ocean" },
  { id: "gradient-3", style: "linear-gradient(135deg, #2547f4, #7c3aed, #ec4899)",                         label: "Neon Sunrise" },
  { id: "gradient-4", style: "linear-gradient(135deg, #0d1b2a, #1b4332, #1e3a5f)",                         label: "Dark Forest" },
  { id: "gradient-5", style: "linear-gradient(135deg, #3d0000, #7f0000, #ff4500)",                         label: "Inferno" },
  { id: "gradient-6", style: "linear-gradient(135deg, #0a0a0a, #1a1a1a, #2d2d2d)",                         label: "Midnight" },
  { id: "gradient-7", style: "linear-gradient(135deg, #003153, #006994, #0099cc)",                         label: "Azure" },
  { id: "gradient-8", style: "linear-gradient(135deg, #1a0533, #4a0e8f, #7b2fff)",                         label: "Purple Rain" },
  { id: "mesh-1",     style: "radial-gradient(circle at 20% 50%,#2547f4 0%,transparent 50%),radial-gradient(circle at 80% 20%,#7c3aed 0%,transparent 50%),#0f0c29", label: "Mesh Glow" },
  { id: "mesh-2",     style: "radial-gradient(circle at 50% 0%,#ff4500 0%,transparent 60%),radial-gradient(circle at 80% 100%,#2547f4 0%,transparent 60%),#0a0a0a",  label: "Fire & Ice" },
];

function getBannerStyle(banner: string) {
  const preset = PRESET_BANNERS.find(b => b.id === banner);
  if (preset) return { background: preset.style };
  if (banner?.startsWith("data:") || banner?.startsWith("http"))
    return { backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: "radial-gradient(ellipse at top right, #2547f4 0%, transparent 60%), radial-gradient(ellipse at bottom left, #7c3aed 0%, transparent 60%), #0a0a12" };
}

/* ─── Shared input style ──────────────────────────────── */
const INPUT = "w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 px-4 text-sm font-medium text-[#e4e1e9] placeholder-[#6b7a99] focus:outline-none focus:border-primary/50 transition-colors";

/* ─── Banner Picker Modal ─────────────────────────────── */
function BannerPickerModal({ currentBanner, userId, onClose, onSaved }: {
  currentBanner: string; userId: string; onClose: () => void; onSaved: (b: string) => void;
}) {
  const [selected, setSelected] = useState(currentBanner);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr("Image must be under 2 MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setSelected(reader.result as string); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/users/${userId}/banner`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banner: selected }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      onSaved(selected);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#111116] border border-white/[0.08] rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06]">
          <h2 className="text-xl font-black tracking-tight text-[#e4e1e9]">Choose Banner</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#6b7a99] hover:text-[#e4e1e9] transition-all no-min-size">
            <IconX size={18} />
          </button>
        </div>
        <div className="mx-7 mt-6 h-32 rounded-xl overflow-hidden" style={getBannerStyle(selected)}>
          <div className="w-full h-full opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "24px 24px" }} />
        </div>
        <div className="px-7 py-6 space-y-5">
          {err && <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-2">{err}</p>}
          <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99]">Preset Gradients</p>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_BANNERS.map(b => (
              <button key={b.id} title={b.label} onClick={() => setSelected(b.id)}
                className={cn("h-12 rounded-xl overflow-hidden relative transition-all no-min-size", selected === b.id ? "ring-2 ring-primary scale-105 shadow-lg shadow-primary/20" : "hover:scale-105 opacity-70 hover:opacity-100")}
                style={{ background: b.style }}>
                {selected === b.id && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><IconCheck size={16} className="text-white" /></div>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7a99]">or upload</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-white/[0.10] rounded-2xl py-5 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group">
            <IconPhoto size={24} className="text-[#6b7a99] group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold text-[#6b7a99] group-hover:text-[#e4e1e9] transition-colors">{uploading ? "Processing…" : "Upload image (max 2 MB)"}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex items-center justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-bold text-[#6b7a99] hover:text-[#e4e1e9] hover:bg-white/[0.05] transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving || uploading}
              className="px-6 py-2.5 rounded-full text-sm font-black text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
              {saving ? "Saving…" : "Apply Banner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Profile Modal ──────────────────────────────── */
function EditProfileModal({ profile, userId, onClose, onSaved }: {
  profile: any; userId: string; onClose: () => void; onSaved: (updated: any) => void;
}) {
  const [form, setForm] = useState({ name: profile.name || "", username: profile.username || "", bio: profile.bio || "", location: profile.location || "", website: profile.website || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wtApiKey, setWtApiKey] = useState(profile.wakatimeApiKey || "");
  const [ghUsername, setGhUsername] = useState(profile.githubUsername || "");
  const [lcUsername, setLcUsername] = useState(profile.leetcodeUsername || "");
  const [lcSaving, setLcSaving] = useState(false);
  const [lcMsg, setLcMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, wakatimeApiKey: wtApiKey.trim(), githubUsername: ghUsername.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved({ ...form, wakatimeApiKey: wtApiKey, githubUsername: ghUsername, leetcodeUsername: lcUsername });
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  const saveLcUsername = async () => {
    if (!lcUsername.trim()) return; setLcSaving(true); setLcMsg(null);
    try {
      const res = await fetch("/api/dsa/set-username", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leetcodeUsername: lcUsername.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setLcMsg({ text: `✓ @${data.leetcodeUsername} verified!`, ok: true });
    } catch (e: any) { setLcMsg({ text: e.message, ok: false }); } finally { setLcSaving(false); }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99]">{label}</label>{children}</div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111116] border border-white/[0.08] rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] sticky top-0 bg-[#111116] z-10">
          <h2 className="text-xl font-black tracking-tight text-[#e4e1e9]">Edit Profile</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#6b7a99] hover:text-[#e4e1e9] transition-all no-min-size">
            <IconX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {err && <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-2">{err}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display Name *"><input name="name" value={form.name} onChange={handleChange} required className={INPUT} /></Field>
            <Field label="Username">
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7a99] text-sm font-mono">@</span>
                <input name="username" value={form.username} onChange={handleChange} className={cn(INPUT, "pl-8")} />
              </div>
            </Field>
          </div>
          <Field label="Bio"><textarea name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Tell the world what you're grinding on…" className={cn(INPUT, "resize-none")} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="📍 Location"><input name="location" value={form.location} onChange={handleChange} placeholder="City, Country" className={INPUT} /></Field>
            <Field label="🔗 Website"><input name="website" value={form.website} onChange={handleChange} placeholder="https://yoursite.dev" className={INPUT} /></Field>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] pt-5 space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99]">Integrations</p>

            <Field label="⚡ LeetCode Username · for daily DSA auto-verify">
              <div className="flex gap-2">
                <input value={lcUsername} onChange={e => { setLcUsername(e.target.value); setLcMsg(null); }} placeholder="e.g. vaibhav_ghoshi" className={cn(INPUT, "flex-1")} />
                <button type="button" onClick={saveLcUsername} disabled={lcSaving || !lcUsername.trim()}
                  className="px-4 rounded-xl text-xs font-black text-yellow-400 border border-yellow-500/30 bg-yellow-500/[0.08] hover:bg-yellow-500/[0.15] transition-colors disabled:opacity-40 flex-shrink-0">
                  {lcSaving ? <IconLoader2 size={14} className="animate-spin" /> : lcMsg?.ok ? <IconCheck size={14} className="text-emerald-400" /> : "Verify"}
                </button>
              </div>
              {lcMsg && <p className={cn("text-[10px] px-3 py-1.5 rounded-lg mt-1", lcMsg.ok ? "text-emerald-400 bg-emerald-500/[0.08]" : "text-red-400 bg-red-500/[0.08]")}>{lcMsg.text}</p>}
            </Field>

            <Field label="🔵 WakaTime Secret API Key · for coding time tracking">
              <input type="password" value={wtApiKey} onChange={e => setWtApiKey(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={INPUT} />
              <p className="text-[10px] text-[#6b7a99] mt-1">Get your key from <a href="https://wakatime.com/settings/account" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WakaTime Settings</a>.</p>
            </Field>

            <Field label="⬛ GitHub Username · for commit tracking & repos">
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7a99] text-sm font-mono">@</span>
                <input value={ghUsername} onChange={e => setGhUsername(e.target.value.replace(/^@/, ""))} placeholder="e.g. vaibhav06" className={cn(INPUT, "pl-8")} />
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-bold text-[#6b7a99] hover:text-[#e4e1e9] hover:bg-white/[0.05] transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-full text-sm font-black text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Language color map ──────────────────────────────── */
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", Ruby: "#701516", Swift: "#ffac45", Kotlin: "#A97BFF",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051",
};

/* ─── Tier helper ─────────────────────────────────────── */
const TIERS = [
  { min: 5000, label: "Legend",   color: "#f59e0b", emoji: "👑" },
  { min: 2000, label: "Diamond",  color: "#22d3ee", emoji: "💎" },
  { min: 800,  label: "Platinum", color: "#a78bfa", emoji: "🏆" },
  { min: 350,  label: "Gold",     color: "#fbbf24", emoji: "🥇" },
  { min: 0,    label: "Grinder",  color: "#64748b", emoji: "⚡" },
];
function getTier(xp: number) { return TIERS.find(t => xp >= t.min)!; }

/* ─── Main Profile Page ───────────────────────────────── */
export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [reposGhUsername, setReposGhUsername] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const topLanguages = useMemo(() => {
    if (!repos.length) return [];
    const counts: Record<string, number> = {};
    for (const repo of repos) if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([lang, count]) => ({ lang, count, pct: Math.round((count / max) * 100), repoPct: Math.round((count / repos.length) * 100) }));
  }, [repos]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`/api/users/${profile.useProfile.id}/avatar`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setProfile((prev: any) => ({ ...prev, useProfile: { ...prev.useProfile, image: base64 } }));
      } catch (err: any) { alert(err.message); } finally { setAvatarUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!id) return;
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${id}`);
        const data = await res.json();
        if (res.ok) {
          setProfile(data);
          if (data.useProfile?.githubUsername) {
            setReposLoading(true);
            try {
              const rRes = await fetch(`/api/github/repos?userId=${id}`);
              const rData = await rRes.json();
              setRepos(rData.repos || []);
              setReposGhUsername(rData.githubUsername || null);
              if (rData.error && rData.error !== "NO_GITHUB") {
                setReposError(rData.error === "GITHUB_RATE_LIMIT" ? "GitHub API rate limit reached." : rData.error === "GITHUB_NOT_FOUND" ? "GitHub username not found." : "Could not load repos.");
              }
            } catch { setReposError("Network error."); } finally { setReposLoading(false); }
          }
        } else setError(data.error || "Failed to load profile");
      } catch { setError("Network error"); } finally { setLoading(false); }
    }
    fetchProfile();
  }, [id]);

  const toggleFollow = async () => {
    if (!profile) return;
    setProfile((prev: any) => ({ ...prev, useProfile: { ...prev.useProfile, isFollowing: !prev.useProfile.isFollowing, followersCount: prev.useProfile.isFollowing ? prev.useProfile.followersCount - 1 : prev.useProfile.followersCount + 1 } }));
    try {
      const res = await fetch(`/api/users/${id}/follow`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch {
      setProfile((prev: any) => ({ ...prev, useProfile: { ...prev.useProfile, isFollowing: !prev.useProfile.isFollowing, followersCount: prev.useProfile.isFollowing ? prev.useProfile.followersCount - 1 : prev.useProfile.followersCount + 1 } }));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0e0e13]"><div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#0e0e13] text-red-400 text-sm">{error}</div>;
  if (!profile?.useProfile) return <div className="min-h-screen flex items-center justify-center bg-[#0e0e13] text-[#6b7a99]">Profile not found</div>;

  const { useProfile, isOwner } = profile;
  const xp   = useProfile.challengeStats?.totalPoints ?? 0;
  const tier = getTier(xp);

  return (
    <div className="min-h-screen bg-[#0e0e13] text-[#e4e1e9] font-sans">
      <FloatingNav navItems={navItems} />

      {/* Modals */}
      {editOpen && <EditProfileModal profile={useProfile} userId={useProfile.id} onClose={() => setEditOpen(false)}
        onSaved={updated => { setProfile((prev: any) => ({ ...prev, useProfile: { ...prev.useProfile, ...updated } })); setEditOpen(false); }} />}
      {bannerOpen && <BannerPickerModal currentBanner={useProfile.banner || ""} userId={useProfile.id} onClose={() => setBannerOpen(false)}
        onSaved={banner => { setProfile((prev: any) => ({ ...prev, useProfile: { ...prev.useProfile, banner } })); setBannerOpen(false); }} />}

      {/* Hidden avatar input */}
      {isOwner && <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />}

      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/[0.06] blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/[0.06] blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-[900px] mx-auto pt-20 sm:pt-24 pb-20 px-3 sm:px-5 lg:px-0 relative z-10">

        {/* Back */}
        <button onClick={() => window.history.length > 2 ? window.history.back() : (window.location.href = "/users")}
          className="mb-5 flex items-center gap-2 text-[#6b7a99] hover:text-[#e4e1e9] text-sm font-bold transition-colors no-min-size">
          <IconArrowLeft size={16} /> Back
        </button>

        {/* ── Profile Header ─────────────────────────────── */}
        <div className="rounded-[2rem] overflow-hidden mb-6 bg-[#111116]" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>

          {/* Banner */}
          <div className="h-40 sm:h-52 relative group" style={getBannerStyle(useProfile.banner)}>
            {/* dot grid */}
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "28px 28px" }} />
            {/* fade bottom */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#111116] to-transparent" />
            {/* Change banner button */}
            {isOwner && (
              <button onClick={() => setBannerOpen(true)}
                className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/[0.08] no-min-size">
                <IconPhoto size={13} /> Change Banner
              </button>
            )}
          </div>

          {/* Profile info area */}
          <div className="px-5 sm:px-8 pb-7 relative">
            {/* Avatar row */}
            <div className="flex items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0 z-20">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-[#111116]"
                  style={{ boxShadow: "0 0 0 2px rgba(37,71,244,0.5), 0 0 20px rgba(37,71,244,0.2)" }}>
                  {useProfile.image ? (
                    <img src={useProfile.image} alt={useProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black" style={{ background: "linear-gradient(135deg,#2547f4,#7c3aed)" }}>
                      {useProfile.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => avatarFileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-110 transition-transform border-2 border-[#111116] no-min-size">
                    {avatarUploading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <IconPencil size={13} />}
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1">
                {!isOwner ? (
                  <>
                    <button onClick={toggleFollow}
                      className={cn("flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all",
                        useProfile.isFollowing
                          ? "bg-white/[0.05] border border-white/[0.10] text-[#e4e1e9] hover:border-red-500/40 hover:text-red-400"
                          : "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90")}>
                      {useProfile.isFollowing ? <><IconUserMinus size={15} />Unfollow</> : <><IconUserPlus size={15} />Follow</>}
                    </button>
                    <Link href={`/chat?user=${useProfile.id}`}>
                      <button className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-black border border-white/[0.10] text-[#e4e1e9] hover:border-primary/40 hover:bg-primary/[0.05] transition-all">
                        <IconMessageCircle size={15} />Message
                      </button>
                    </Link>
                  </>
                ) : (
                  <button onClick={() => setEditOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black bg-white/[0.05] border border-white/[0.10] text-[#e4e1e9] hover:border-primary/40 hover:bg-primary/[0.05] transition-all">
                    <IconPencil size={14} />Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Name + handle */}
            <div className="mb-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none text-[#e4e1e9]">{useProfile.name}</h1>
              <p className="text-sm sm:text-base font-mono text-primary mt-1">@{useProfile.username || useProfile.name}</p>
            </div>

            {/* Bio */}
            {useProfile.bio && (
              <p className="text-sm text-[#9ca3af] leading-relaxed max-w-xl mb-4">{useProfile.bio}</p>
            )}
            {!useProfile.bio && isOwner && (
              <button onClick={() => setEditOpen(true)} className="text-xs text-[#6b7a99] hover:text-primary transition-colors mb-4 no-min-size">
                + Add a bio
              </button>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-5">
              {useProfile.location && (
                <span className="flex items-center gap-1.5 text-xs text-[#6b7a99] font-medium">
                  <IconMapPin size={13} />{useProfile.location}
                </span>
              )}
              {useProfile.website && (
                <a href={useProfile.website.startsWith("http") ? useProfile.website : `https://${useProfile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#6b7a99] font-medium hover:text-primary transition-colors">
                  <IconLink size={13} />{useProfile.website.replace(/https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1.5 text-xs text-[#6b7a99] font-medium">
                <IconCalendarEvent size={13} />Joined Mar 2026
              </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-5">
              <Link href={`/network?id=${useProfile.id}`}>
                <div className="group cursor-pointer">
                  <span className="text-lg sm:text-xl font-black text-[#e4e1e9] group-hover:text-primary transition-colors">{useProfile.followersCount}</span>
                  <span className="text-sm text-[#6b7a99] font-bold ml-1.5">Followers</span>
                </div>
              </Link>
              <Link href={`/network?id=${useProfile.id}`}>
                <div className="group cursor-pointer">
                  <span className="text-lg sm:text-xl font-black text-[#e4e1e9] group-hover:text-primary transition-colors">{useProfile.followingCount}</span>
                  <span className="text-sm text-[#6b7a99] font-bold ml-1.5">Following</span>
                </div>
              </Link>
            </div>

            {/* Tier + stat chips */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black"
                style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30`, color: tier.color }}>
                {tier.emoji} {tier.label} Tier
              </div>
              {useProfile.githubUsername && (
                <a href={`https://github.com/${useProfile.githubUsername}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black bg-white/[0.04] border border-white/[0.08] text-[#6b7a99] hover:text-[#e4e1e9] hover:border-white/[0.15] transition-colors no-min-size">
                  <IconBrandGithub size={13} />@{useProfile.githubUsername}
                </a>
              )}
              {useProfile.leetcodeUsername && (
                <a href={`https://leetcode.com/${useProfile.leetcodeUsername}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black bg-yellow-500/[0.08] border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/[0.15] transition-colors no-min-size">
                  ⚡ LC: {useProfile.leetcodeUsername}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="h-12 w-full flex bg-[#111116] rounded-2xl p-1" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
            {["activity", "projects", "badges"].map(tab => (
              <TabsTrigger key={tab} value={tab}
                className="flex-1 rounded-xl h-full text-xs sm:text-sm font-bold capitalize text-[#6b7a99] data-[state=active]:bg-[#1b1b20] data-[state=active]:text-[#e4e1e9] data-[state=active]:shadow-sm transition-all">
                {tab === "activity" ? "Overview" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────── */}
          <TabsContent value="activity" className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Left — Activity + Graph */}
              <div className="md:col-span-2 space-y-4">
                {/* Recent Activity */}
                <div className="bg-[#111116] rounded-2xl p-5" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { icon: "⚡", text: "Completed challenge \"Code for 30 Minutes\"", time: "2h ago" },
                      { icon: "🔥", text: "Maintained a 7-day coding streak", time: "1d ago" },
                      { icon: "⭐", text: "Joined GrindSync community", time: "3d ago" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 text-base">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#c4c5d9] truncate">{item.text}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#6b7a99] flex-shrink-0">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contribution Graph */}
                <ContributionGraph userId={useProfile.id} githubUsername={useProfile.githubUsername} />
              </div>

              {/* Right — Rankings + Languages */}
              <div className="space-y-4">
                {/* Rankings */}
                <div className="bg-[#111116] rounded-2xl p-5" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-4">Tier</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                      {tier.emoji}
                    </div>
                    <div>
                      <p className="text-xl font-black" style={{ color: tier.color }}>{tier.label}</p>
                      <p className="text-[10px] text-[#6b7a99] font-medium mt-0.5">{xp.toLocaleString()} XP total</p>
                    </div>
                  </div>
                </div>

                {/* Top Languages */}
                <div className="bg-[#111116] rounded-2xl p-5" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99]">Top Languages</p>
                    {repos.length > 0 && <span className="text-[9px] text-[#6b7a99] font-mono">{repos.length} repos</span>}
                  </div>
                  {reposLoading ? (
                    <div className="flex items-center gap-2 text-[#6b7a99] py-2"><IconLoader2 size={14} className="animate-spin" /><span className="text-xs">Analysing…</span></div>
                  ) : !useProfile.githubUsername ? (
                    <div className="py-2 space-y-1">
                      <p className="text-xs text-[#6b7a99]">Link GitHub to see language stats.</p>
                      {isOwner && <button onClick={() => setEditOpen(true)} className="text-[11px] text-primary hover:underline no-min-size">Link now →</button>}
                    </div>
                  ) : topLanguages.length === 0 ? (
                    <p className="text-xs text-[#6b7a99] py-2">No language data in public repos.</p>
                  ) : (
                    <div className="space-y-4">
                      {topLanguages.map(({ lang, count, pct, repoPct }, idx) => {
                        const color = LANG_COLORS[lang] || "#8b949e";
                        return (
                          <div key={lang} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-sm font-bold text-[#e4e1e9]">{lang}</span>
                                {idx === 0 && <span className="text-[9px] font-black text-primary border border-primary/20 bg-primary/10 rounded-full px-1.5 py-0.5">#1</span>}
                              </div>
                              <span className="text-[10px] font-bold text-[#6b7a99] tabular-nums">{count}r · {repoPct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}55` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Projects Tab ─────────────────────────────── */}
          <TabsContent value="projects">
            {!useProfile.githubUsername ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 bg-[#111116] rounded-[1.5rem]" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                <IconBrandGithub size={40} className="text-[#6b7a99] opacity-40" />
                <div className="text-center">
                  <h3 className="text-lg font-black text-[#e4e1e9]">No GitHub linked</h3>
                  <p className="text-sm text-[#6b7a99] mt-1">{useProfile.name.split(" ")[0]} hasn&apos;t linked their GitHub yet.</p>
                </div>
                {isOwner && <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black border border-white/[0.10] text-[#e4e1e9] hover:border-primary/40 hover:bg-primary/[0.05] transition-all"><IconBrandGithub size={15} />Link GitHub</button>}
              </div>
            ) : reposLoading ? (
              <div className="flex items-center justify-center gap-3 py-16"><IconLoader2 size={22} className="animate-spin text-primary" /><span className="text-[#6b7a99] font-medium">Loading repos…</span></div>
            ) : reposError ? (
              <div className="text-center py-12 bg-red-500/[0.05] rounded-[1.5rem] border border-red-500/20"><p className="text-red-400 text-sm">{reposError}</p></div>
            ) : repos.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 bg-[#111116] rounded-[1.5rem]" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                <IconBrandGithub size={36} className="text-[#6b7a99] opacity-40" />
                <p className="text-sm text-[#6b7a99]">No public repos yet — start grinding!</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <IconBrandGithub size={16} className="text-[#6b7a99]" />
                  <h3 className="text-sm font-black text-[#e4e1e9]">{reposGhUsername}&apos;s Projects</h3>
                  <a href={`https://github.com/${reposGhUsername}`} target="_blank" rel="noopener noreferrer" className="no-min-size">
                    <IconExternalLink size={13} className="text-[#6b7a99] hover:text-[#e4e1e9] transition-colors" />
                  </a>
                  <span className="text-[10px] text-[#6b7a99] font-mono ml-auto">{repos.length} repos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {repos.map(repo => (
                    <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer"
                      className="group block p-4 rounded-xl bg-[#111116] hover:bg-[#1b1b1f] transition-all"
                      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconBrandGithub size={14} className="text-[#6b7a99] flex-shrink-0" />
                          <span className="font-black text-sm text-[#e4e1e9] truncate group-hover:text-primary transition-colors">{repo.name}</span>
                        </div>
                        <IconExternalLink size={12} className="text-[#6b7a99] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      {repo.description && <p className="text-xs text-[#6b7a99] line-clamp-2 mb-3 leading-relaxed">{repo.description}</p>}
                      {repo.topics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {repo.topics.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-[#6b7a99]">
                        {repo.language && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] || "#8b949e" }} />
                            <span className="font-bold">{repo.language}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1"><IconStar size={11} /><span className="font-bold">{repo.stars}</span></div>
                        <div className="flex items-center gap-1"><IconGitFork size={11} /><span className="font-bold">{repo.forks}</span></div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Badges Tab ───────────────────────────────── */}
          <TabsContent value="badges">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { emoji: "⚡", label: "First Grind", desc: "Completed your first challenge" },
                { emoji: "🔥", label: "On Fire",     desc: "3-day coding streak" },
                { emoji: "💎", label: "Diamond Coder", desc: "2000+ XP Earned" },
                { emoji: "🏆", label: "Podium",      desc: "Top 10 Leaderboard" },
              ].map(badge => (
                <div key={badge.label} className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#111116] hover:bg-[#1b1b20] transition-colors cursor-pointer group"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform block">{badge.emoji}</span>
                  <p className="text-sm font-black text-[#e4e1e9] mb-1">{badge.label}</p>
                  <p className="text-[10px] text-[#6b7a99] font-medium leading-snug">{badge.desc}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
