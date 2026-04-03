import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sindh Police - Mobile Snatching, Theft & Lost Report Portal | CDR Analyzer",
  description: "Official Sindh Police portal to report mobile snatching, theft, or lost devices. Access advance tools like CDR Analyzer and Application Extractor for digital investigation.",
  keywords: "mobile snatching report sindh, online mobile theft complaint karachi, lost mobile report sindh police, stolen mobile registration sindh, mobile recovery portal sindh police, advanced CDR analyzer pakistan, police CDR analysis tool, CDR format converter sindh police, IMEI database search sindh, PTA mobile lookup online, Sindh Police portal, kpts, kpts sindh police, digital justice sindh",
  alternates: {
    canonical: "https://kpts.com.pk",
  },
  openGraph: {
    title: "Sindh Police Digital Reporting Portal",
    description: "Securely report stolen or lost mobile devices. Use advanced CDR analysis tools.",
    url: "https://kpts.com.pk",
    siteName: "KPTS Sindh Police",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "Sindh Police Logo",
      },
    ],
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sindh Police - Digital Reporting & Investigation",
    description: "Report mobile theft and use professional CDR analysis tools.",
    images: ["/logo.png"],
  },
  verification: {
    google: "google5c13a0972b687103",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      > 
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "KPTS Sindh Police Reporting Portal",
              "url": "https://kpts.com.pk",
              "logo": "https://kpts.com.pk/logo.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "15",
                "contactType": "emergency",
                "areaServed": "Sindh, Pakistan",
                "availableLanguage": ["English", "Urdu"]
              },
              "description": "Official portal for mobile snatching, theft, and lost reporting with advanced CDR analysis tools."
            }),
          }}
        />
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}
