<<<<<<< HEAD
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
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Vendor chunk: React ecosystem
					if (
						id.includes("node_modules/react") ||
						id.includes("node_modules/react-dom") ||
						id.includes("node_modules/react-router") ||
						id.includes("node_modules/scheduler")
					) {
						return "vendor-react";
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

					// All other node_modules
					if (id.includes("node_modules")) {
						return "vendor-misc";
					}
				},
			},
		},
		// Increase chunk size warning limit (we know about it)
		chunkSizeWarningLimit: 600,
	},
});