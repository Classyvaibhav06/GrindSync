"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FloatingNav } from "@/components/social-grind/FloatingNav";
import { useRouter } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";

const navItems = [
  { name: "Home", link: "/home" },
  { name: "Chat", link: "/chat" },
  { name: "Discover", link: "/users" },
  { name: "Network", link: "/network" },
];

export default function UsersSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        searchUsers();
      } else {
        setUsers([]);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error + ": " + (data.details || ""));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 pt-32 max-w-4xl mx-auto">
      <FloatingNav navItems={navItems} />

      <Button
        variant="ghost"
        className="mb-8 rounded-full font-bold hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/home")}
      >
        ← Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-black">Discover Builders</h1>
        <Link href="/network">
          <Button
            variant="outline"
            className="rounded-full shadow-lg h-12 px-6 font-bold hover:bg-primary/10 hover:text-primary transition-colors border-border"
          >
            My Network
          </Button>
        </Link>
      </div>
      <div className="mb-8">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 text-lg bg-secondary/30 rounded-2xl"
        />
      </div>

      {loading && <p className="text-muted-foreground">Searching...</p>}

      {!loading && error && (
        <div className="p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-xl mb-4 font-mono break-all">
          Error: {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && query.trim() !== "" && (
        <p className="text-muted-foreground">No users found.</p>
      )}

      <div className="grid gap-4">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/50 hover:bg-secondary/50 transition-colors group"
          >
            <Link
              href={`/profile/${user._id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                  {user.name}
                </h3>
                <p className="text-sm text-primary tracking-widest font-mono truncate">
                  @{user.username || user.name}
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
              onClick={() => router.push(`/chat?user=${user._id}`)}
              title="Send message"
            >
              <IconMessageCircle className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
