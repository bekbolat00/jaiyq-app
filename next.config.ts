import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = (() => {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
})();

const unsplashPattern = {
  protocol: "https" as const,
  hostname: "images.unsplash.com",
  pathname: "/**",
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      unsplashPattern,
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
