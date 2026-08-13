import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://ec2-54-179-190-142.ap-southeast-1.compute.amazonaws.com:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
