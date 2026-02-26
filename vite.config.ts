import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  // Backend URL — defaults to localhost:3000 in development.
  const BACKEND_URL = env.VITE_API_URL || "http://localhost:3000";

  // All backend route prefixes that need to be proxied.
  const proxyPaths = ["/auth", "/github", "/projects", "/api", "/health"];
  const proxyConfig = Object.fromEntries(
    proxyPaths.map((p) => [
      p,
      {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    ])
  );

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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: proxyConfig,
    },
  };
});
