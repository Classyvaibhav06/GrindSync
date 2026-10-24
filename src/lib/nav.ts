import {
  IconLayoutDashboard, IconTrophy, IconVideo, IconPackage, IconTarget,
  IconMessageCircle, IconUsers, IconChartBar, IconSettings,
} from "@tabler/icons-react";

// Single source of truth for the dashboard navigation.
// The shared sidebar/mobile nav live in AppShell; /home and /stats import
// these arrays for their own inline navs (they predate AppShell).
export const NAV_ITEMS = [
  { icon: IconLayoutDashboard, label: "Dashboard",  href: "/home" },
  { icon: IconTrophy,          label: "Challenges", href: "/challenges" },
  { icon: IconVideo,           label: "Rooms",      href: "/rooms" },
  { icon: IconPackage,         label: "Marketplace", href: "/marketplace" },
  { icon: IconTarget,          label: "Goals",      href: "/goals" },
  { icon: IconMessageCircle,   label: "Chat",       href: "/chat" },
  { icon: IconUsers,           label: "Discover",   href: "/users" },
  { icon: IconChartBar,        label: "Stats",      href: "/stats" },
  { icon: IconSettings,        label: "Settings",   href: "#" },
];

// Mobile bottom nav is capped at 5 entries to fit small screens;
// everything else stays reachable via the burger sidebar.
export const MOBILE_NAV = [
  { icon: IconLayoutDashboard, label: "Home",        href: "/home" },
  { icon: IconTrophy,          label: "Challenges",  href: "/challenges" },
  { icon: IconVideo,           label: "Rooms",       href: "/rooms" },
  { icon: IconPackage,         label: "Marketplace", href: "/marketplace" },
  { icon: IconUsers,           label: "Discover",    href: "/users" },
];
