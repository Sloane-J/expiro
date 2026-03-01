import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
			const loadProfile = async () => {
				if (!user) return;
				const { data } = await supabase
					.from("user_profiles")
					.select("*")
					.eq("id", user.id)
					.single();
				if (data) {
					setName(data.name || "");
					setPhone(data.phone || "");
				}
			};
			void loadProfile();
		}, [user]);

	async function saveProfile() {
		if (!user) return;
		setLoading(true);
		setMessage("");

		const { error } = await supabase.from("user_profiles").upsert({
			id: user.id,
			name,
			phone,
		});

		if (error) {
			setMessage("Error saving profile: "  error.message);
		} else {
			setMessage("Profile saved successfully!");
		}

		setLoading(false);
	}

	return (
		<div className="min-h-screen p-4">
			<Button
				variant="ghost"
				onClick={() => navigate("/home")}
				className="mb-4"
			>
				<ArrowLeft className="mr-2 h-4 w-4" /> Back
			</Button>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<label htmlFor="profile-email" className="text-sm font-medium">Email</label>
						<Input id="profile-email" value={user?.email || ""} disabled />
					</div>

					<div>
						<label htmlFor="profile-name" className="text-sm font-medium">Name</label>
						<Input
						  id="prfile-name"
							placeholder="Your name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div>
						<label htmlFor="profile-phone" className="text-sm font-medium">Phone</label>
						<Input
						id="profile-phone"
							placeholder="Phone number"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
						/>
					</div>

					{message && (
						<div
							className={`text-sm p-3 rounded ${
								message.includes("Error")
									? "text-destructive bg-destructive/10"
									: "text-green-600 bg-green-100 dark:bg-green-900/20"
							}`}
						>
							{message}
						</div>
					)}

					<Button className="w-full" onClick={saveProfile} disabled={loading}>
						{loading ? "Saving..." : "Save Profile"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
