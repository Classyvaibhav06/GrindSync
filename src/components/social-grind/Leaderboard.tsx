"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";

/* ── Types ─────────────────────────────────────────── */
interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  username: string;
  image: string;
  points: number;
  completedCount: number;
}

/* ── Tier Config ──────────────────────────────────── */
const TIER_CONFIG = [
  { min: 5000, label: "Legend",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { min: 2000, label: "Diamond",  badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { min: 800,  label: "Platinum", badge: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { min: 350,  label: "Gold",     badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { min: 0,    label: "Grinder",  badge: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
];
function getTier(pts: number) { return TIER_CONFIG.find(t => pts >= t.min)!; }

/* ── Medal themes for top 3 ──────────────────────── */
const MEDAL = {
  1: {
    emoji: "👑",
    label: "1st Place",
    accentBar: "from-amber-400 via-yellow-300 to-amber-500",
    ringColor: "ring-amber-400/70",
    glowShadow: "0 0 28px rgba(245,158,11,0.25)",
    cardBg: "#1f1f24",
    avatarSize: "w-14 h-14",
    nameSize: "text-[15px]",
  },
  2: {
    emoji: "🥈",
    label: "2nd Place",
    accentBar: "from-slate-300 via-gray-200 to-slate-400",
    ringColor: "ring-slate-300/60",
    glowShadow: "0 0 20px rgba(148,163,184,0.18)",
    cardBg: "#1b1b20",
    avatarSize: "w-12 h-12",
    nameSize: "text-sm",
  },
  3: {
    emoji: "🥉",
    label: "3rd Place",
    accentBar: "from-orange-400 via-amber-500 to-orange-500",
    ringColor: "ring-orange-400/60",
    glowShadow: "0 0 18px rgba(217,119,6,0.15)",
    cardBg: "#1a1a1e",
    avatarSize: "w-11 h-11",
    nameSize: "text-sm",
  },
} as const;

/* ── Skeleton row ────────────────────────────────── */
function SkeletonRow({ i }: { i: number }) {
  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl" style={{ animationDelay: `${i * 70}ms` }}>
      <div className="w-7 h-5 bg-white/[0.04] rounded-md animate-pulse" />
      <div className="w-9 h-9 rounded-full bg-white/[0.04] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/[0.04] rounded-full animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
        <div className="h-2.5 bg-white/[0.04] rounded-full animate-pulse w-20" />
      </div>
      <div className="w-14 h-5 bg-white/[0.04] rounded-full animate-pulse" />
    </div>
  );
}

/* ── Top 3 Card (vertical) ───────────────────────── */
function TopCard({ entry, pos, isMe }: { entry: LeaderboardEntry; pos: 1 | 2 | 3; isMe: boolean }) {
  const m = MEDAL[pos];
  const tier = getTier(entry.points);

  return (
    <Link href={`/profile/${entry.id}`} className="block group">
      <div
        className={cn(
          "relative flex items-center gap-4 rounded-2xl p-4 transition-all duration-300",
          "hover:translate-y-[-1px]",
          isMe && "ring-1 ring-primary/30"
        )}
        style={{
          backgroundColor: m.cardBg,
          boxShadow: m.glowShadow,
        }}
      >
        {/* Accent bar */}
        <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b", m.accentBar)} />

        {/* Rank + medal */}
        <div className="flex flex-col items-center gap-0.5 pl-2 w-9 flex-shrink-0">
          <span className="text-base" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.5))" }}>{m.emoji}</span>
          <span className="text-[9px] font-black text-[#6b7a99] uppercase tracking-widest">{pos === 1 ? "1ST" : pos === 2 ? "2ND" : "3RD"}</span>
        </div>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className={cn(m.avatarSize, "ring-2 ring-offset-2 ring-offset-[#0e0e13]", m.ringColor, "transition-transform group-hover:scale-105")}>
            <AvatarImage src={entry.image} />
            <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Name + username */}
        <div className="flex-1 min-w-0">
          <p className={cn(m.nameSize, "font-black text-[#e4e1e9] truncate leading-tight group-hover:text-primary transition-colors")}>
            {entry.name}
            {isMe && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-primary/70">you</span>}
          </p>
          <p className="text-[10px] text-[#6b7a99] font-semibold truncate mt-0.5">@{entry.username}</p>
        </div>

        {/* Tier badge */}
        <Badge className={cn("border text-[9px] font-black uppercase tracking-wider px-2 py-0.5 hidden sm:flex flex-shrink-0", tier.badge)}>
          {tier.label}
        </Badge>

        {/* XP */}
        <div className="text-right flex-shrink-0 pl-2">
          <p className="text-sm font-black text-[#e4e1e9] tabular-nums">{entry.points.toLocaleString()}</p>
          <p className="text-[9px] text-[#6b7a99] font-bold uppercase tracking-wider">XP</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Main Component ──────────────────────────────── */
export default function Leaderboard() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        if (data.leaderboard) setEntries(data.leaderboard);
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const myId = session?.user?.id;

  return (
    <div className="relative rounded-[2rem] overflow-hidden bg-[#1b1b20]">
      {/* ── Ambient glow blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-violet-600/[0.08] blur-[80px]" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-600/[0.08] blur-[70px]" />
      </div>

      {/* ── Header ── */}
      <div className="relative px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">🏆</span>
            <h3 className="text-lg font-black tracking-tight text-[#e4e1e9]">Leaderboard</h3>
          </div>
          <p className="text-[10px] text-[#6b7a99] font-black uppercase tracking-[0.15em]">
            Top Grinders This Season
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* ── Top 3 Podium (vertical, stacked) ── */}
      {!loading && entries.length >= 3 && (
        <div className="relative px-4 space-y-2 pb-4">
          <TopCard entry={entries[0]} pos={1} isMe={entries[0].id === myId} />
          <TopCard entry={entries[1]} pos={2} isMe={entries[1].id === myId} />
          <TopCard entry={entries[2]} pos={3} isMe={entries[2].id === myId} />
        </div>
      )}

      {/* ── Gradient divider ── */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ── Ranks 4+ list ── */}
      <div className="relative px-4 py-3 space-y-0.5">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} i={i} />)
        ) : entries.slice(3).length === 0 && entries.length > 0 ? (
          <p className="text-xs text-[#6b7a99] text-center py-4">Only top 3 grinders so far!</p>
        ) : (
          entries.slice(3).map((entry) => {
            const tier = getTier(entry.points);
            const isMe = entry.id === myId;
            return (
              <Link
                key={entry.id}
                href={`/profile/${entry.id}`}
                onMouseEnter={() => setHovered(entry.rank)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 p-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isMe
                    ? "bg-primary/[0.08] border border-primary/20"
                    : "border border-transparent hover:bg-white/[0.03]",
                  hovered === entry.rank && !isMe && "bg-white/[0.03]"
                )}
              >
                {/* Rank */}
                <div className="w-7 text-center flex-shrink-0">
                  <span className="text-xs font-black text-[#6b7a99] tabular-nums">#{entry.rank}</span>
                </div>

                {/* Avatar */}
                <Avatar className={cn("w-9 h-9 ring-2 ring-offset-1 ring-offset-[#1b1b20] transition-transform group-hover:scale-105", isMe ? "ring-primary/40" : "ring-white/[0.08]")}>
                  <AvatarImage src={entry.image} />
                  <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold truncate leading-tight transition-colors", isMe ? "text-primary" : "text-[#e4e1e9] group-hover:text-primary")}>
                    {entry.name}
                    {isMe && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-primary/70">you</span>}
                  </p>
                  <p className="text-[10px] text-[#6b7a99] font-semibold truncate">@{entry.username}</p>
                </div>

                {/* Tier badge */}
                <Badge className={cn("border text-[9px] font-black uppercase tracking-wider px-2 py-0.5 hidden sm:flex flex-shrink-0", tier.badge)}>
                  {tier.label}
                </Badge>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-[#e4e1e9] tabular-nums">{entry.points.toLocaleString()}</p>
                  <p className="text-[9px] text-[#6b7a99] font-bold uppercase tracking-wider">XP</p>
                </div>
              </Link>
            );
          })
        )}

        {!loading && entries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">🏗️</p>
            <p className="text-sm font-bold text-[#6b7a99]">No grinders yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
