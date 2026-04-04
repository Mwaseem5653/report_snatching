import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";

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
    other: {
      "google-adsense-account": ["ca-pub-5961112055480826"],
    },
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
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      > 
        <div id="global-loader" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-700">
          <div className="flex gap-1">
            {["L", "O", "A", "D", "I", "N", "G"].map((char, index) => (
              <span 
                key={index} 
                className="text-4xl font-black text-[#0a2c4e] animate-[wave_1.5s_infinite]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {char}
              </span>
            ))}
          </div>
          <div className="mt-4 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0a2c4e] animate-[progress_2s_infinite]"></div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes wave {
              0%, 40%, 100% { transform: translateY(0); }
              20% { transform: translateY(-20px); }
            }
            @keyframes progress {
              0% { width: 0%; transform: translateX(-100%); }
              50% { width: 100%; transform: translateX(0%); }
              100% { width: 0%; transform: translateX(100%); }
            }
          `}} />
        </div>
        <Script id="hide-loader" strategy="afterInteractive">
          {`
            function hideLoader() {
              var loader = document.getElementById('global-loader');
              if (loader) {
                loader.style.opacity = '0';
                setTimeout(function() {
                  loader.style.display = 'none';
                }, 700);
              }
            }

            // Multiple triggers to ensure it hides
            if (document.readyState === 'complete') {
              hideLoader();
            } else {
              window.addEventListener('load', hideLoader);
              // Fallback: hide after 8 seconds anyway to prevent stuck screen
              setTimeout(hideLoader, 8000);
            }
          `}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5961112055480826"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
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
