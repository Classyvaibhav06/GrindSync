"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  username: string;
  image: string;
  points: number;
  completedCount: number;
}

const TIER_CONFIG = [
  {
    min: 5000,
    label: "Legend",
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/30",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  {
    min: 2000,
    label: "Diamond",
    color: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-500/30",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  {
    min: 800,
    label: "Platinum",
    color: "from-violet-400 to-purple-600",
    glow: "shadow-violet-500/30",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  {
    min: 350,
    label: "Gold",
    color: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/20",
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  {
    min: 0,
    label: "Grinder",
    color: "from-slate-400 to-slate-500",
    glow: "shadow-slate-500/20",
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
];

function getTier(points: number) {
  return TIER_CONFIG.find((t) => points >= t.min) ?? TIER_CONFIG[4];
}

const RANK_MEDALS: Record<
  number,
  { emoji: string; gradient: string; glow: string; ring: string }
> = {
  1: {
    emoji: "🥇",
    gradient: "from-amber-300 via-yellow-400 to-amber-500",
    glow: "0 0 20px rgba(245, 158, 11, 0.6)",
    ring: "ring-amber-400/60",
  },
  2: {
    emoji: "🥈",
    gradient: "from-slate-300 via-gray-200 to-slate-400",
    glow: "0 0 16px rgba(148, 163, 184, 0.5)",
    ring: "ring-slate-300/60",
  },
  3: {
    emoji: "🥉",
    gradient: "from-orange-400 via-amber-600 to-orange-500",
    glow: "0 0 16px rgba(217, 119, 6, 0.5)",
    ring: "ring-orange-400/60",
  },
};

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="w-8 text-center">
        <div className="w-6 h-5 bg-white/5 rounded-md mx-auto animate-pulse" />
      </div>
      <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div
          className="h-3.5 bg-white/5 rounded-full animate-pulse"
          style={{ width: `${50 + Math.random() * 30}%` }}
        />
        <div className="h-2.5 bg-white/5 rounded-full animate-pulse w-24" />
      </div>
      <div className="w-16 h-5 bg-white/5 rounded-full animate-pulse" />
    </div>
  );
}

export default function Leaderboard() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        if (data.leaderboard) {
          setEntries(data.leaderboard);
        }
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const currentUserId = session?.user?.id;

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden border border-white/[0.06] bg-card/30 backdrop-blur-sm">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-purple/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-brand-blue/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">🏆</span>
            <h3 className="text-lg font-black tracking-tight text-foreground">
              Leaderboard
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
            Top Grinders This Season
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 text-primary bg-primary/5 py-1 px-3 font-bold text-[10px] uppercase tracking-widest"
        >
          Live
        </Badge>
      </div>

      {/* Top 3 Podium (only when loaded and entries exist) */}
      {!loading && entries.length >= 3 && (
        <div className="relative px-4 pt-2 pb-6">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd Place */}
            <PodiumCard entry={entries[1]} position={2} />
            {/* 1st Place */}
            <PodiumCard entry={entries[0]} position={1} />
            {/* 3rd Place */}
            <PodiumCard entry={entries[2]} position={3} />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Ranks 4-10 list */}
      <div className="relative px-4 py-4 space-y-1">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <SkeletonRow key={i} index={i} />
            ))
          : entries.slice(3).map((entry, idx) => {
              const tier = getTier(entry.points);
              const isMe = entry.id === currentUserId;
              return (
                <Link
                  href={`/profile/${entry.id}`}
                  key={entry.id}
                  onMouseEnter={() => setHovered(entry.rank)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group cursor-pointer",
                    isMe
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-white/[0.04] border border-transparent",
                    hovered === entry.rank && !isMe && "bg-white/[0.04]"
                  )}
                  style={{
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  {/* Rank number */}
                  <div className="w-8 text-center flex-shrink-0">
                    <span className="text-sm font-black text-muted-foreground tabular-nums">
                      #{entry.rank}
                    </span>
                  </div>

                  {/* Avatar */}
                  <Avatar
                    className={cn(
                      "w-9 h-9 ring-2 ring-offset-1 ring-offset-background transition-transform group-hover:scale-105",
                      isMe ? "ring-primary/50" : "ring-white/10"
                    )}
                  >
                    <AvatarImage src={entry.image} />
                    <AvatarFallback className="text-xs font-bold">
                      {entry.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & username */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-bold truncate leading-tight transition-colors",
                        isMe
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {entry.name}
                      {isMe && (
                        <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-primary/70">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                      @{entry.username}
                    </p>
                  </div>

                  {/* Tier badge */}
                  <Badge
                    className={cn(
                      "border text-[9px] font-black uppercase tracking-wider px-2 py-0.5 hidden sm:flex",
                      tier.badge
                    )}
                  >
                    {tier.label}
                  </Badge>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {entry.points.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                      XP
                    </p>
                  </div>
                </Link>
              );
            })}

        {!loading && entries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">🏗️</p>
            <p className="text-sm font-bold text-muted-foreground">
              No grinders yet. Be the first!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  position,
}: {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
}) {
  const medal = RANK_MEDALS[position];
  const tier = getTier(entry.points);
  const heights: Record<number, string> = {
    1: "pb-0",
    2: "pb-4",
    3: "pb-6",
  };
  const scales: Record<number, string> = {
    1: "scale-100",
    2: "scale-95",
    3: "scale-90",
  };

  return (
    <Link
      href={`/profile/${entry.id}`}
      className={cn(
        "flex-1 max-w-[120px] flex flex-col items-center gap-2 text-center group cursor-pointer",
        heights[position],
        scales[position],
        "transition-transform hover:scale-[1.03] duration-300"
      )}
    >
      {/* Medal emoji */}
      <span className="text-2xl" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}>
        {medal.emoji}
      </span>

      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            "w-14 h-14 rounded-full p-0.5 bg-gradient-to-br",
            medal.gradient
          )}
          style={{ boxShadow: medal.glow }}
        >
          <Avatar
            className={cn(
              "w-full h-full ring-2 ring-offset-2 ring-offset-background",
              medal.ring
            )}
          >
            <AvatarImage src={entry.image} />
            <AvatarFallback className="text-sm font-bold">
              {entry.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Rank badge on avatar */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-gradient-to-br border-2 border-background",
            medal.gradient
          )}
        >
          {position}
        </div>
      </div>

      {/* Name */}
      <p className="text-xs font-black text-foreground truncate w-full leading-tight group-hover:text-primary transition-colors">
        {entry.name.split(" ")[0]}
      </p>

      {/* Points */}
      <div
        className={cn(
          "px-2.5 py-1 rounded-full bg-gradient-to-r text-[10px] font-black text-white",
          tier.color
        )}
      >
        {entry.points.toLocaleString()} XP
      </div>

      {/* Podium base */}
      <div
        className={cn(
          "w-full rounded-t-xl mt-1 opacity-60",
          position === 1 ? "h-10" : position === 2 ? "h-6" : "h-4",
          `bg-gradient-to-t ${medal.gradient}`
        )}
      />
    </Link>
  );
}
