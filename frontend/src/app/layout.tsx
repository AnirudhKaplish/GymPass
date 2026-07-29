import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import InteractiveBackground from "../components/InteractiveBackground";
import CinematicContentWrapper from "../components/CinematicContentWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
        
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
