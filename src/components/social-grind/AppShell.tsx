"use client";
// Shared dashboard shell: sidebar + header + mobile bottom nav + auth gate.
// /home and /stats predate this component and keep their own inline copies;
// new feature pages should render inside <AppShell>.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  IconMenu2, IconX, IconLogout, IconTrophy,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/social-grind/NotificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS, MOBILE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const TIERS = [
  { min: 5000, label: "Legend",   color: "#f59e0b" },
  { min: 2000, label: "Diamond",  color: "#22d3ee" },
  { min: 800,  label: "Platinum", color: "#a78bfa" },
  { min: 350,  label: "Gold",     color: "#fbbf24" },
  { min: 0,    label: "Grinder",  color: "#64748b" },
];
function getTier(xp: number) { return TIERS.find((t) => xp >= t.min)!; }

function ShellAvatar({ userId, sessionImage, userName }: { userId: string; sessionImage?: string | null; userName: string }) {
  const [src, setSrc] = useState<string | null>(sessionImage ?? null);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/avatar`).then((r) => r.json()).then((d) => { if (d.image) setSrc(d.image); }).catch(() => {});
  }, [userId]);
  return (
    <Avatar className="w-8 h-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-[#0e0e13] hover:ring-primary/60 transition-all cursor-pointer flex-shrink-0">
      <AvatarImage src={src ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function AppShell({
  title,
  xp,
  rank,
  children,
}: {
  title: string;
  xp?: number;
  rank?: number | null;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;

  const userId = session.user?.id;
  const userName = session.user?.name || "User";
  const userImage = session.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`;
  const tier = xp !== undefined ? getTier(xp) : null;

  return (
    <div className="flex min-h-screen bg-[#0e0e13] text-[#e4e1e9]">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={cn(
        "fixed lg:sticky top-0 h-screen z-50 flex-shrink-0 flex flex-col",
        "bg-[#0e0e13] border-r border-white/[0.06] w-64 lg:w-56 xl:w-60",
        "py-5 px-3 lg:px-4 transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
              <span className="font-black text-white text-sm">SG</span>
            </div>
            <span className="font-black text-base tracking-tighter">GrindSync</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href || (href !== "/home" && pathname.startsWith(href));
            return (
              <Link key={label} href={href} onClick={() => setSidebarOpen(false)}>
                <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                  isActive ? "bg-primary text-white shadow-md shadow-primary/30" : "text-[#6b7a99] hover:text-[#e4e1e9] hover:bg-white/[0.05]")}>
                  <Icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span className="text-[13px] font-bold tracking-tight">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4">
          {tier && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-2">Your Tier</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40` }}>
                  <IconTrophy size={14} style={{ color: tier.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: tier.color }}>{tier.label}</p>
                  <p className="text-[9px] text-[#6b7a99]">{(xp ?? 0).toLocaleString()} XP{rank ? ` · #${rank}` : ""}</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-[#6b7a99] hover:text-red-400 hover:bg-red-500/[0.08] transition-all group">
            <IconLogout size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-white/[0.04] bg-[#0e0e13]/80 backdrop-blur-xl sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#6b7a99] hover:text-[#e4e1e9] transition-colors flex-shrink-0">
              <IconMenu2 size={20} />
            </button>
            <span className="text-sm sm:text-base font-bold text-[#e4e1e9] truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <ThemeToggle className="hidden sm:inline-flex" />
            <NotificationBell />
            <Link href={`/profile/${userId}`}>
              <ShellAvatar userId={userId} sessionImage={userImage} userName={userName} />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────── */}
      <nav className="mobile-bottom-nav lg:hidden safe-pb">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {MOBILE_NAV.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <Link key={label} href={href} className="no-min-size">
                <div className={cn("flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all",
                  isActive ? "text-primary" : "text-[#6b7a99] hover:text-[#e4e1e9]")}>
                  <div className={cn("p-2 rounded-xl transition-all", isActive && "bg-primary/15")}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[9px] font-bold tracking-wide">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
