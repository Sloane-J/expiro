import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth";
export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [isSignUp, setIsSignUp] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		setLoading(true);
		setError("");
		const { error: authError } = isSignUp
			? await signUp(email, password)
			: await signIn(email, password);
		if (authError) {
			setError(authError.message);
			setLoading(false);
			return;
		}
		if (isSignUp) {
			setError("Check your email to confirm your account");
			setLoading(false);
			return;
		}
		navigate("/home");
		setLoading(false);
	};
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-6">
			{" "}
			<main className="w-full max-w-md space-y-8">
				{" "}
				{/* Header */}{" "}
				<div className="space-y-2 text-center">
					{" "}
					<div className="inline-flex h-14 w-14 bg-primary items-center justify-center rounded-2xl mb-4">
						{" "}
						<span className="text-primary-foreground font-bold text-2xl">
							E
						</span>{" "}
					</div>{" "}
					<h1 className="text-3xl font-bold tracking-tight">
						{" "}
						{isSignUp ? "Create account" : "Welcome back"}{" "}
					</h1>{" "}
					<p className="text-muted-foreground">
						{" "}
						{isSignUp
							? "Start tracking your products"
							: "Sign in to continue"}{" "}
					</p>{" "}
				</div>{" "}
				{/* Form */}{" "}
				<form onSubmit={handleSubmit} className="space-y-6">
					{" "}
					{/* Error Message */}{" "}
					{error && (
						<div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
							{" "}
							{error}{" "}
						</div>
					)}{" "}
					<div className="space-y-4">
						{" "}
						<div className="space-y-2">
							{" "}
							<label className="text-sm font-medium" htmlFor="email">
								{" "}
								Email{" "}
							</label>{" "}
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								className="h-12"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>{" "}
						</div>{" "}
						<div className="space-y-2">
							{" "}
							<label className="text-sm font-medium" htmlFor="password">
								{" "}
								Password{" "}
							</label>{" "}
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								className="h-12"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>{" "}
						</div>{" "}
					</div>{" "}
					<div className="space-y-3">
						{" "}
						<Button
							type="submit"
							className="w-full h-12 font-semibold"
							disabled={loading || !email || !password}
						>
							{" "}
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : isSignUp ? (
								"Create account"
							) : (
								"Sign in"
							)}{" "}
						</Button>{" "}
						<div className="text-center">
							{" "}
							<Button
								type="button"
								variant="link"
								className="text-sm text-muted-foreground hover:text-foreground"
								onClick={() => {
									setIsSignUp(!isSignUp);
									setError("");
								}}
							>
								{" "}
								{isSignUp
									? "Already have an account? Sign in"
									: "Don't have an account? Sign up"}{" "}
							</Button>{" "}
						</div>{" "}
					</div>{" "}
				</form>{" "}
			</main>{" "}
		</div>
	);
}
