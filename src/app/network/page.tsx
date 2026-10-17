"use client";

import React, { useEffect, useState } from "react";
import { FloatingNav } from "@/components/social-grind/FloatingNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IconUsers, IconHeart, IconUserPlus } from "@tabler/icons-react";

const navItems = [
  { name: "Home", link: "/home" },
  { name: "Chat", link: "/chat" },
  { name: "Discover", link: "/users" },
  { name: "Network", link: "/network" },
];

export default function NetworkPage() {
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [defaultTab, setDefaultTab] = useState("following");
  const router = useRouter();

  useEffect(() => {
    async function fetchNetwork() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryId = urlParams.get("id");
        const tab = urlParams.get("tab");
        if (queryId) setIsOwner(false);
        if (tab) setDefaultTab(tab);

        const res = await fetch(`/api/users/network${queryId ? `?id=${queryId}` : ""}`);
        const data = await res.json();

        if (res.ok) {
          setFollowers(data.followers || []);
          setFollowing(data.following || []);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch network.");
      } finally {
        setLoading(false);
      }
    }
    fetchNetwork();
  }, []);

  const handleUnfollow = async (userId: string) => {
    try {
      setFollowing((prev) => prev.filter((user) => user._id !== userId));
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to unfollow");
    } catch (err) {
      console.error(err);
    }
  };

  // Friends = mutual follows (I follow them AND they follow me)
  const friends = isOwner
    ? followers.filter((follower) =>
        following.some((f) => f._id === follower._id)
      )
    : [];

  return (
    <div className="min-h-screen bg-background p-8 pt-32 max-w-4xl mx-auto relative overflow-hidden">
      <FloatingNav navItems={navItems} />

      <Button
        variant="ghost"
        className="mb-8 rounded-full font-bold hover:bg-secondary/50 text-muted-foreground hover:text-foreground relative z-10"
        onClick={() => router.push("/home")}
      >
        ← Back to Dashboard
      </Button>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full pointer-events-none" />

      <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tight">
        {isOwner ? "Your Network" : "Network"}
      </h1>

      {loading && (
        <div className="flex justify-center items-center h-48">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-xl mb-4 font-mono">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <Tabs defaultValue={defaultTab} className="space-y-8 z-10 relative">
          <TabsList className={`bg-secondary/50 border border-border p-1.5 rounded-[1.5rem] h-14 w-full flex ${isOwner ? "max-w-lg" : "max-w-sm"}`}>
            {isOwner && (
              <TabsTrigger
                value="friends"
                className="flex-1 rounded-2xl h-full font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5"
              >
                <IconHeart className="w-4 h-4" />
                Friends ({friends.length})
              </TabsTrigger>
            )}
            <TabsTrigger
              value="followers"
              className="flex-1 rounded-2xl h-full font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5"
            >
              <IconUsers className="w-4 h-4" />
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="flex-1 rounded-2xl h-full font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5"
            >
              <IconUserPlus className="w-4 h-4" />
              Following ({following.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Friends Tab ── */}
          {isOwner && (
            <TabsContent value="friends" className="mt-8 space-y-4">
              {friends.length === 0 ? (
                <div className="text-center p-10 rounded-[2rem] border border-border bg-card/30 space-y-3">
                  <IconHeart className="w-12 h-12 text-muted-foreground opacity-40 mx-auto" />
                  <h3 className="font-black text-lg">No friends yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Friends are people who follow each other. Start by{" "}
                    <Link href="/users" className="text-primary hover:underline">discovering people</Link> and following them!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {friends.map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      badge="Friends"
                      actionBtn={
                        <Button
                          onClick={() => handleUnfollow(user._id)}
                          variant="outline"
                          className="rounded-full px-6 font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 transition-colors hidden md:flex"
                        >
                          Unfollow
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* ── Followers Tab ── */}
          <TabsContent value="followers" className="mt-8 space-y-4">
            {followers.length === 0 ? (
              <p className="text-muted-foreground bg-card/50 p-6 rounded-[2rem] border border-border text-center font-medium">
                {isOwner ? "You have no followers yet." : "No followers yet."}
              </p>
            ) : (
              <div className="grid gap-4">
                {followers.map((user) => {
                  const isMutual = following.some((f) => f._id === user._id);
                  return (
                    <UserCard
                      key={user._id}
                      user={user}
                      badge={isMutual ? "Friends" : undefined}
                      actionBtn={
                        isOwner && !isMutual ? (
                          <Button
                            onClick={async () => {
                              await fetch(`/api/users/${user._id}/follow`, { method: "POST" });
                              // add to following optimistically
                              setFollowing((prev) => [...prev, user]);
                            }}
                            className="rounded-full px-6 font-bold shadow-primary/20 shadow-md hidden md:flex"
                          >
                            Follow Back
                          </Button>
                        ) : (
                          <Button disabled variant="secondary" className="rounded-full px-6 font-bold hidden md:flex">
                            {isMutual ? "Friends ♥" : "Following You"}
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Following Tab ── */}
          <TabsContent value="following" className="mt-8 space-y-4">
            {following.length === 0 ? (
              <p className="text-muted-foreground bg-card/50 p-6 rounded-[2rem] border border-border text-center font-medium">
                {isOwner ? (
                  <>You aren&apos;t following anyone yet. Visit <Link href="/users" className="text-primary hover:underline">Discover</Link> to find friends!</>
                ) : "Not following anyone yet."}
              </p>
            ) : (
              <div className="grid gap-4">
                {following.map((user) => (
                  <UserCard
                    key={user._id}
                    user={user}
                    actionBtn={
                      isOwner && (
                        <Button
                          onClick={() => handleUnfollow(user._id)}
                          variant="outline"
                          className="rounded-full px-6 font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 transition-colors hidden md:flex"
                        >
                          Unfollow
                        </Button>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function UserCard({
  user,
  actionBtn,
  badge,
}: {
  user: any;
  actionBtn?: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card className="flex items-center p-4 rounded-3xl border border-border bg-card/50 hover:bg-secondary/50 hover:border-primary/50 transition-all backdrop-blur-md group">
      {/* Avatar — always fixed at the same left position, outside the Link */}
      <Link href={`/profile/${user._id}`} className="shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-brand-blue to-brand-purple shadow-lg group-hover:shadow-primary/20 transition-all">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
              {user.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      {/* Text — takes all remaining space, truncates overflow */}
      <Link href={`/profile/${user._id}`} className="flex-1 min-w-0 ml-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">{user.name}</h3>
          {badge && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-mono truncate">@{user.username || user.name}</p>
      </Link>

      {/* Action button — always at far right, never affects left layout */}
      {actionBtn && (
        <div className="ml-4 pl-4 border-l border-border/50 shrink-0 hidden md:block">
          {actionBtn}
        </div>
      )}
    </Card>
  );
}
