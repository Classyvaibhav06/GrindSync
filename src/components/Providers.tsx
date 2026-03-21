"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalGuard } from "./social-grind/GlobalGuard";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalGuard>{children}</GlobalGuard>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "oklch(0.12 0.01 0)",
            border: "1px solid oklch(0.2 0 0)",
            color: "oklch(0.9 0 0)",
          },
        }}
      />
    </SessionProvider>
  );
}
