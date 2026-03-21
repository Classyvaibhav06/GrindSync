"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell, IconX, IconUsers } from "@tabler/icons-react";

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH" });
  }

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      setTimeout(markAllRead, 1500); // mark read after user sees them
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
        title="Notifications"
      >
        <IconBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center leading-none shadow-lg shadow-primary/50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-card/95 border border-border rounded-3xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden z-[9999]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h3 className="font-black text-sm tracking-wide">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline font-bold">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                <IconBell className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n._id}
                  href={`/profile/${n.actorId}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-brand-blue to-brand-purple shrink-0 mt-0.5">
                    {n.actorImage ? (
                      <img src={n.actorImage} alt={n.actorName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {n.actorName?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-bold text-foreground">
                        {n.actorUsername ? `@${n.actorUsername}` : n.actorName}
                      </span>{" "}
                      <span className="text-muted-foreground">{n.message}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{timeAgo(n.createdAt)}</p>
                  </div>

                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-sm shadow-primary/50" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-border/50 text-center">
              <Link href="/network?tab=followers" onClick={() => setOpen(false)} className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5">
                <IconUsers className="w-3.5 h-3.5" />
                View all followers
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
