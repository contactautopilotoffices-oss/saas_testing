import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized standalone output for Vercel deployment
  output: 'standalone',

  // Enforce strict TypeScript checks in production builds
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xvucakstcmtfoanmgcql.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
