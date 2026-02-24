import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Flashlight, FlashlightOff, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeScannerProps = {
	onDetected: (productName: string, barcode: string) => void;
	onClose: () => void;
};

type LookupState = "scanning" | "looking_up" | "found" | "not_found";

async function lookupBarcode(barcode: string): Promise<string | null> {
	try {
		const response = await fetch(
			`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
		);
		const data = await response.json();

		if (data.status === 1 && data.product) {
			return (
				data.product.product_name ||
				data.product.product_name_en ||
				data.product.abbreviated_product_name ||
				null
			);
		}
		return null;
	} catch {
		return null;
	}
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);
	const [lookupState, setLookupState] = useState<LookupState>("scanning");
	const [statusMessage, setStatusMessage] = useState("Point camera at barcode");
	const [torchOn, setTorchOn] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const hasScanned = useRef(false);

	useEffect(() => {
		const reader = new BrowserMultiFormatReader();
		readerRef.current = reader;

		const startScanning = async () => {
			try {
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
				});
				setStream(mediaStream);

				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
					await videoRef.current.play();
				}

				reader.decodeFromStream(
					mediaStream,
					videoRef.current!,
					async (result, error) => {
						if (result && !hasScanned.current) {
							hasScanned.current = true;
							const barcode = result.getText();

							setLookupState("looking_up");
							setStatusMessage("Looking up product...");

							const productName = await lookupBarcode(barcode);

							if (productName) {
								setLookupState("found");
								setStatusMessage(`Found: ${productName}`);
								setTimeout(() => {
									stopScanning(mediaStream);
									onDetected(productName, barcode);
								}, 800);
							} else {
								setLookupState("not_found");
								setStatusMessage("Product not found — enter name manually");
								setTimeout(() => {
									stopScanning(mediaStream);
									onDetected("", barcode);
								}, 1500);
							}
						}

						if (error && !(error instanceof NotFoundException)) {
							console.error("Scanner error:", error);
						}
					},
				);
			} catch (err) {
				console.error("Camera access error:", err);
				setStatusMessage(
					"Camera access denied. Please allow camera permissions.",
				);
			}
		};

		startScanning();

		return () => {
			if (stream) stopScanning(stream);
		};
	}, []);

	const stopScanning = (mediaStream?: MediaStream) => {
		readerRef.current?.reset();
		const s = mediaStream || stream;
		if (s) {
			s.getTracks().forEach((track) => track.stop());
		}
	};

	const handleClose = () => {
		stopScanning();
		onClose();
	};

	const toggleTorch = async () => {
		if (!stream) return;
		const track = stream.getVideoTracks()[0];
		if (!track) return;

		try {
			await track.applyConstraints({
				advanced: [{ torch: !torchOn } as any],
			});
			setTorchOn(!torchOn);
		} catch {
			// Torch not supported on this device
		}
	};

	const getStatusColor = () => {
		switch (lookupState) {
			case "found":
				return "bg-green-500/90";
			case "not_found":
				return "bg-orange-500/90";
			case "looking_up":
				return "bg-blue-500/90";
			default:
				return "bg-black/60";
		}
	};

	return (
		<div className="fixed inset-0 z-50 bg-black flex flex-col">
			{/* Video feed */}
			<video
				ref={videoRef}
				className="absolute inset-0 w-full h-full object-cover"
				playsInline
				muted
			/>

			{/* Dark overlay with cutout effect */}
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				{/* Top overlay */}
				<div className="w-full flex-1 bg-black/50" />

				{/* Middle row */}
				<div className="flex w-full items-center">
					{/* Left overlay */}
					<div className="flex-1 bg-black/50 h-64" />

					{/* Scan window */}
					<div
						className="w-64 h-64 relative shrink-0"
						style={{
							boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
						}}
					>
						{/* Corner markers */}
						<div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-sm" />
						<div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-sm" />
						<div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-sm" />
						<div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-sm" />

						{/* Scanning line animation */}
						{lookupState === "scanning" && (
							<div
								className="absolute left-2 right-2 h-0.5 bg-primary opacity-80"
								style={{
									animation: "scanline 2s ease-in-out infinite",
								}}
							/>
						)}

						{/* Lookup spinner overlay */}
						{lookupState === "looking_up" && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
								<Loader2 className="h-10 w-10 text-white animate-spin" />
							</div>
						)}
					</div>

					{/* Right overlay */}
					<div className="flex-1 bg-black/50 h-64" />
				</div>

				{/* Bottom overlay */}
				<div className="w-full flex-1 bg-black/50" />
			</div>

			{/* Status message */}
			<div className="absolute bottom-32 left-0 right-0 flex justify-center px-6">
				<div
					className={`px-4 py-2 rounded-full text-white text-sm font-medium text-center transition-colors ${getStatusColor()}`}
				>
					{lookupState === "looking_up" && (
						<Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1.5 -mt-0.5" />
					)}
					{statusMessage}
				</div>
			</div>

			{/* Controls */}
			<div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-safe">
				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60"
					onClick={handleClose}
				>
					<X className="h-5 w-5" />
				</Button>

				<p className="text-white font-semibold text-sm">Scan Barcode</p>

				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60"
					onClick={toggleTorch}
				>
					{torchOn ? (
						<FlashlightOff className="h-5 w-5" />
					) : (
						<Flashlight className="h-5 w-5" />
					)}
				</Button>
			</div>

			<style>{`
        @keyframes scanline {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
		</div>
	);
}
