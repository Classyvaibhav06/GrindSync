"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const ROUTES_TO_PREFETCH = [
  "/home",
  "/network",
  "/challenges",
  "/chat",
  "/profile",
  "/users",
  "/stats",
];

export function RoutePrefetcher() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // Only aggressively prefetch if authenticated
    if (status !== "authenticated") return;

    // Use requestIdleCallback if available to avoid blocking main thread during initial load
    const prefetchRoutes = () => {
      ROUTES_TO_PREFETCH.forEach((route) => {
        router.prefetch(route);
      });
    };

    let idleCallback: number | NodeJS.Timeout;

    if ("requestIdleCallback" in window) {
      idleCallback = window.requestIdleCallback(() => prefetchRoutes());
    } else {
      idleCallback = setTimeout(prefetchRoutes, 2000);
    }

    return () => {
      if ("requestIdleCallback" in window) {
        window.cancelIdleCallback(idleCallback as number);
      } else {
        clearTimeout(idleCallback as NodeJS.Timeout);
      }
    };
  }, [router, status]);

  return null;
}
