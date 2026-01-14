import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized standalone output for Vercel deployment
  output: 'standalone',

  // Enforce strict TypeScript checks in production builds
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
