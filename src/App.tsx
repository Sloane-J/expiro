import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";
import { lazy, Suspense } from "react";

// Lazy-loaded pages (code splitting)
const AddProductPage = lazy(() => import("@/pages/add-product"));
const AdminPage = lazy(() => import("@/pages/admin"));
const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/pages/login"));
const ProductDetailPage = lazy(() => import("@/pages/product-detail"));
const ProfilePage = lazy(() => import("@/pages/profile"));

function App() {
	const { user } = useAuth();

	return (
		<BrowserRouter>
			<div className="min-h-screen bg-background text-foreground">
				<Suspense
					fallback={
						<div className="flex min-h-screen items-center justify-center">
							Loading...
						</div>
					}
				>
					<Routes>
						<Route
							path="/login"
							element={user ? <Navigate to="/home" replace /> : <LoginPage />}
						/>
						<Route
							path="/home"
							element={
								<ProtectedRoute>
									<HomePage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin"
							element={
								<AdminRoute>
									<AdminPage />
								</AdminRoute>
							}
						/>
						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<ProfilePage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/add-product"
							element={
								<ProtectedRoute>
									<AddProductPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/products/:id"
							element={
								<ProtectedRoute>
									<ProductDetailPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/"
							element={<Navigate to={user ? "/home" : "/login"} replace />}
						/>
					</Routes>
				</Suspense>
			</div>
		</BrowserRouter>
	);
}

export default App;