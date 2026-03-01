import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Loader2,
	LogOut,
	Package,
	Plus,
	RefreshCw,
	Search,
	SearchX,
	Settings,
	ShieldCheck,
	Trash2,
	User,
	WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth";
import { deleteProduct, getProductStatus, getProducts } from "@/lib/products";
import { supabase } from "@/lib/supabase";

type FilterStatus = "all" | "safe" | "expiring_soon" | "expired";

export default function HomePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [filter, setFilter] = useState<FilterStatus>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [pullDistance, setPullDistance] = useState(0);
	const touchStartY = useRef(0);
	const touchCurrentY = useRef(0);
	const PULL_THRESHOLD = 80;

	const { data: profile } = useQuery({
		queryKey: ["user-profile"],
		queryFn: async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) return null;

			const { data, error } = await supabase
				.from("user_profiles")
				.select("name, role")
				.eq("id", user.id)
				.single();

			if (error) return null;

			return data;
		},
	});

	const {
		data: products,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["products"],
		queryFn: getProducts,
		staleTime: 30000,
		retry: 1,
	});

	useEffect(() => {
		if (error) {
			const isAuthError =
				error instanceof Error &&
				(error.message.includes("JWT") ||
					error.message.includes("expired") ||
					error.message.includes("authorized"));

			if (isAuthError) navigate("/login");
		}
	}, [error, navigate]);

	const deleteMutation = useMutation({
		mutationFn: deleteProduct,
		onMutate: async (deletedId) => {
			await queryClient.cancelQueries({ queryKey: ["products"] });
			const previousProducts = queryClient.getQueryData(["products"]);
			queryClient.setQueryData(["products"], (old: any[]) =>
				old?.filter((product) => product.id !== deletedId),
			);
			return { previousProducts };
		},
		onSuccess: () => {
			setDeleteDialogOpen(false);
			setProductToDelete(null);
			toast.success("Product deleted successfully");
		},
		onError: (_, __, context) => {
			queryClient.setQueryData(["products"], context?.previousProducts);
			toast.error("Failed to delete product. Please try again.");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});

	const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
		e.stopPropagation();
		setProductToDelete({ id, name });
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = () => {
		if (productToDelete) {
			deleteMutation.mutate(productToDelete.id);
		}
	};

	const handleRefresh = async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);
		await queryClient.invalidateQueries({ queryKey: ["products"] });
		setTimeout(() => setIsRefreshing(false), 800);
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartY.current = e.touches[0].clientY;
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		touchCurrentY.current = e.touches[0].clientY;
		const distance = touchCurrentY.current - touchStartY.current;
		if (distance > 0 && window.scrollY === 0) {
			setPullDistance(Math.min(distance, PULL_THRESHOLD + 20));
		}
	};

	const handleTouchEnd = () => {
		if (pullDistance >= PULL_THRESHOLD) {
			handleRefresh();
		}
		setPullDistance(0);
	};

	const getFilterColor = (status: string, isActive: boolean) => {
		if (!isActive) {
			return "border-border bg-background text-foreground hover:bg-accent";
		}
		switch (status) {
			case "safe":
				return "border-transparent bg-status-safe text-status-safe-fg hover:opacity-90";
			case "expiring_soon":
				return "border-transparent bg-status-expiring text-status-expiring-fg hover:opacity-90";
			case "expired":
				return "border-transparent bg-status-expired text-status-expired-fg hover:opacity-90";
			case "all":
			default:
				return "border-transparent bg-primary text-primary-foreground hover:bg-primary/90";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "safe":
				return "bg-status-safe text-status-safe-fg border-status-safe-fg/20";
			case "expiring_soon":
				return "bg-status-expiring text-status-expiring-fg border-status-expiring-fg/20";
			case "expired":
				return "bg-status-expired text-status-expired-fg border-status-expired-fg/20";
			default:
				return "bg-secondary text-secondary-foreground";
		}
	};

	const filteredProducts = useMemo(() => {
		return products?.filter((product) => {
			const matchesFilter =
				filter === "all" || getProductStatus(product.expiry_date) === filter;
			const matchesSearch =
				product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(product.category?.toLowerCase() || "").includes(
					searchQuery.toLowerCase(),
				);
			return matchesFilter && matchesSearch;
		});
	}, [products, filter, searchQuery]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-muted-foreground text-sm">Loading products...</p>
			</div>
		);
	}

	if (error && !isLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
				<div className="rounded-full bg-muted p-6 mb-2">
					<WifiOff className="h-10 w-10 text-muted-foreground" />
				</div>
				<h2 className="text-lg font-semibold">Something went wrong</h2>
				<p className="text-sm text-muted-foreground max-w-xs">
					Could not load products. Check your connection and try again.
				</p>
				<Button
					onClick={() =>
						queryClient.invalidateQueries({ queryKey: ["products"] })
					}
					className="rounded-full px-6 mt-2"
				>
					Try again
				</Button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<InstallPrompt />

			{/* Header */}
			<div className="sticky top-0 z-10 bg-background border-b">
				<div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
					<div className="flex items-center justify-between">
						<p className="font-semibold text-muted-foreground">
							Welcome,{" "}
							<span className="font-semibold text-foreground">
								{profile?.name || "User"}
							</span>
						</p>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-10 w-10 active:bg-white/30 dark:active:bg-zinc-800/60 transition-colors rounded-full"
								>
									<Settings className="h-6 w-6 text-foreground/90" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent
								align="end"
								className="w-56 p-1.5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border border-white/40 dark:border-zinc-800/50 shadow-2xl rounded-2xl"
							>
								<DropdownMenuItem
									onClick={() => navigate("/profile")}
									className="h-11 rounded-lg active:bg-black/5 dark:active:bg-white/10 transition-all"
								>
									<User className="mr-3 h-5 w-5 opacity-80" />
									<span className="font-medium">Profile</span>
								</DropdownMenuItem>

								{profile?.role === "admin" && (
									<>
										<DropdownMenuSeparator className="my-1 bg-black/10 dark:bg-white/10" />
										<DropdownMenuItem
											onClick={() => navigate("/admin")}
											className="h-11 rounded-lg active:bg-black/5 dark:active:bg-white/10 transition-all"
										>
											<ShieldCheck className="mr-3 h-5 w-5 opacity-80" />
											<span className="font-medium">Approvals</span>
										</DropdownMenuItem>
									</>
								)}

								<DropdownMenuSeparator className="my-1 bg-black/10 dark:bg-white/10" />

								<div className="flex items-center justify-between px-3 py-2 text-sm">
									<span className="font-medium opacity-70">Theme</span>
									<ThemeToggle />
								</div>

								<DropdownMenuSeparator className="my-1 bg-black/10 dark:bg-white/10" />

								<DropdownMenuItem
									onClick={async () => {
										await signOut();
										navigate("/login");
									}}
									className="h-11 rounded-lg text-destructive font-semibold active:bg-destructive/10 transition-all"
								>
									<LogOut className="mr-3 h-5 w-5" />
									<span>Logout</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div className="mt-6">
						<h1 className="text-xl font-bold tracking-tighter">Inventory</h1>
					</div>

					<div className="relative mt-3">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search products..."
							className="pl-10 rounded-full"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{products && products.length > 0 && (
						<div className="flex gap-2 mt-3 pb-2 overflow-x-auto no-scrollbar">
							{(["all", "safe", "expiring_soon", "expired"] as const).map(
								(s) => (
									<Button
										key={s}
										variant={filter === s ? "default" : "outline"}
										size="sm"
										onClick={() => setFilter(s)}
										className={`shrink-0 font-medium text-xs rounded-full whitespace-nowrap px-3 py-1 transition-all ${getFilterColor(s, filter === s)}`}
									>
										{s.replace("_", " ")}
									</Button>
								),
							)}
						</div>
					)}
				</div>
			</div>

			{/* Product list */}
			<div
				className="max-w-2xl mx-auto pb-24"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				{/* Pull to refresh indicator */}
				{pullDistance > 10 && (
					<div
						className="flex justify-center items-center gap-2 text-muted-foreground text-sm transition-all"
						style={{ height: `${Math.min(pullDistance, PULL_THRESHOLD)}px` }}
					>
						<RefreshCw
							className={`h-4 w-4 transition-transform ${
								pullDistance >= PULL_THRESHOLD ? "text-primary rotate-180" : ""
							}`}
						/>
						<span>
							{pullDistance >= PULL_THRESHOLD
								? "Release to refresh"
								: "Pull to refresh"}
						</span>
					</div>
				)}

				{isRefreshing && (
					<div className="flex justify-center items-center gap-2 text-muted-foreground text-sm py-3">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Refreshing...</span>
					</div>
				)}

				{/* Empty state: no products at all */}
				{products?.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-center px-4">
						<div className="rounded-full bg-muted p-6 mb-4">
							<Package className="h-10 w-10 text-muted-foreground" />
						</div>
						<h2 className="text-lg font-semibold mb-1">No products yet</h2>
						<p className="text-sm text-muted-foreground mb-6 max-w-xs">
							Start tracking expiry dates by adding your first product.
						</p>
						<Button
							onClick={() => navigate("/add-product")}
							className="rounded-full px-6"
						>
							<Plus className="mr-2 h-4 w-4" /> Add First Product
						</Button>
					</div>
				)}

				{/* Empty state: filter/search returns nothing */}
				{(products?.length ?? 0) > 0 && filteredProducts?.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-center px-4">
						<div className="rounded-full bg-muted p-6 mb-4">
							<SearchX className="h-10 w-10 text-muted-foreground" />
						</div>
						<h2 className="text-lg font-semibold mb-1">No results found</h2>
						<p className="text-sm text-muted-foreground mb-6 max-w-xs">
							No products match your current search or filter.
						</p>
						<Button
							variant="outline"
							className="rounded-full px-6"
							onClick={() => {
								setSearchQuery("");
								setFilter("all");
							}}
						>
							Clear filters
						</Button>
					</div>
				)}

				{/* Product list */}
				{filteredProducts?.map((product, index) => {
					const status = getProductStatus(product.expiry_date);

					return (
						<div key={product.id}>
						<div
  role="button"
  tabIndex={0}
  className="flex gap-4 items-center px-4 py-5 cursor-pointer active:opacity-60 transition-opacity"
  onClick={() => navigate(`/products/${product.id}`)}
  onKeyDown={(e) => e.key === "Enter" && navigate(`/products/${product.id}`)}
>
								{/* Product image */}
								{product.photo_url ? (
									<img
										src={product.photo_url}
										alt={product.name}
										loading="lazy"
										decoding="async"
										className="w-20 h-20 rounded-xl object-cover shrink-0"
									/>
								) : (
									<div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
										<Package className="h-9 w-9 text-muted-foreground" />
									</div>
								)}

								{/* Product info */}
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-base truncate leading-snug">
										{product.name}
									</h3>
									<p className="text-sm text-foreground mt-1">
										Exp:{" "}
										{new Date(product.expiry_date).toLocaleDateString("en-GB")}
									</p>
									{product.category && (
										<p className="text-sm text-muted-foreground mt-1 truncate">
											{product.category}
											{product.quantity > 1 && ` · Qty: ${product.quantity}`}
										</p>
									)}
								</div>

								{/* Status + delete */}
								<div className="flex flex-col items-end gap-2.5 shrink-0">
									<Badge
										className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${getStatusColor(status)}`}
									>
										{status.replace("_", " ")}
									</Badge>
									<button
										type="button"
										aria-label={`Delete ${product.name}`}
										title={`Delete ${product.name}`}
										className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted transition-colors"
										onClick={(e) =>
											handleDeleteClick(e, product.id, product.name)
										}
									>
										<Trash2 className="h-5 w-5 text-destructive" />
									</button>
								</div>
							</div>

							{/* Divider */}
							{index < filteredProducts.length - 1 && (
								<div className="h-px bg-border/50 mx-4" />
							)}
						</div>
					);
				})}
			</div>

			{/* FAB */}
			<div className="fixed bottom-6 right-6">
				<Button
					onClick={() => navigate("/add-product")}
					size="lg"
					className="rounded-full shadow-lg h-14 w-14 p-0"
				>
					<Plus className="h-6 w-6" />
				</Button>
			</div>

			{/* Delete confirmation */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Product?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{productToDelete?.name}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-full">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-white rounded-full"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
