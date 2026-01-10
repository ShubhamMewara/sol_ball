// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Required for Privy React SDK to work with Next.js using webpack and Yarn
    config.externals["@solana/kit"] = "commonjs @solana/kit";
    config.externals["@solana-program/memo"] = "commonjs @solana-program/memo";
    config.externals["@solana-program/system"] =
      "commonjs @solana-program/system";
    config.externals["@solana-program/token"] =
      "commonjs @solana-program/token";
    return config;
  },
};

export default nextConfig;
