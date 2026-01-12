import type { User } from "@supabase/supabase-js";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

type AuthContextType = {
	user: User | null;
	loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Validate session by making an actual API call
		const checkSession = async () => {
			try {
				// getUser() validates JWT with server
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				if (error || !user) {
					// JWT is invalid/expired
					await supabase.auth.signOut();
					setUser(null);
				} else {
					setUser(user);
				}
			} catch (error) {
				// Any error means no valid session
				await supabase.auth.signOut();
				setUser(null);
			} finally {
				setLoading(false);
			}
		};

		checkSession();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === "SIGNED_OUT" || !session) {
				setUser(null);
			} else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
				setUser(session.user);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
