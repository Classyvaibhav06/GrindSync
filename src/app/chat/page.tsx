"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  IconSearch,
  IconMessageCircle,
  IconArrowLeft,
  IconDots,
  IconSend2,
  IconEdit,
} from "@tabler/icons-react";
import { toast } from "sonner";

/* ─── Types ──────────────────────────────────────── */
interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  partnerImage: string | null;
  isOnline: boolean;
  lastMessage: string;
  lastAt: string;
  unread: number;
}
interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}
interface Partner {
  id: string;
  name: string;
  username: string;
  image: string | null;
  isOnline: boolean;
  isTyping?: boolean;
}
interface Friend {
  _id: string;
  name: string;
  username: string;
  image: string | null;
  isOnline: boolean;
}

/* ─── Helpers ────────────────────────────────────── */
function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatMsgTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ─── Avatar Component ──────────────────────────── */
function Avatar({
  image, name, size = "md", hasStory = false, isOnline = false,
}: {
  image: string | null; name: string; size?: "xs" | "sm" | "md" | "lg" | "xl";
  hasStory?: boolean; isOnline?: boolean;
}) {
  const szMap     = { xs: "w-6 h-6",  sm: "w-8 h-8",  md: "w-14 h-14", lg: "w-16 h-16", xl: "w-20 h-20" };
  const txMap     = { xs: "text-[9px]", sm: "text-xs", md: "text-base", lg: "text-xl",   xl: "text-2xl"  };
  const dotSz     = { xs: "w-2 h-2",  sm: "w-2 h-2",  md: "w-3 h-3",  lg: "w-3.5 h-3.5", xl: "w-4 h-4" };
  const dotBorder = { xs: "border",   sm: "border",    md: "border-2", lg: "border-2",  xl: "border-2"   };
  const ringPad   = hasStory ? "p-[2.5px]" : "p-[1.5px]";
  const ringColor = hasStory
    ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
    : "bg-transparent";

  return (
    <div className="relative shrink-0 select-none">
      <div className={cn(szMap[size], ringPad, "rounded-full", ringColor)}>
        <div className={cn("w-full h-full rounded-full overflow-hidden bg-[#1c1c1e] border border-white/[0.05]")}>
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-600 to-blue-500", txMap[size])}>
              {name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
      {isOnline && (
        <div className={cn(dotSz[size], dotBorder[size], "absolute -bottom-0.5 -right-0.5 rounded-full bg-green-400 border-black")} />
      )}
    </div>
  );
}

const playNotificationSound = () => {
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

/* ═══════════════════════════════════════════════════
   MAIN CHAT PAGE
═══════════════════════════════════════════════════ */
export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat_conversations");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [friends, setFriends]             = useState<Friend[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat_friends");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [loadingSidebar, setLoadingSidebar] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("chat_conversations");
    }
    return true;
  });
  const [activeChat, setActiveChat]       = useState<string | null>(initialUserId);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [partner, setPartner]             = useState<Partner | null>(null);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [hoveredConvo, setHoveredConvo]   = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const prevUnreadRef  = useRef<Record<string, number> | null>(null);
  const lastTypedRef   = useRef<number>(0);
  const messagesRef    = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /* ── Fetchers ── */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        const convos: Conversation[] = data.conversations || [];
        setConversations(convos);
        if (typeof window !== "undefined") localStorage.setItem("chat_conversations", JSON.stringify(convos));

        if (prevUnreadRef.current !== null) {
          let shouldPlaySound = false;
          convos.forEach(c => {
            const prevUnread = prevUnreadRef.current![c.partnerId] || 0;
            if (c.unread > prevUnread && c.partnerId !== activeChat) {
              shouldPlaySound = true;
              const snippet = c.lastMessage?.length > 40 ? c.lastMessage.slice(0, 40) + "..." : c.lastMessage;
              toast(c.partnerName, {
                description: snippet,
                action: {
                  label: "Reply",
                  onClick: () => {
                    openChat(c.partnerId, {
                      name: c.partnerName, username: c.partnerUsername, image: c.partnerImage, isOnline: c.isOnline
                    });
                  }
                }
              });
            }
          });
          if (shouldPlaySound) playNotificationSound();
        }
        
        // Update the refs dictionary
        const nextRefs: Record<string, number> = {};
        convos.forEach(c => { nextRefs[c.partnerId] = c.unread; });
        prevUnreadRef.current = nextRefs;
      }
    } catch {}
  }, [activeChat]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/users/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        if (typeof window !== "undefined") localStorage.setItem("chat_friends", JSON.stringify(data.friends || []));
      }
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs = data.messages || [];
        
        // Grab current messages from ref to avoid stale closures and state callback side-effects
        const prev = messagesRef.current;
        const newIncoming = newMsgs.filter((m: Message) => m.senderId !== session?.user?.id && !prev.some(p => p._id === m._id));
        
        if (newIncoming.length > 0 && prev.length > 0) {
          playNotificationSound();
          // The last message is inside data.messages[data.messages.length - 1]
          const lastM = newIncoming[newIncoming.length - 1];
          const snippet = lastM?.content?.length > 40 ? lastM.content.slice(0, 40) + "..." : lastM?.content;
          toast(data.partner?.name || "Message", {
             description: snippet,
             duration: 2000 // dismiss quickly since they are staring at it
          });
        }
        
        setMessages(newMsgs);
        if (data.partner) setPartner(data.partner);
      }
    } catch {} finally { setLoadingMsgs(false); }
  }, [session?.user?.id]);

  /**
   * openChat — call this instead of setActiveChat directly.
   * Immediately shows the correct chat header & clears stale
   * messages before the network request completes.
   */
  const openChat = useCallback((userId: string, preload?: {
    name: string; username: string; image: string | null; isOnline: boolean;
  }) => {
    setActiveChat(userId);
    setMessages([]);          // clear stale messages instantly
    setLoadingMsgs(true);     // show spinner right away
    if (preload) {
      setPartner({ id: userId, ...preload });
    } else {
      setPartner(null);
    }
    fetchMessages(userId);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [fetchMessages]);

  /* ── Initial load + polling ── */
  useEffect(() => {
    Promise.all([fetchConversations(), fetchFriends()]).then(() => {
      setLoadingSidebar(false);
    });
  }, [fetchConversations, fetchFriends]);

  useEffect(() => {
    const id = setInterval(() => { fetchConversations(); fetchFriends(); }, 10_000);
    return () => clearInterval(id);
  }, [fetchConversations, fetchFriends]);

  // On initial load (URL param), open the chat immediately
  useEffect(() => {
    if (initialUserId) fetchMessages(initialUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    const id = setInterval(() => fetchMessages(activeChat), 3000);
    return () => clearInterval(id);
  }, [activeChat, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send ── */
  const sendMessage = async () => {
    if (!input.trim() || !activeChat || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    const tempMsg: Message = {
      _id: `temp-${Date.now()}`,
      senderId: session!.user.id,
      receiverId: activeChat,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeChat, content }),
      });
      fetchMessages(activeChat);
      fetchConversations();
    } catch {} finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeChat && Date.now() - lastTypedRef.current > 2000) {
      lastTypedRef.current = Date.now();
      fetch(`/api/chat/${activeChat}/typing`, { method: "POST" }).catch(() => {});
    }
  };

  /* ── Loading / auth guard ── */
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;

  /* ── Derived data ── */
  const filteredConvos = conversations.filter(
    (c) =>
      c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.partnerUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Friends who are already in conversations (sorted: online first)
  const convoIds = new Set(conversations.map((c) => c.partnerId));
  const friendsNotInConvo = friends.filter((f) => !convoIds.has(f._id));

  // All friends sorted online-first for the stories strip
  const storiesFriends = [...friends].sort((a, b) =>
    a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1
  );

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <style>{`
        .ig-scroll::-webkit-scrollbar { display: none; }
        .ig-scroll { scrollbar-width: none; }
      `}</style>

      {/* ════════════════════════════
          SIDEBAR
      ════════════════════════════ */}
      <aside className={cn(
        "w-full md:w-[400px] flex flex-col border-r border-white/[0.06] bg-black shrink-0",
        activeChat && "hidden md:flex"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="flex items-center gap-2">
            <Link href="/home">
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                <IconArrowLeft className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </Link>
            <span className="text-xl font-bold">Messages</span>
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
            <IconEdit className="w-5 h-5 text-white" strokeWidth={1.8} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 bg-[#1c1c1e] rounded-2xl px-4 py-2.5">
            <IconSearch className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Instagram Stories-style Friends Strip ── */}
        {storiesFriends.length > 0 && (
          <div className="border-b border-white/[0.05] pb-4 pt-1">
            <div className="flex gap-4 overflow-x-auto px-5 ig-scroll">
              {storiesFriends.map((f) => (
                <button
                  key={f._id}
                  onClick={() => openChat(f._id, {
                    name: f.name, username: f.username, image: f.image, isOnline: f.isOnline,
                  })}
                  className={cn(
                    "flex flex-col items-center gap-2 min-w-[64px] group",
                    activeChat === f._id && "opacity-70"
                  )}
                >
                  {/* Story ring: gradient if online, grey if offline */}
                  <div className={cn(
                    "rounded-full p-[2.5px]",
                    f.isOnline
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-gradient-to-tr from-gray-600 to-gray-500"
                  )}>
                    <div className="w-[58px] h-[58px] rounded-full overflow-hidden bg-black border border-black">
                      {f.image ? (
                        <img src={f.image} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-purple-600 to-blue-500">
                          {f.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium truncate max-w-[60px] transition-colors",
                    activeChat === f._id ? "text-white" : "text-white/50 group-hover:text-white/80"
                  )}>
                    {f.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Conversation List ── */}
        <div className="flex-1 overflow-y-auto ig-scroll">
          {loadingSidebar ? (
            <div className="pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ opacity: 1 - i * 0.15 }}>
                  <div className="w-[52px] h-[52px] rounded-full bg-white/[0.04] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-28 h-3.5 rounded bg-white/[0.04] animate-pulse" />
                    <div className="w-44 h-3 rounded bg-white/[0.03] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvos.length === 0 && friendsNotInConvo.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-5 pb-16">
              <div className="w-20 h-20 rounded-full bg-[#1c1c1c] flex items-center justify-center">
                <IconMessageCircle className="w-10 h-10 text-white/15" strokeWidth={1.2} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-white/50">No messages yet</p>
                <p className="text-sm text-white/20">Start chatting with your friends above</p>
              </div>
              <Link href="/users">
                <button className="bg-[#0095f6] hover:bg-[#1aa3ff] text-white font-bold text-sm px-8 py-2.5 rounded-xl transition-colors">
                  Discover People
                </button>
              </Link>
            </div>
          ) : (
            <div className="pt-2">
              {/* Existing conversations */}
              {filteredConvos.map((c) => {
                const isActive  = activeChat === c.partnerId;
                const isHovered = hoveredConvo === c.partnerId;
                const firstName = c.partnerName.split(" ")[0];
                const preview   = c.lastMessage.length > 32 ? c.lastMessage.slice(0, 32) + "…" : c.lastMessage;

                return (
                  <button
                    key={c.partnerId}
                    onClick={() => openChat(c.partnerId, {
                      name: c.partnerName, username: c.partnerUsername, image: c.partnerImage, isOnline: c.isOnline,
                    })}
                    onMouseEnter={() => setHoveredConvo(c.partnerId)}
                    onMouseLeave={() => setHoveredConvo(null)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 transition-colors text-left relative",
                      isActive ? "bg-white/[0.04]" : isHovered ? "bg-white/[0.02]" : "bg-transparent"
                    )}
                  >
                    {/* Avatar — friends get the gradient story ring */}
                    {friends.some((f) => f._id === c.partnerId) ? (
                      <div className={cn("rounded-full p-[2px] shrink-0", c.isOnline
                        ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                        : "bg-gradient-to-tr from-gray-600 to-gray-500"
                      )}>
                        <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-black border border-black">
                          {c.partnerImage ? (
                            <img src={c.partnerImage} alt={c.partnerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-purple-600 to-blue-500">
                              {c.partnerName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Avatar image={c.partnerImage} name={c.partnerName} isOnline={c.isOnline} size="md" />
                    )}

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-[2px]">
                        <span className={cn("text-sm truncate", c.unread > 0 ? "font-bold text-white" : "font-medium text-white/75")}>
                          {c.partnerName}
                        </span>
                        <span className="text-[11px] text-white/25 shrink-0 font-normal">{timeAgo(c.lastAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[13px] truncate flex-1", c.unread > 0 ? "text-white font-medium" : "text-white/35")}>
                          {firstName} · {preview}
                        </span>
                        {c.unread > 0 && <div className="w-2 h-2 rounded-full bg-white shrink-0" />}
                      </div>
                    </div>

                    {/* Hover actions */}
                    {isHovered && (
                      <div className="shrink-0">
                        <IconDots className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Friends not yet messaged — show as "Suggested" */}
              {friendsNotInConvo.length > 0 && (
                <>
                  <p className="px-5 pt-5 pb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                    Friends · Start chatting
                  </p>
                  {friendsNotInConvo.map((f) => (
                    <button
                      key={f._id}
                      onClick={() => openChat(f._id, {
                        name: f.name, username: f.username, image: f.image, isOnline: f.isOnline,
                      })}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className={cn("rounded-full p-[2px] shrink-0",
                        f.isOnline
                          ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                          : "bg-gradient-to-tr from-gray-600 to-gray-500"
                      )}>
                        <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-black border border-black">
                          {f.image ? (
                            <img src={f.image} alt={f.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-purple-600 to-blue-500">
                              {f.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/80 truncate">{f.name}</p>
                        <p className={cn("text-xs font-medium", f.isOnline ? "text-green-400" : "text-white/30")}>
                          {f.isOnline ? "Active now" : "@" + (f.username || f.name)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#0095f6] shrink-0">Message</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ════════════════════════════
          CHAT AREA
      ════════════════════════════ */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-black",
        !activeChat && "hidden md:flex"
      )}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-24 h-24 rounded-full border border-white/[0.08] flex items-center justify-center">
              <IconMessageCircle className="w-12 h-12 text-white/15" strokeWidth={1} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/40">Your messages</p>
              <p className="text-sm text-white/20 mt-1">
                Select a conversation or click a friend above to start chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ─ Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-black shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setActiveChat(null); setMessages([]); setPartner(null); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors md:hidden"
                >
                  <IconArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                {partner && (
                  <Link href={`/profile/${partner.id}`} className="flex items-center gap-3">
                    {/* Friend? Show gradient ring */}
                    {friends.some((f) => f._id === partner.id) ? (
                      <div className={cn("rounded-full p-[2px] shrink-0",
                        partner.isOnline
                          ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                          : "bg-gradient-to-tr from-gray-600 to-gray-500"
                      )}>
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-black border border-black">
                          {partner.image ? (
                            <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-purple-600 to-blue-500">
                              {partner.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Avatar image={partner.image} name={partner.name} isOnline={partner.isOnline} size="sm" />
                    )}
                    <div>
                      <p className="text-sm font-bold leading-none">{partner.name}</p>
                      <p className="text-xs mt-0.5">
                        {partner.isTyping ? (
                          <span className="text-primary font-bold italic animate-pulse">Typing...</span>
                        ) : partner.isOnline ? (
                          <span className="text-green-400 font-medium">Active now</span>
                        ) : (
                          <span className="text-white/30">@{partner.username}</span>
                        )}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                <IconDots className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* ─ Messages */}
            <div className="flex-1 overflow-y-auto ig-scroll px-4 py-6 flex flex-col gap-0.5">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  {partner && (
                    friends.some((f) => f._id === partner.id) ? (
                      <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[3px]">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-black">
                          {partner.image
                            ? <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-purple-600 to-blue-500">{partner.name[0]}</div>
                          }
                        </div>
                      </div>
                    ) : (
                      <Avatar image={partner.image} name={partner.name} size="xl" />
                    )
                  )}
                  <div className="text-center">
                    <p className="text-base font-bold">{partner?.name}</p>
                    <p className="text-xs text-white/30 mt-1">@{partner?.username}</p>
                    <p className="text-sm text-white/25 mt-3">No messages yet — say hello! 👋</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMe  = msg.senderId === session.user.id;
                    const prev  = messages[i - 1];
                    const next  = messages[i + 1];
                    const sameAsPrev = prev?.senderId === msg.senderId;
                    const sameAsNext = next?.senderId === msg.senderId;

                    const showTs = i === 0 ||
                      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 15 * 60 * 1000;

                    const r = "1.3rem", s = "0.35rem";
                    const rrMe   = `${sameAsPrev ? s : r} ${sameAsPrev ? s : r} ${sameAsNext ? s : r} ${r}`;
                    const rrThem = `${sameAsPrev ? s : r} ${r} ${r} ${sameAsNext ? s : r}`;
                    const mt = sameAsPrev ? "mt-[2px]" : "mt-3";

                    return (
                      <React.Fragment key={msg._id}>
                        {showTs && (
                          <div className="flex justify-center py-5">
                            <span className="text-[11px] text-white/20 font-medium">
                              {formatMsgTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={cn("flex items-end gap-2", mt, isMe ? "justify-end" : "justify-start")}>
                          {/* Partner avatar on last bubble in group */}
                          {!isMe && (
                            <div className="w-7 shrink-0 self-end mb-[2px]">
                              {!sameAsNext ? (
                                friends.some((f) => f._id === partner?.id) ? (
                                  <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[1.5px]">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-black">
                                      {partner?.image
                                        ? <img src={partner.image} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-purple-600">{partner?.name[0]}</div>
                                      }
                                    </div>
                                  </div>
                                ) : (
                                  <Avatar image={partner?.image || null} name={partner?.name || "?"} size="xs" />
                                )
                              ) : <div className="w-7 h-7" />}
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[70%] px-4 py-2.5 text-[15px] leading-snug break-words",
                              isMe ? "bg-[#0095f6] text-white" : "bg-[#262626] text-white"
                            )}
                            style={{ borderRadius: isMe ? rrMe : rrThem }}
                          >
                            {msg.content}
                          </div>
                        </div>

                        {isMe && !sameAsNext && (
                          <div className="flex justify-end pr-1 mt-0.5">
                            <span className="text-[10px] text-white/20 font-medium">
                              {msg.read ? "Seen" : "Sent"}
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-2" />
                </>
              )}
            </div>

            {/* ─ Input */}
            <div className="shrink-0 px-4 py-3 border-t border-white/[0.05] bg-black">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center bg-transparent border border-white/[0.12] rounded-full px-5 py-2.5 gap-3 focus-within:border-white/20 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-all shrink-0",
                    input.trim()
                      ? "text-[#0095f6] hover:text-[#1aa3ff] scale-110"
                      : "text-white/15 cursor-default"
                  )}
                >
                  <IconSend2 className="w-6 h-6" strokeWidth={input.trim() ? 2.2 : 1.5} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
