"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const handleGoogleLogin = () => {
    // This would normally call signIn('google')
    console.log("Logging in with Google...");
    window.location.href = "/home"; // Redirecting for demo purposes
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 relative overflow-hidden bg-black">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[150px] rounded-full" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-zinc-100 mb-2">Welcome Back</h1>
          <p className="text-zinc-500 font-sans">Continue your grind on the global stage.</p>
        </div>

        <div className="glass p-8 rounded-[32px] border-white/5 shadow-2xl">
          {/* OAuth Provider */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-100 text-black font-bold py-4 rounded-2xl hover:bg-zinc-300 transition-all mb-6 font-sans group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0b0b0b] px-2 text-zinc-500 font-sans">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 font-sans">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 px-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(email)}
                placeholder="vaibhav@grind.com"
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 px-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
              />
            </div>
            <button className="w-full bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all mt-4">
              Login
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8 font-sans">
          Don't have an account? <Link href="#" className="text-zinc-100 hover:underline">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
}
