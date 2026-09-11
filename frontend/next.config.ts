import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image isn't used anywhere in this app, and its default optimizer
  // (sharp, a native addon) can't run on Cloudflare Workers' V8 isolates.
  images: { unoptimized: true },
  // Keep sharp's native binary out of the traced/bundled server output —
  // required for the Cloudflare Workers build (esbuild can't bundle .node
  // files). Belt-and-suspenders with images.unoptimized above, since Next
  // still traces the optimizer module into the server bundle otherwise.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

// Enables Cloudflare bindings (env vars, etc.) in `next dev` via the
// OpenNext Cloudflare adapter. No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
