import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Displays an in-app install prompt when the browser emits a `beforeinstallprompt` event and the user hasn't dismissed it recently.
 *
 * The component listens for the browser install prompt, shows a UI offering install or dismiss actions, persists a dismissal timestamp to localStorage for seven days, and hides itself if dismissed within that window.
 *
 * @returns A JSX element containing the install prompt UI, or `null` when the prompt should not be shown.
 */
export function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [showPrompt, setShowPrompt] = useState(false);

	useEffect(() => {
		const handler = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setShowPrompt(true);
		};

		window.addEventListener("beforeinstallprompt", handler);

		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const handleInstall = async () => {
		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === "accepted") {
			console.log("✅ User installed the app");
		}

		setDeferredPrompt(null);
		setShowPrompt(false);
	};

	const handleDismiss = () => {
		setShowPrompt(false);
		// Remember dismissal for 7 days
		localStorage.setItem("install-prompt-dismissed", Date.now().toString());
	};

	// Don't show if dismissed recently
	useEffect(() => {
		const dismissed = localStorage.getItem("install-prompt-dismissed");
		if (dismissed) {
			const dismissedTime = parseInt(dismissed);
			const sevenDays = 7 * 24 * 60 * 60 * 1000;
			if (Date.now() - dismissedTime < sevenDays) {
				setShowPrompt(false);
			}
		}
	}, []);

	if (!showPrompt || !deferredPrompt) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
			<div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
				<div className="flex-1">
					<h3 className="font-semibold text-sm">Install Expiro</h3>
					<p className="text-xs text-muted-foreground">
						Add to home screen for quick access
					</p>
				</div>
				<Button size="sm" onClick={handleInstall} className="shrink-0">
					<Download className="h-4 w-4 mr-2" />
					Install
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={handleDismiss}
					className="shrink-0"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
