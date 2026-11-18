import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * The site's public origin, in one place.
 *
 * Open Graph and Twitter cards require ABSOLUTE urls — every scraper
 * resolves og:image literally, and a relative path is the single most common
 * reason a shared link renders a blank card. Hard-coding the domain in five
 * meta tags means four of them go stale the first time it changes, so it is
 * substituted at build time instead.
 *
 *   SITE_URL=https://your-domain.com npm run build
 */
const SITE_URL = (process.env.SITE_URL || "https://dulithakariyapperuma.com").replace(/\/$/, "");

/** Fills __SITE_URL__ in index.html and emits robots.txt and sitemap.xml. */
function siteUrl(): Plugin {
  const routes = ["/", "/portfolio/programming", "/portfolio/photography"];
  return {
    name: "site-url",
    // A global regex, not replaceAll: tsconfig targets ES2020, where String
    // .replaceAll does not exist yet.
    transformIndexHtml: (html) => html.replace(/__SITE_URL__/g, SITE_URL),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          routes
            .map((r, i) => `  <url><loc>${SITE_URL}${r}</loc><priority>${i ? "0.8" : "1.0"}</priority></url>`)
            .join("\n") +
          `\n</urlset>\n`,
      });
    },
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrl()],
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
