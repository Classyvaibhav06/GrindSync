import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !! Dangerously allow production builds to successfully complete even if your project has type errors.
    ignoreBuildErrors: true,
  },
} as NextConfig;

export default nextConfig;
