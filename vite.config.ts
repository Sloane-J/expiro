import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers (Cloudflare Pages supports ES2020+)
    target: "es2020",
    
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // CRITICAL FIX: Don't split React into separate chunk
          // This can cause the "undefined createContext" error
          // React MUST be in the main bundle or vendor chunk
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react-vendor"; // Keep React together
          }
          
          // React Router can be separate
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          
          // TanStack Query chunk
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-query";
          }
          
          // Supabase chunk
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          
          // Lucide icons chunk
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          
          // UI components chunk (shadcn, radix)
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge")
          ) {
            return "vendor-ui";
          }
          
          // Image compression
          if (id.includes("node_modules/browser-image-compression")) {
            return "vendor-image";
          }
          
          // Theme
          if (id.includes("node_modules/next-themes")) {
            return "vendor-theme";
          }
          
          // All other node_modules
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        },
      },
    },
    
    chunkSizeWarningLimit: 600,
    
    // Ensure sourcemaps for debugging (remove in production if needed)
    sourcemap: false, // Set to true if you need to debug production
  },
  
  // CRITICAL: Ensure proper module resolution for Cloudflare
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
    ],
  },
});