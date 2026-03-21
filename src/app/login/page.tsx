"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBrandGoogle } from "@tabler/icons-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "authenticated") {
      router.push("/home");
    }
  }, [status, router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/home" });
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", { 
        identifier, 
        password, 
        redirect: false
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      router.push("/home");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full" />

      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-xl z-20 rounded-[2.5rem] p-4 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
             <span className="text-white font-bold text-2xl">G</span>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to Social Grind to continue your journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl border-border bg-secondary/50 hover:bg-secondary/80 group flex gap-3"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <IconBrandGoogle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Or log in manually</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded-xl text-sm font-medium">{error}</div>}
            
            <div className="space-y-2 px-1">
              <Label htmlFor="identifier" className="text-muted-foreground text-sm font-medium">Email or Username</Label>
              <Input 
                id="identifier" 
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="vaibhav@grind.com or vaibhav_01" 
                className="h-12 bg-secondary/30 border-border rounded-xl focus:ring-primary/50" 
                required
              />
            </div>
            <div className="space-y-2 px-1">
              <Label htmlFor="password" title="Password" className="text-muted-foreground text-sm font-medium">Password</Label>
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
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          <div className="text-center pt-4">
            <p className="text-muted-foreground text-sm font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline text-foreground hover:text-primary transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
