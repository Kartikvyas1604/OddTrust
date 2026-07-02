import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@oddtrust/ui", "@oddtrust/design-tokens", "@oddtrust/utils"],
};

export default nextConfig;
