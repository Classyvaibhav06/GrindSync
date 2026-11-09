"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { GlobalGuard } from "./social-grind/GlobalGuard";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  return (
    <Toaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      toastOptions={{
        style: isLight
          ? {
              background: "oklch(0.99 0.01 90)",
              border: "1px solid oklch(0.85 0.02 90)",
              color: "oklch(0.2 0.01 90)",
            }
          : {
              background: "oklch(0.12 0.01 0)",
              border: "1px solid oklch(0.2 0 0)",
              color: "oklch(0.9 0 0)",
            },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      // The ripple view-transition drives the theme change itself;
      // suppressing next-themes' global color transition keeps the
      // clip-path reveal clean (no per-element color lag).
      disableTransitionOnChange
    >
      <SessionProvider>
        <GlobalGuard>{children}</GlobalGuard>
        <ThemedToaster />
      </SessionProvider>
    </ThemeProvider>
  );
}
