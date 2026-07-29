'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, clearAuthToken } from '../../lib/api';
import Link from 'next/link';
import { 
  Dumbbell, LayoutDashboard, Users, CreditCard, Activity, Settings, 
  Scan, LogOut, ShieldCheck, Menu, X, Loader2, Bell
} from 'lucide-react';

export default function RedesignedAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/auth') {
      setLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') {
        clearAuthToken();
        router.push('/auth');
        return;
      }
      setAdminEmail(payload.email || 'Admin');
    } catch (e) {
      clearAuthToken();
      router.push('/auth');
      return;
    }

    setLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('gympass_admin_email');
    router.push('/auth');
  };

  if (pathname === '/auth') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-transparent text-white">
        <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin mb-2" />
        <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">Authorizing Admin Console...</span>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/admin/users', icon: Users },
    { name: 'Plans', href: '/admin/plans', icon: Dumbbell },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Sessions Logs', href: '/admin/sessions', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Scan Checkpoint', href: '/admin/scan', icon: Scan },
  ];

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-transparent lg:flex-row text-white relative z-10">
      {/* Mobile Top Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] py-4 px-6 flex items-center justify-between bg-[#111111] sticky top-0 z-40 lg:hidden">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="GymPass Logo" 
            className="h-8 w-auto object-contain"
          />
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`w-full lg:w-64 shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-[#111111] flex flex-col justify-between fixed lg:sticky top-[61px] lg:top-0 h-[calc(100vh-61px)] lg:h-screen z-30 transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col gap-6 py-6 px-4">
          {/* Logo brand */}
          <div className="hidden lg:flex items-center gap-3 px-3 pb-4 border-b border-[rgba(255,255,255,0.08)]">
            <img 
              src="/logo.png" 
              alt="GymPass Logo" 
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Nav list */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                    active 
                      ? 'bg-[#E10600] border-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.3)]' 
                      : 'bg-transparent border-transparent text-[#A0A0A0] hover:text-white hover:bg-black/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-[#FFD54A]" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer logout */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-3 bg-black/20">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[9px] text-[#A0A0A0] font-bold uppercase tracking-wider font-mono">
            <ShieldCheck className="w-4 h-4 text-[#FFD54A] shrink-0" />
            <span className="truncate">{adminEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 btn-dark-red text-xs font-black flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout Console
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-grow flex flex-col overflow-y-auto min-h-screen">
        {/* Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] py-5 px-10 bg-[#111111]/60 backdrop-blur-md z-10 sticky top-0">
          <span className="font-extrabold text-[9px] uppercase tracking-widest text-[#A0A0A0]">
            Gym Operations Management Console
          </span>

          <div className="flex items-center gap-6">
            {/* Mock Notifications */}
            <div className="relative cursor-pointer text-[#A0A0A0] hover:text-white transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#E10600] border-2 border-[#111111] rounded-full" />
            </div>

            <div className="flex items-center gap-2.5 border-l border-[rgba(255,255,255,0.08)] pl-6">
              <div className="w-7 h-7 bg-[#E10600] rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-tighter text-white shadow-[0_0_10px_rgba(225,6,0,0.3)]">
                AD
              </div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Master Admin</span>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
