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
  keywords: "report lost phone, mobile chori ho gya h, mobile chen gya h, online complaint, mobile tacking online, how to recover lost phone, daqeti mn mobile gum gya h, mobile gir gya h, trace mobile phone, track lost phone, mobile phone lost, online complain system, sindh police, Dic branch korangi, korangi police, cdr, cdr analyzer, mobile snatching report sindh, online mobile theft complaint karachi, lost mobile report sindh police, stolen mobile registration sindh, mobile recovery portal sindh police, advanced CDR analyzer pakistan, police CDR analysis tool, CDR format converter sindh police, IMEI database search sindh, PTA mobile lookup online, Sindh Police portal, kpts, kpts sindh police, digital justice sindh",
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
        <div id="global-loader" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a2c4e] transition-opacity duration-700">
          
          {/* 📱 Mobile App (Capacitor) - Show Full Screen Image */}
          <div className="absolute inset-0 w-full h-full overflow-hidden hidden [.is-native_&]:block">
             <img 
               src="/waseem.jpg" 
               alt="Sindh Police Welcome" 
               className="w-full h-full object-cover" 
             />
             <div className="absolute inset-0 bg-[#0a2c4e]/30"></div>
          </div>

          {/* 💻 Website (Browser) - Simple Loading (Like Dell) */}
          <div className="relative z-10 flex flex-col items-center [.is-native_&]:mb-20 [.is-native_&]:mt-auto">
            <div className="flex flex-col items-center gap-3">
                <span className="text-white text-lg font-light tracking-[0.5em] animate-pulse [.is-native_&]:hidden">
                    LOADING
                </span>
                <div className="w-24 h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 animate-[loading-bar_1.5s_infinite_ease-in-out]"></div>
                </div>
            </div>
          </div>
          
          <Script id="native-check" strategy="beforeInteractive">
            {`
              if (window.Capacitor && window.Capacitor.getPlatform() !== 'web') {
                document.body.classList.add('is-native');
              }
            `}
          </Script>
          
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes loading-bar {
              0% { width: 0%; transform: translateX(-100%); }
              50% { width: 70%; transform: translateX(50%); }
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
                }, 1000);
              }
            }
            
            // Ensure loader hides when content is ready
            if (document.readyState === 'complete') {
              hideLoader();
            } else {
              window.addEventListener('load', hideLoader);
              // Safety timeout: 6 seconds (reduced from 8)
              setTimeout(hideLoader, 6000);
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
        {/* 🚀 Top Loading Bar (for page switching) */}
        <div id="page-loader" className="fixed top-0 left-0 right-0 z-[10000] h-[3px] bg-transparent pointer-events-none">
          <div className="h-full bg-blue-500 w-0 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
        </div>

        <Script id="route-loader" strategy="afterInteractive">
          {`
            (function() {
              var bar = document.querySelector('#page-loader > div');
              var progress = 0;
              var timer = null;

              function start() {
                if (!bar) return;
                progress = 0;
                bar.style.width = '0%';
                bar.style.opacity = '1';
                bar.style.transition = 'width 0.4s ease-out, opacity 0.2s';
                
                clearInterval(timer);
                timer = setInterval(() => {
                  if (progress < 90) {
                    progress += (90 - progress) * 0.1;
                    bar.style.width = progress + '%';
                  }
                }, 200);
              }
              
              function stop() {
                clearInterval(timer);
                if (bar) {
                  bar.style.width = '100%';
                  setTimeout(() => {
                    bar.style.opacity = '0';
                    setTimeout(() => { bar.style.width = '0%'; }, 300);
                  }, 200);
                }
              }

              // 🕵️ Monkey-patch history to detect ALL navigations (router.push, links, back/forward)
              const originalPush = window.history.pushState;
              const originalReplace = window.history.replaceState;

              window.history.pushState = function() {
                start();
                return originalPush.apply(window.history, arguments);
              };

              window.history.replaceState = function() {
                start();
                return originalReplace.apply(window.history, arguments);
              };

              window.addEventListener('popstate', start);

              // Observe DOM changes to stop the loader (when new page content arrives)
              var observer = new MutationObserver(() => {
                if (progress > 0) stop();
              });
              observer.observe(document.body, { childList: true, subtree: true });

              // Handle standard clicks as well
              document.addEventListener('click', function(e) {
                var target = e.target.closest('a');
                if (target && target.href && !target.href.includes('#') && !target.target && target.origin === window.location.origin) {
                  start();
                }
              });
            })();
          `}
        </Script>

        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}
