"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function GlobalGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect users without username to complete-profile
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (!session.user.username && pathname !== "/complete-profile" && pathname !== "/login" && pathname !== "/register") {
        router.push("/complete-profile");
      }
    }
  }, [status, session, router, pathname]);

  // Heartbeat — ping every 30 seconds to track online status
  useEffect(() => {
    if (status !== "authenticated") return;

    // Send initial heartbeat
    fetch("/api/users/heartbeat", { method: "POST" }).catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/users/heartbeat", { method: "POST" }).catch(() => {});
    }, 30_000);

    return () => clearInterval(interval);
  }, [status]);

  return <>{children}</>;
}
