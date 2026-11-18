import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // In development, talk to the API service directly. In the Docker cluster
    // the edge proxy does this instead, so the app only ever calls /api/*.
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_ORIGIN || "http://127.0.0.1:8081",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Content-hashed filenames are what make `Cache-Control: immutable` safe:
    // a changed file gets a new name, so a year-long cache can never go stale.
    assetsDir: "assets",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: {
          // three.js is ~600 kB and almost never changes. Splitting it out
          // means a copy tweak ships a 20 kB chunk, not a 1.4 MB document.
          three: ["three", "@react-three/fiber"],
          motion: ["framer-motion"],
          router: ["react-router-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
