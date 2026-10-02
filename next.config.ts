import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Supabase email links use 127.0.0.1; next dev defaults to localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
