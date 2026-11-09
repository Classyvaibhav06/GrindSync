"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition?: () => void;
};

function spawnRippleRings(x: number, y: number) {
  if (typeof document === "undefined") return;
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const ring = document.createElement("div");
    ring.className = "theme-ripple-ring";
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.style.animationDelay = `${i * 90}ms`;
    document.body.appendChild(ring);
    window.setTimeout(() => ring.remove(), 1400 + i * 90);
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after client mount
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <div className={`theme-toggle-skeleton ${className ?? ""}`} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    const root = document.documentElement;
    const wb = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as ViewTransitionDocument;

    if (!doc.startViewTransition || wb) {
      setTheme(next);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const hasPoint = Number.isFinite(e.clientX) && (e.clientX !== 0 || e.clientY !== 0);
    const x = hasPoint ? e.clientX : rect.left + rect.width / 2;
    const y = hasPoint ? e.clientY : rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 20;

    root.style.setProperty("--ripple-x", `${x}px`);
    root.style.setProperty("--ripple-y", `${y}px`);
    root.style.setProperty("--ripple-radius", `${radius}px`);

    const update = () => {
      // next-themes owns the `dark`/`light` class on <html> — setTheme() schedules
      // the React state update; toggling the class here as well guarantees the
      // view-transition snapshot sees the new theme synchronously.
      setTheme(next);
      root.classList.toggle("dark", next === "dark");
      root.classList.toggle("light", next === "light");
    };

    try {
      const transition = doc.startViewTransition(update);
      transition.ready
        .then(() => spawnRippleRings(x, y))
        .catch(() => undefined);
    } catch {
      update();
    }
  };

  return (
    <button
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={`theme-toggle ${className ?? ""}`}
      data-mode={isDark ? "dark" : "light"}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {isDark ? (
          /* Sun */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          /* Moon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
    </button>
  );
}
