import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine arbitrary class name inputs into a single string and resolve Tailwind CSS class conflicts.
 *
 * @param inputs - One or more class value inputs (strings, arrays, objects, or other `ClassValue` forms) to include in the resulting class list
 * @returns The merged class string with redundant or conflicting Tailwind classes resolved
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
