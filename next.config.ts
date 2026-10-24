import path from "node:path";
import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Turbopack's workspace root must be the parent of the project: setting it to
  // the project folder itself makes Turbopack mount the app one level too deep,
  // which breaks Tailwind's `tailwindcss` module resolution at compile time.
  // The parent still avoids the home-directory scan that caused OOM crashes.
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  typescript: {
    // !! WARN !! Dangerously allow production builds to successfully complete even if your project has type errors.
    ignoreBuildErrors: true,
  },
} as NextConfig;

export default nextConfig;
