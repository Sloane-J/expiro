import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Cloudflare Pages supports modern browsers
    target: "es2020",

    rollupOptions: {
      output: {
        manualChunks: {
          // ONLY group React itself — nothing else
          "react-vendor": [
            "react",
            "react-dom",
            "scheduler",
          ],
        },
      },
    },

    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
    ],
  },
});
