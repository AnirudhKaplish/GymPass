import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import InteractiveBackground from "../components/InteractiveBackground";
import CinematicContentWrapper from "../components/CinematicContentWrapper";
import ServiceWorker from "../components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "GymPass",
  appleWebApp: { capable: true, title: "GymPass", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  title: "GymPass | Premium Subscriptions & Hourly Packs",
  description: "Experience modern gym subscription and hourly pack access check-ins powered by GymPass.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-white relative">
        {/* Cinematic Parallax Layers */}
        <InteractiveBackground />
        
        {/* Perspective content container */}
        <CinematicContentWrapper>
          {children}
        </CinematicContentWrapper>
        
        <ServiceWorker />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
