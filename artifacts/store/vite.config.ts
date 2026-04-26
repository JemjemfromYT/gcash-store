import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

// Plugin: rewrite "/game/" (no trailing file) -> "/game/index.html" so the
// Vite SPA fallback doesn't swallow the static game folder served from public/.
function gameStaticFallback() {
  return {
    name: "game-static-fallback",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          if (req.url === "/game" || req.url === "/game/") {
            req.url = "/game/index.html";
          } else if (req.url.startsWith("/game/?")) {
            req.url = "/game/index.html?" + req.url.slice("/game/?".length);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  appType: "spa",
  plugins: [
    gameStaticFallback(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
