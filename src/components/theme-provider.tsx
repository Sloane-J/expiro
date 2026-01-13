import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
	undefined,
);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "expiro-theme",
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(defaultTheme);

	// Read localStorage ONLY on the client
	useEffect(() => {
		const storedTheme = localStorage.getItem(storageKey) as Theme | null;
		if (storedTheme) {
			setTheme(storedTheme);
		}
	}, [storageKey]);

	// Apply theme to <html>
	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";
			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const value: ThemeProviderState = {
		theme,
		setTheme: (newTheme: Theme) => {
			localStorage.setItem(storageKey, newTheme);
			setTheme(newTheme);
		},
	};

	return (
		<ThemeProviderContext.Provider value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeProviderContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
