import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "FuelMap",
        short_name: "FuelMap",
        description:
          "Find the cheapest fuel stations around you on a full-screen map.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Styles change over time: always revalidate so a cached style never
            // references sprites or fonts that no longer exist.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/styles\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "openfreemap-styles",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sprites: revalidate in the background.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/sprites\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "openfreemap-sprites",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts and vector tiles are immutable: cache first.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "openfreemap-tiles",
              expiration: {
                maxEntries: 2_000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fuel prices: network first, gracefully fall back to cache offline.
            urlPattern:
              /^https:\/\/data\.economie\.gouv\.fr\/api\/explore\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "fuel-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // MapLibre GL JS is lazy-loaded in its own chunk (~1 MB minified). It is not
    // part of the first load, so raise the size warning threshold accordingly.
    chunkSizeWarningLimit: 1200,
  },
});
