import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Capacitor } from "@capacitor/core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // If we are in the browser (web), always use relative paths
  if (typeof window !== "undefined" && !Capacitor.isNativePlatform()) {
    return cleanPath;
  }

  // If we are on Android/Native
  if (Capacitor.isNativePlatform()) {
    // If the app is hosted at kpts.com.pk already, use relative
    if (typeof window !== "undefined" && window.location.host.includes("kpts.com.pk")) {
        return cleanPath;
    }
    // Otherwise, point to the production server
    return `https://kpts.com.pk${cleanPath}`;
  }

  return cleanPath;
}
