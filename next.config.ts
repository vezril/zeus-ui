import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for a small production Docker image.
  // The standalone server also hosts Zeus's Node-runtime BFF routes
  // (/api/apollo/*), which speak gRPC to Apollo via @grpc/grpc-js.
  output: "standalone",
};

export default nextConfig;
