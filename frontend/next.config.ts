import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // marks this app as upgraded by the Next.js agent for a security advisory
    agentUpgrade: "security",
  },
};

export default nextConfig;
