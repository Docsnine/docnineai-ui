import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const BACKEND_URL = env.VITE_API_URL || "";

  // For every backend-bound path we need a bypass check:
  // Browser page navigations send Accept: text/html — those must be served
  // by the SPA (index.html), NOT forwarded to Express.
  // XHR / fetch calls send Accept: application/json or no text/html —
  // those are forwarded to the backend as normal API requests.
  type BypassFn = (req: { url?: string; headers?: Record<string, string> }) => string | undefined | null;

  const makeProxy = (extraBypass?: BypassFn) => ({
    target: BACKEND_URL,
    changeOrigin: true,
    secure: false,
    bypass(req: { url?: string; headers?: Record<string, string> }) {
      // Always serve the SPA for browser navigations.
      if (req.headers?.accept?.includes("text/html")) return req.url;
      // Any additional path-specific bypass rules.
      return extraBypass?.(req);
    },
  });

  const proxyConfig: Record<string, object> = {
    "/auth":     makeProxy(),
    "/github":   makeProxy(),
    "/projects": makeProxy(),
    "/api":      makeProxy(),
    "/health":   makeProxy(),
  };

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: proxyConfig,
    },
  };
});
