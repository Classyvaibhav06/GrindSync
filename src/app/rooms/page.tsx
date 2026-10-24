"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconVideo, IconPlus, IconUsers, IconFlame, IconX, IconLoader2,
  IconHandStop, IconPlayerPlay, IconRadio,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { AppShell } from "@/components/social-grind/AppShell";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Room {
  code: string;
  name: string;
  topic: string;
  description: string;
  techTags: string[];
  hostId: string;
  hostName: string;
  hostImage: string | null;
  participantCount: number;
  helpCount: number;
  createdAt: string;
}

// Short-lived client cache so navigating back to /rooms repaints instantly.
let _roomsCache: { rooms: Room[]; timestamp: number } | null = null;

const TOPIC_SUGGESTIONS = ["DSA", "Web Dev", "System Design", "Hackathon", "Revision", "Mock Interview"];

export default function RoomsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>(_roomsCache?.rooms ?? []);
  const [loading, setLoading] = useState(!_roomsCache);
  const [showCreate, setShowCreate] = useState(false);

  /* create form state */
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (_roomsCache && Date.now() - _roomsCache.timestamp < 5000) {
      setRooms(_roomsCache.rooms);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to load rooms");
      const d = await res.json();
      setRooms(d.rooms ?? []);
      _roomsCache = { rooms: d.rooms ?? [], timestamp: Date.now() };
    } catch (err) {
      console.error("Rooms fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => {
    const t = setInterval(fetchRooms, 10_000);
    return () => clearInterval(t);
  }, [fetchRooms]);

  const createRoom = async () => {
    if (!name.trim()) { toast.error("Give your room a name"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          topic,
          description,
          techTags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create room");
      _roomsCache = null;
      toast.success("Room is live — invite your friends!");
      router.push(`/rooms/${d.room.code}`);
    } catch (err: any) {
      toast.error(err.message || "Could not create room");
      setCreating(false);
    }
  };

  return (
    <AppShell title="Study Rooms">
      <div className="space-y-4 sm:space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">Live Study Rooms</h1>
            <p className="text-xs text-[#6b7a99] mt-0.5">
              Grind together on video — solve problems live, ask for help anytime.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}
          >
            <IconPlus size={15} /> <span className="hidden xs:inline">Create Room</span><span className="xs:hidden">Create</span>
          </button>
        </div>

        {/* Rooms grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="h-4 w-2/3 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-9 bg-white/[0.03] rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-[#1b1b20] rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <IconRadio size={26} className="text-primary" />
            </div>
            <h2 className="text-sm font-black">No live rooms right now</h2>
            <p className="text-xs text-[#6b7a99] max-w-xs leading-relaxed">
              Be the first — spin up a room, share the link, and study together on video.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors"
            >
              Start a room →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {rooms.map((room) => (
              <div key={room.code}
                className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:bg-[#1f1f26] transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                      </span>
                      {room.hostId === session?.user?.id && (
                        <span className="text-[9px] font-black text-primary border border-primary/20 bg-primary/10 rounded-full px-1.5 py-0.5">Your room</span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-[#e4e1e9] truncate mt-1">{room.name}</h3>
                    {room.topic && <p className="text-[11px] text-[#6b7a99] truncate">{room.topic}</p>}
                  </div>
                  {room.helpCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-1 flex-shrink-0">
                      <IconHandStop size={10} /> {room.helpCount} need help
                    </span>
                  )}
                </div>

                {room.description && (
                  <p className="text-[11px] text-[#6b7a99] leading-relaxed line-clamp-2">{room.description}</p>
                )}

                {room.techTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.techTags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-1.5 py-0.5">{t}</span>
                    ))}
                    {room.techTags.length > 4 && (
                      <span className="text-[9px] font-bold text-[#6b7a99]">+{room.techTags.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                  <span className={cn("flex items-center gap-1.5 text-[11px] font-bold",
                    room.participantCount > 0 ? "text-emerald-400" : "text-[#6b7a99]")}>
                    <IconUsers size={12} /> {room.participantCount} studying
                  </span>
                  <button
                    onClick={() => { _roomsCache = null; router.push(`/rooms/${room.code}`); }}
                    className="flex items-center gap-1.5 text-[11px] font-black text-white bg-primary/90 hover:bg-primary px-3 py-1.5 rounded-full transition-all hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <IconPlayerPlay size={12} /> Join
                  </button>
                </div>

                <p className="text-[9px] text-[#6b7a99]">Hosted by {room.hostName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Room Modal ─────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-[#16161c] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black flex items-center gap-2"><IconVideo size={16} className="text-primary" /> Create a Study Room</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Room name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Late night DSA grind"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Graphs & DP"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {TOPIC_SUGGESTIONS.map((t) => (
                    <button key={t} onClick={() => setTopic(t)}
                      className="text-[9px] font-bold text-[#6b7a99] hover:text-primary border border-white/[0.08] hover:border-primary/30 rounded-full px-2 py-1 transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="What are you working on?"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6b7a99] mb-1.5 block">Tech tags (comma separated)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="react, nodejs, dsa"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-bold text-[#e4e1e9] placeholder:text-[#6b7a99]/50 outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={createRoom}
              disabled={creating || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}
            >
              {creating ? <IconLoader2 size={16} className="animate-spin" /> : <IconFlame size={15} />}
              {creating ? "Starting room…" : "Go Live"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
