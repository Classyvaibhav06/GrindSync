"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  IconArrowLeft, IconUsers, IconHandStop, IconDoorExit, IconPower,
  IconCrown, IconCopy, IconLoader2, IconVideo, IconFlame,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { AppShell } from "@/components/social-grind/AppShell";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Participant {
  userId: string;
  name: string;
  username: string;
  image: string | null;
  joinedAt: string;
  needsHelp: boolean;
}
interface RoomDetail {
  code: string;
  name: string;
  topic: string;
  description: string;
  techTags: string[];
  hostId: string;
  hostName: string;
  isActive: boolean;
  createdAt: string;
  participants: Participant[];
  participantCount: number;
}

// meet.jit.si is the free public Jitsi server — swap for JaaS or a self-hosted
// instance later by changing only this constant.
const JITSI_BASE = "https://meet.jit.si";

export default function RoomPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(true);
  const [helpLoading, setHelpLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const joinedRef = useRef(false);

  const isHost = !!room && room.hostId === session?.user?.id;
  const me = room?.participants.find((p) => p.userId === session?.user?.id);

  /* ── join + presence + polling ─────────────────── */
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error("Failed to load room");
      const d = await res.json();
      setRoom(d.room);
      setNotFound(false);
    } catch (err) {
      console.error("Room fetch error:", err);
    }
  }, [code]);

  useEffect(() => {
    if (!session?.user?.id || !code || joinedRef.current) return;
    joinedRef.current = true;
    setJoining(true);
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
        if (!res.ok) { setNotFound(true); setJoining(false); return; }
        await fetchRoom();
      } finally {
        setJoining(false);
      }
    })();
  }, [session?.user?.id, code, fetchRoom]);

  useEffect(() => {
    const t = setInterval(fetchRoom, 10_000);
    return () => clearInterval(t);
  }, [fetchRoom]);

  // Presence heartbeat every 30s; rejoin automatically if dropped.
  useEffect(() => {
    if (!session?.user?.id || !code) return;
    const beat = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/heartbeat`, { method: "POST" });
        const d = await res.json();
        if (d?.inRoom === false) await fetch(`/api/rooms/${code}/join`, { method: "POST" });
      } catch { /* transient — next beat retries */ }
    };
    beat();
    const t = setInterval(beat, 30_000);
    return () => clearInterval(t);
  }, [session?.user?.id, code]);

  // Leave when the tab closes (sendBeacon survives page unload).
  useEffect(() => {
    if (!session?.user?.id || !code) return;
    const onHide = () => {
      navigator.sendBeacon(`/api/rooms/${code}/leave`);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [session?.user?.id, code]);

  // Leave on unmount (navigating away within the SPA).
  useEffect(() => {
    if (!code) return;
    return () => {
      fetch(`/api/rooms/${code}/leave`, { method: "POST", keepalive: true }).catch(() => {});
    };
  }, [code]);

  /* ── actions ───────────────────────────────────── */
  const toggleHelp = async () => {
    setHelpLoading(true);
    try {
      const res = await fetch(`/api/rooms/${code}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsHelp: !me?.needsHelp }),
      });
      if (!res.ok) throw new Error();
      await fetchRoom();
      toast.success(!me?.needsHelp ? "Help request sent — someone will join you" : "Help request cleared");
    } catch {
      toast.error("Could not update help flag");
    } finally {
      setHelpLoading(false);
    }
  };

  const leaveRoom = async () => {
    setLeaving(true);
    try { await fetch(`/api/rooms/${code}/leave`, { method: "POST" }); } catch { /* ignore */ }
    router.push("/rooms");
  };

  const endRoom = async () => {
    if (!confirm("End this room for everyone?")) return;
    setLeaving(true);
    try {
      await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      toast.success("Room ended");
      router.push("/rooms");
    } catch {
      toast.error("Could not end the room");
      setLeaving(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (notFound) {
    return (
      <AppShell title="Study Rooms">
        <div className="bg-[#1b1b20] rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-3 text-center">
          <IconVideo size={28} className="text-[#6b7a99] opacity-40" />
          <h2 className="text-sm font-black">Room not found or already ended</h2>
          <Link href="/rooms" className="text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
            ← Back to rooms
          </Link>
        </div>
      </AppShell>
    );
  }

  const jitsiUrl = `${JITSI_BASE}/GrindSync-${code}#config.prejoinPageEnabled=false&config.startWithVideoMuted=false`;

  return (
    <AppShell title={room ? room.name : "Study Room"}>
      {joining || !room ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Room header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/rooms" className="text-[#6b7a99] hover:text-[#e4e1e9] transition-colors flex-shrink-0">
                <IconArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                  </span>
                  <h1 className="text-base sm:text-lg font-black tracking-tight truncate">{room.name}</h1>
                </div>
                <p className="text-[11px] text-[#6b7a99] truncate">
                  {room.topic && `${room.topic} · `}Hosted by {room.hostName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={copyInvite}
                className="flex items-center gap-1.5 text-[11px] font-black text-[#6b7a99] hover:text-[#e4e1e9] border border-white/[0.08] hover:border-primary/30 rounded-full px-3 py-2 transition-colors">
                <IconCopy size={13} /> Invite
              </button>
              {isHost ? (
                <button onClick={endRoom} disabled={leaving}
                  className="flex items-center gap-1.5 text-[11px] font-black text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-2 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                  <IconPower size={13} /> End Room
                </button>
              ) : (
                <button onClick={leaveRoom} disabled={leaving}
                  className="flex items-center gap-1.5 text-[11px] font-black text-[#6b7a99] hover:text-red-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-2 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  <IconDoorExit size={13} /> Leave
                </button>
              )}
            </div>
          </div>

          {/* Video + participants */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#1b1b20] rounded-2xl p-2 sm:p-3">
                <iframe
                  src={jitsiUrl}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  className="w-full h-[55vh] min-h-[340px] rounded-xl border-0 bg-black"
                  title={`Video call for ${room.name}`}
                />
              </div>

              {room.description && (
                <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
                  <p className="text-xs text-[#6b7a99] leading-relaxed">{room.description}</p>
                  {room.techTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {room.techTags.map((t) => (
                        <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 h-fit">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <IconUsers size={14} className="text-primary" /> In the room
                </h2>
                <span className="text-[10px] font-black text-emerald-400">{room.participantCount}</span>
              </div>

              {me && (
                <button
                  onClick={toggleHelp}
                  disabled={helpLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all",
                    me.needsHelp
                      ? "text-orange-400 bg-orange-400/10 border border-orange-400/30 hover:bg-orange-400/20"
                      : "text-white bg-primary/90 hover:bg-primary"
                  )}
                >
                  {helpLoading ? <IconLoader2 size={14} className="animate-spin" /> : <IconHandStop size={14} />}
                  {me.needsHelp ? "Cancel help request" : "I'm stuck — need help!"}
                </button>
              )}

              <div className="space-y-1.5">
                {room.participants.length === 0 && (
                  <p className="text-[11px] text-[#6b7a99] py-3 text-center">Nobody here yet…</p>
                )}
                {room.participants.map((p) => (
                  <div key={p.userId} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#1b1b20]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#e4e1e9] truncate flex items-center gap-1">
                        {p.name}
                        {p.userId === room.hostId && <IconCrown size={11} className="text-amber-400 flex-shrink-0" />}
                      </p>
                      {p.username && <p className="text-[9px] text-[#6b7a99] truncate">@{p.username}</p>}
                    </div>
                    {p.needsHelp && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                        <IconFlame size={9} /> help
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-[#6b7a99] leading-relaxed pt-1">
                Video runs on Jitsi inside GrindSync. Mic & camera controls are in the player.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
