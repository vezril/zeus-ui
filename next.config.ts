import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for a small production Docker image.
  // The standalone server also hosts Zeus's Node-runtime BFF routes
  // (/api/apollo/*), which speak gRPC to Apollo via @grpc/grpc-js.
  output: "standalone",
  // Keep the gRPC runtime out of the bundler — load it as a normal Node
  // dependency in the server tier (it uses Node's http2, not a browser shim).
  serverExternalPackages: ["@grpc/grpc-js"],
};

export default nextConfig;
