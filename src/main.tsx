import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();
// One-time cache clear (remove after first deploy)
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name.includes('expiro-v1')) {
        caches.delete(name);
      }
    });
  });
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/service-worker.js?v=2")
			.then((registration) => {
				console.log("✅ Service Worker registered:", registration.scope);
			})
			.catch((error) => {
				console.error("❌ Service Worker registration failed:", error);
			});
	});
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider defaultTheme="system" storageKey="expiro-theme">
				<AuthProvider>
					<App />
				</AuthProvider>
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>,
);
