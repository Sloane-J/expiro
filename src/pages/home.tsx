import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Loader2,
    LogOut,
    Plus,
    Search,
    Settings,
    Trash2,
    User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
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

  // Fetch real name from user_profiles table

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],

    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase

        .from("user_profiles")

        .select("name")

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

  // Auth Guard: Redirect to login if session is dead

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

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      setDeleteDialogOpen(false);

      setProductToDelete(null);
    },
  });

  const handleDeleteClick = (id: string, name: string) => {
    setProductToDelete({ id, name });

    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };
  
  const getFilterColor = (status: string, isActive: boolean) => {
    if (!isActive) {
      return "border-border bg-background text-foreground hover:bg-accent";
    }
    
    switch (status) {
      case "safe":
        return "border-transparent bg-[#27746a] text-white hover:opacity-90";
      case "expiring_soon":
        return "border-transparent bg-[#fd8d35] text-white hover:opacity-90";
      case "expired":
        return "border-transparent bg-[#ec5c54] text-white hover:opacity-90";
      case "all":
      default:
        return "border-transparent bg-primary text-primary-foreground hover:bg-primary/90";
    }
  };

  const getStatusVariant = (
    status: string,
  ): "secondary" | "destructive" | "warning" => {
    if (status === "expired") return "destructive";

    if (status === "expiring_soon") return "warning";

    return "secondary";
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
  return (
    <div className="min-h-screen bg-background">
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
                  className="h-9 w-9"
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
  
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
  
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span>Theme</span>
                  <ThemeToggle />
                </div>
  
                <DropdownMenuSeparator />
  
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut()
                    navigate("/login")
                  }}
                  className="text-destructive font-semibold"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
  
          <div className="mt-6">
            <h1 className="text-xl font-md tracking-tighter">
              Inventory
            </h1>
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
              {["all", "safe", "expiring_soon", "expired"].map((s) => (
                <Button
                  key={s}
                  variant={filter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(s)}
                  className={`shrink-0 font-medium text-xs rounded-full whitespace-nowrap px-3 py-1 transition-all ${getFilterColor(s, filter === s)}`}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
  
      <div className="p-4 max-w-2xl mx-auto pb-20">
        <div className="space-y-2">
          {filteredProducts?.map((product) => {
            const status = getProductStatus(product.expiry_date)
  
            return (
              <Card
                key={product.id}
                className="overflow-hidden border-border/50 shadow-sm"
              >
                <CardContent className="px-3 py-2">
                  <div className="flex gap-3 items-start">
                    {product.photo_url && (
                      <img
                        src={product.photo_url}
                        alt={product.name}
                        className="w-14 h-14 rounded object-cover shrink-0"
                      />
                    )}
  
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate leading-snug">
                        {product.name}
                      </h3>
  
                      {product.category && (
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {product.category}
                        </p>
                      )}
  
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground leading-tight">
                        <p>
                          Exp:{" "}
                          {new Date(product.expiry_date).toLocaleDateString(
                            "en-GB",
                          )}
                        </p>
  
                        {product.quantity > 1 && (
                          <p>• Qty: {product.quantity}</p>
                        )}
                      </div>
                    </div>
  
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={getStatusVariant(status)}
                        className="text-[10px] rounded-full px-2"
                      >
                        {status.replace("_", " ")}
                      </Badge>
  
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          handleDeleteClick(product.id, product.name)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
  
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => navigate("/add-product")}
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
  
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"?
              This action cannot be undone.
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