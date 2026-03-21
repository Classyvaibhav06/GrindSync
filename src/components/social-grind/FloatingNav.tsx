"use client";
import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { NotificationBell } from "./NotificationBell";

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const { data: session } = useSession();

  const [visible, setVisible] = useState(true);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(
    session?.user?.image ?? null
  );

  // Fetch the latest avatar from the DB so it's always up-to-date
  useEffect(() => {
    if (!session?.user?.id) return;
    // Show session image immediately as placeholder
    setAvatarSrc(session.user.image ?? null);
    // Then fetch the latest from DB
    fetch(`/api/users/${session.user.id}/avatar`)
      .then((r) => r.json())
      .then((data) => { if (data.image) setAvatarSrc(data.image); })
      .catch(() => {});
  }, [session?.user?.id]);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!;
      if (scrollYProgress.get() < 0.05) {
        setVisible(true);
      } else {
        setVisible(direction < 0);
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-border rounded-full bg-background/50 backdrop-blur-xl z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4 shadow-2xl shadow-black/50",
          className
        )}
      >
        {navItems.map((navItem, idx) => (
          <Link
            key={`link=${idx}`}
            href={navItem.link}
            className={cn(
              "relative items-center flex space-x-1 text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="hidden sm:block text-sm font-bold">{navItem.name}</span>
          </Link>
        ))}

        {session?.user ? (
          <>
            <NotificationBell />
            <Link href={`/profile/${session.user.id}`}>
              <div className="flex items-center gap-2 border border-border bg-secondary/30 pl-2 pr-4 py-1.5 rounded-full hover:bg-secondary/50 transition-all cursor-pointer shadow-lg shadow-black/20">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={session.user.name || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold text-xs bg-gradient-to-tr from-brand-blue to-brand-purple">
                      {session.user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold tracking-wide text-foreground">
                  @{(session.user as any).username || session.user.name}
                </span>
              </div>
            </Link>
          </>
        ) : (
          <Link href="/login">
            <button className="border text-sm font-bold relative border-border text-foreground px-6 py-2 rounded-full bg-secondary/30 hover:bg-secondary/50 transition-all">
              <span>Login</span>
              <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-primary to-transparent h-px shadow-[0_0_15px_1px_rgba(37,71,244,0.5)]" />
            </button>
          </Link>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
