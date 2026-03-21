"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconBrandGithub, IconFlame, IconLoader2 } from "@tabler/icons-react";

/* ── Types ─────────────────────────────────────────── */
interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/* ── Level → color map ──────────────────────────────── */
const LEVEL_COLORS: Record<number, string> = {
  0: "rgba(255,255,255,0.06)",
  1: "#166534",
  2: "#15803d",
  3: "#16a34a",
  4: "#22c55e",
};

const LEVEL_GLOW: Record<number, string> = {
  4: "0 0 8px rgba(34,197,94,0.45)",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" };

/* ── Streak calculations ────────────────────────────── */
function calcStreaks(weeks: ContributionDay[][]) {
  const flat = weeks.flat().sort((a, b) => a.date.localeCompare(b.date));
  let current = 0, longest = 0, run = 0;

  // current streak — walk backwards from today
  const today = new Date().toISOString().slice(0, 10);
  for (let i = flat.length - 1; i >= 0; i--) {
    const d = flat[i];
    // Allow up to 1 day gap for "today hasn't ended yet"
    if (d.count > 0) {
      current++;
    } else if (d.date < today) {
      break;
    }
  }

  // longest streak
  for (const d of flat) {
    if (d.count > 0) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return { current, longest };
}

/* ── Props ──────────────────────────────────────────── */
interface Props {
  userId: string;
  githubUsername?: string | null;
}

/* ── Component ──────────────────────────────────────── */
export default function ContributionGraph({ userId, githubUsername }: Props) {
  const [weeks, setWeeks] = useState<ContributionDay[][]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !githubUsername) return;
    setLoading(true);
    setError(null);
    fetch(`/api/github/contributions?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && data.error !== "NO_GITHUB") {
          if (data.error === "NO_TOKEN") {
            setError("Add GITHUB_TOKEN to enable contribution graph.");
          } else if (data.error === "GITHUB_NOT_FOUND") {
            setError("GitHub user not found.");
          } else {
            setError("Could not load contributions.");
          }
        } else {
          setWeeks(data.weeks || []);
          setTotal(data.total || 0);
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [userId, githubUsername]);

  /* ── Month label positions ──────────────────────────── */
  const monthLabels = useMemo(() => {
    if (!weeks.length) return [];
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wIdx) => {
      const firstDay = week[0];
      if (!firstDay) return;
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], weekIdx: wIdx });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const streaks = useMemo(() => calcStreaks(weeks), [weeks]);

  const totalDaysWithActivity = useMemo(
    () => weeks.flat().filter((d) => d.count > 0).length,
    [weeks]
  );

  const avgPerDay = useMemo(() => {
    if (!totalDaysWithActivity) return "0";
    return (total / Math.max(totalDaysWithActivity, 1)).toFixed(1);
  }, [total, totalDaysWithActivity]);

  /* ── No GitHub ──────────────────────────────────────── */
  if (!githubUsername) return null;

  return (
    <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-border/60 bg-card/30 backdrop-blur-xl space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBrandGithub className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Contribution Activity
          </span>
        </div>
        {!loading && !error && total > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tabular-nums">
              {total.toLocaleString()} contributions this year
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
          <IconLoader2 className="w-5 h-5 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Loading contribution data…</span>
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-xs text-muted-foreground/60 font-medium">{error}</p>
        </div>
      ) : weeks.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs text-muted-foreground/60 font-medium">No contribution data found.</p>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div
            ref={containerRef}
            className="relative heatmap-scroll pb-1"
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg bg-card border border-border/80 shadow-xl text-[11px] font-bold whitespace-nowrap"
                style={{ left: tooltip.x, top: tooltip.y - 36, transform: "translateX(-50%)" }}
              >
                {tooltip.text}
              </div>
            )}

            <div className="flex gap-1 min-w-max">
              {/* Day-of-week labels */}
              <div className="flex flex-col justify-around pb-5 pr-1" style={{ gap: "3px" }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="text-[9px] font-bold text-muted-foreground/50 leading-none"
                    style={{ height: "11px", lineHeight: "11px" }}
                  >
                    {DAY_LABELS[dayIdx] || ""}
                  </div>
                ))}
              </div>

              {/* Grid + month labels */}
              <div className="flex flex-col">
                {/* Month labels row */}
                <div className="relative h-5 mb-1" style={{ width: weeks.length * 14 }}>
                  {monthLabels.map(({ label, weekIdx }) => (
                    <span
                      key={`${label}-${weekIdx}`}
                      className="absolute text-[9px] font-bold text-muted-foreground/50 top-0"
                      style={{ left: weekIdx * 14 }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Cell grid */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          className="w-[11px] h-[11px] rounded-[3px] cursor-pointer transition-transform hover:scale-125"
                          style={{
                            backgroundColor: LEVEL_COLORS[day.level],
                            boxShadow: LEVEL_GLOW[day.level] || "none",
                          }}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const parentRect = containerRef.current?.getBoundingClientRect();
                            if (!parentRect) return;
                            setTooltip({
                              x: rect.left - parentRect.left + rect.width / 2,
                              y: rect.top - parentRect.top,
                              text: `${day.count} contribution${day.count !== 1 ? "s" : ""} on ${day.date}`,
                            });
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 justify-end mt-3">
              <span className="text-[9px] text-muted-foreground/50 font-bold">Less</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <div
                  key={lvl}
                  className="w-[11px] h-[11px] rounded-[3px]"
                  style={{
                    backgroundColor: LEVEL_COLORS[lvl],
                    boxShadow: LEVEL_GLOW[lvl] || "none",
                  }}
                />
              ))}
              <span className="text-[9px] text-muted-foreground/50 font-bold">More</span>
            </div>
          </div>

          {/* Stats pills */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3">
            <StatPill
              icon={<IconFlame className="w-3.5 h-3.5 text-orange-400" />}
              label="Current Streak"
              value={`${streaks.current} day${streaks.current !== 1 ? "s" : ""}`}
              highlight={streaks.current > 0}
            />
            <StatPill
              icon={<span className="text-xs">🏆</span>}
              label="Longest Streak"
              value={`${streaks.longest} day${streaks.longest !== 1 ? "s" : ""}`}
            />
            <StatPill
              icon={<span className="text-xs">⚡</span>}
              label="Avg / Active Day"
              value={`${avgPerDay} commits`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Stat Pill sub-component ──────────────────────────── */
function StatPill({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 p-3 rounded-2xl backdrop-blur-md transition-all ${
        highlight
          ? "bg-emerald-500/10 border border-emerald-500/20"
          : "bg-secondary/40 border border-border/40"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="text-sm font-black tabular-nums group-hover:text-emerald-400 transition-colors">
        {value}
      </span>
    </div>
  );
}
