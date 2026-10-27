import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// Reused from Meu Site Perfeito: framework-independent UI utility.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
