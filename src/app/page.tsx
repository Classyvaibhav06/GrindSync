"use client";
import React from "react";
import { Spotlight } from "@/components/social-grind/Spotlight";
import { FloatingNav } from "@/components/social-grind/FloatingNav";
import { BentoGrid, BentoGridItem } from "@/components/social-grind/BentoGrid";
import { 
  IconArrowWaveRightUp, 
  IconClipboardCopy, 
  IconFileBroken, 
  IconSignature, 
  IconTableColumn
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navItems = [
    { name: "Home", link: "/" },
    { name: "Features", link: "#features" },
    { name: "Discover", link: "/users" },
    { name: "Community", link: "#" },
  ];

  return (
    <div className="min-h-screen bg-background antialiased relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute inset-0 mask-radial-faded pointer-events-none" />
      <FloatingNav navItems={navItems} />
      
      {/* Hero Section */}
      <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center relative overflow-hidden">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        <div className=" p-4 max-w-7xl  mx-auto relative z-10  w-full pt-20 md:pt-0">
          <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Grind Smarter <br /> Together.
          </h1>
          <p className="mt-4 font-normal text-base text-muted-foreground max-w-lg text-center mx-auto">
            Social Grind is the elite platform where high achievers turn their productivity into status.
            Join a community of builders, founders, and creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg font-bold">
              View Community
            </Button>
          </div>
        </div>
      </div>

      {/* Bento Grid Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">
            Engineered for <span className="text-primary italic">Peak Performance</span>
          </h2>
          <BentoGrid className="max-w-4xl mx-auto">
            {items.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                icon={item.icon}
                className={i === 3 ? "md:col-span-2" : ""}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-purple" />
            <span className="text-xl font-bold tracking-widest">GRIND</span>
          </div>
          <div className="flex gap-8 text-muted-foreground text-sm font-medium">
             <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
             <Link href="#" className="hover:text-primary transition-colors">GitHub</Link>
             <Link href="#" className="hover:text-primary transition-colors">Discord</Link>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Social Grind. Built for the elite.
          </p>
        </div>
      </footer>
    </div>
  );
}

const Skeleton = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/[0.05]"></div>
);

const items = [
  {
    title: "The Dawn of Productivity",
    description: "Track your deep work sessions with millisecond precision.",
    header: <Skeleton />,
    icon: <IconClipboardCopy className="h-4 w-4 text-primary" />,
  },
  {
    title: "The Digital Revolution",
    description: "Connect with builders across the globe in verified channels.",
    header: <Skeleton />,
    icon: <IconFileBroken className="h-4 w-4 text-primary" />,
  },
  {
    title: "The Art of Design",
    description: "Beautifully visualized analytics for your daily output.",
    header: <Skeleton />,
    icon: <IconSignature className="h-4 w-4 text-primary" />,
  },
  {
    title: "The Power of Community",
    description:
      "Join monthly challenges and compete for the top of the global leaderboard.",
    header: <Skeleton />,
    icon: <IconTableColumn className="h-4 w-4 text-primary" />,
  },
  {
    title: "The Pursuit of Knowledge",
    description: "Exclusive newsletters and resources for founders.",
    header: <Skeleton />,
    icon: <IconArrowWaveRightUp className="h-4 w-4 text-primary" />,
  },
];
