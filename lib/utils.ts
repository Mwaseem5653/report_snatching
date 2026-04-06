import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Capacitor } from "@capacitor/core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // If we're on the server (SSR), return as-is
  if (typeof window === "undefined") return cleanPath;

  // On Native Android/iOS
  if (Capacitor.isNativePlatform()) {
    // If the app is already loading from our production domain, use relative paths (prevents CORS)
    if (window.location.host.includes("kpts.com.pk")) {
      return cleanPath;
    }
    // Otherwise, point to the production server
    return `https://kpts.com.pk${cleanPath}`;
  }

  // On Web browser, always use relative
  return cleanPath;
}
