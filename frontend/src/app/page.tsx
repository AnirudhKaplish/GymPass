'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell, QrCode, Clock, MapPin } from 'lucide-react';

export default function RedesignedLandingPage() {
  return (
    <div className="flex-grow flex flex-col justify-between min-h-screen bg-transparent text-white relative z-10">
      {/* Top Navbar */}
      <header className="border-b border-[rgba(255,255,255,0.08)] py-6 px-6 md:px-16 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="GymPass Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-[#A0A0A0]">
          <span className="hover:text-white transition-colors cursor-pointer">Support</span>
          <span className="hover:text-white transition-colors cursor-pointer">Contact</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 md:px-16 py-16 md:py-28 flex flex-col justify-center gap-8 text-center max-w-3xl">
        <div className="flex flex-col gap-4">
          <span className="text-[10px] md:text-xs font-black tracking-[0.2em] text-[#FFD54A] uppercase">
            STRONGER MEMBERSHIP. BETTER YOU.
          </span>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-white select-none">
            GYM<span className="text-[#E10600]">PASS</span>
          </h1>
          <p className="text-sm md:text-base font-extrabold text-[#A0A0A0] uppercase tracking-[0.15em] max-w-xl mx-auto mt-2">
            One pass. Every gym near you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <Link
            href="/auth"
            className="px-10 py-4.5 btn-red text-xs font-black shadow-xl flex items-center justify-center gap-2 max-w-[240px] w-full"
          >
            Find a gym
          </Link>
          <Link
            href="/owner/login"
            className="px-10 py-4.5 btn-gold text-xs font-black shadow-xl flex items-center justify-center gap-2 max-w-[240px] w-full"
          >
            I own a gym
          </Link>
        </div>

        {/* Feature list blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left max-w-5xl mx-auto w-full">
          {/* Card 1 */}
          <div className="card-charcoal p-6 flex flex-col gap-3 bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl">
            <div className="w-9 h-9 bg-black rounded-lg border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#FFD54A]">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider mt-1">QR Access Keys</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Sign in, show your QR and get punched in at the gym. Scan again on the way out to stop the clock.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card-charcoal p-6 flex flex-col gap-3 bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl">
            <div className="w-9 h-9 bg-black rounded-lg border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#FFD54A]">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider mt-1">Hourly Passes</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Buy hours, months or years. Prepaid hours only count the time you actually spend inside, over any number of days.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card-charcoal p-6 flex flex-col gap-3 bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl">
            <div className="w-9 h-9 bg-black rounded-lg border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#FFD54A]">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider mt-1">Nearest gyms</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Browse gyms on the map, pay with GPay, Paytm or UPI, or pay cash and let the owner approve. Get a reminder before your plan ends.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.08)] py-8 px-6 md:px-16 flex flex-col md:flex-row items-center justify-between text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider bg-[#050505]/40 gap-4">
        <span>© {new Date().getFullYear()} GymPass Corp. All rights reserved.</span>
        <div className="flex gap-6">
          <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
          <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
        </div>
      </footer>
    </div>
  );
}
