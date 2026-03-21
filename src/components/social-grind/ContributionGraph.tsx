"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconBrandGithub, IconFlame, IconLoader2, IconX } from "@tabler/icons-react";

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
interface TooltipState {
  x: number;
  y: number;
  date: string;   // "2026-03-22"
  count: number;
}

export default function ContributionGraph({ userId, githubUsername }: Props) {
  const [weeks, setWeeks] = useState<ContributionDay[][]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format "2026-03-22" → "Sunday, Mar 22, 2026"
  const formatDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
  };

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

  // Auto-scroll to the rightmost (most recent) area on load
  useEffect(() => {
    if (weeks.length > 0 && !loading && containerRef.current) {
      const scrollToRight = () => {
        if (containerRef.current) {
          // Scroll to maximum possible width smoothly
          containerRef.current.scrollTo({
            left: containerRef.current.scrollWidth + 1000,
            behavior: "smooth"
          });
        }
      };
      // Try scrolling immediately, then again slightly later to guarantee
      // that React has fully committed the DOM layout for the cells.
      const t1 = setTimeout(scrollToRight, 50);
      const t2 = setTimeout(scrollToRight, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [weeks, loading]);

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
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setTooltip(null);
            }}
          >
            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-[9999] w-max rounded-lg shadow-2xl transition-all duration-200 pointer-events-none"
                style={{
                  left: Math.min(Math.max(tooltip.x, 60), (containerRef.current?.scrollWidth || 1000) - 60),
                  // Very tight offset for the new tiny footprint
                  top: tooltip.y - 42,
                  transform: "translateX(-50%)",
                  background: "rgba(17,17,22,0.7)", // Decreased transparency
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}
              >
                {/* Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-[4px] w-[8px] h-[8px] rotate-45"
                  style={{ background: "rgba(17,17,22,0.7)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "none", borderLeft: "none", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }} />

                <div className="px-2.5 py-1.5 flex flex-col items-center">
                  <p className="text-[10px] font-bold text-[#e4e1e9] leading-tight flex items-center gap-1">
                    {tooltip.count > 0 ? (
                      <>{tooltip.count} contribution{tooltip.count !== 1 && "s"}</>
                    ) : (
                      "No contributions"
                    )}
                  </p>
                  <p className="text-[8px] text-[#6b7a99] font-medium tracking-tight whitespace-nowrap">
                    {formatDate(tooltip.date)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-1 min-w-max pr-8">
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
                      {week.map((day) => {
                        return (
                          <div
                            key={day.date}
                            data-dot="true"
                            className="w-[11px] h-[11px] rounded-[3px] cursor-pointer transition-all duration-150 hover:scale-125 relative"
                            style={{
                              backgroundColor: LEVEL_COLORS[day.level],
                              boxShadow: LEVEL_GLOW[day.level] || "none",
                            }}
                            onMouseEnter={(e) => {
                              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                              
                              const target = e.target as HTMLElement;
                              hoverTimeoutRef.current = setTimeout(() => {
                                const rect = target.getBoundingClientRect();
                                const parentRect = containerRef.current?.getBoundingClientRect();
                                if (!parentRect || !containerRef.current) return;
                                setTooltip({
                                  x: rect.left - parentRect.left + containerRef.current.scrollLeft + rect.width / 2,
                                  y: rect.top - parentRect.top + containerRef.current.scrollTop,
                                  date: day.date,
                                  count: day.count,
                                });
                              }, 200);
                            }}
                            onMouseLeave={() => {
                              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            }}
                          />
                        );
                      })}
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
