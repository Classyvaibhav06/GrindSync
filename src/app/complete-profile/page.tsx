"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const { data: session, update } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Tell NextAuth frontend to reload session
      await update({ username });
      router.push("/home");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full" />

      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-xl z-20 rounded-[2.5rem] p-4 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-black tracking-tight">Complete Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Just one last step. Pick a unique username and password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUpdate} className="space-y-4 text-left">
            {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded-xl text-sm font-medium">{error}</div>}
            
            <div className="space-y-2 px-1">
              <Label htmlFor="username" className="text-muted-foreground text-sm font-medium">Unique Username</Label>
              <Input 
                id="username" 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder="vaibhav_01" 
                className="h-12 bg-secondary/30 border-border rounded-xl focus:ring-primary/50" 
                required
              />
            </div>
            
            <div className="space-y-2 px-1">
              <Label htmlFor="password" title="Password" className="text-muted-foreground text-sm font-medium">Create a Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="h-12 bg-secondary/30 border-border rounded-xl focus:ring-primary/50" 
                required
              />
            </div>

            <Button 
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
