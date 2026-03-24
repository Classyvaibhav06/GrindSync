"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio block", e);
  }
};

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

  // Global Unread Messages Polling
  const prevUnreadRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    // We only poll if they are NOT inside the chat page, because chat handles it intimately there.
    if (status !== "authenticated" || pathname?.startsWith("/chat")) return;

    const checkMessages = async () => {
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await res.json();
          const convos = data.conversations || [];
          
          if (prevUnreadRef.current !== null) {
            let shouldPlaySound = false;
            convos.forEach((c: any) => {
              const prevUnread = prevUnreadRef.current![c.partnerId] || 0;
              if (c.unread > prevUnread) {
                shouldPlaySound = true;
                const snippet = c.lastMessage?.length > 40 ? c.lastMessage.slice(0, 40) + "..." : c.lastMessage;
                toast(c.partnerName, {
                  description: snippet,
                  action: {
                    label: "Reply",
                    onClick: () => router.push(`/chat?user=${c.partnerId}`)
                  }
                });
              }
            });
            if (shouldPlaySound) playNotificationSound();
          }

          const nextRefs: Record<string, number> = {};
          convos.forEach((c: any) => { nextRefs[c.partnerId] = c.unread; });
          prevUnreadRef.current = nextRefs;
        }
      } catch (err) {}
    };

    checkMessages();
    const notificationInterval = setInterval(checkMessages, 10_000);
    return () => clearInterval(notificationInterval);
  }, [status, pathname]);

  return <>{children}</>;
}
