'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, MapPin, Home, Loader2, User, X } from 'lucide-react';
import { AppNotification, clearAuthToken, getAuthToken, getRole, isAuthError, userApi } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const logout = useCallback(() => {
    clearAuthToken();
    router.replace('/auth');
  }, [router]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await userApi.getNotifications();
      setNotifications(res.notifications);
      setUnread(res.unread);
    } catch (err) {
      if (isAuthError(err)) logout();
    }
  }, [logout]);

  useEffect(() => {
    if (!getAuthToken() || getRole() !== 'user') {
      router.replace('/auth');
      return;
    }
    setReady(true);
    loadNotifications();
    const t = setInterval(loadNotifications, 60000);
    return () => clearInterval(t);
  }, [router, loadNotifications]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggleBell = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await userApi.markNotificationsRead([]);
        setUnread(0);
      } catch {
        /* the list is still shown */
      }
    }
  };

  if (!ready) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
      </div>
    );
  }

  const nav = [
    { href: '/dashboard', label: 'My Memberships', icon: Home, active: pathname === '/dashboard' },
    { href: '/dashboard/gyms', label: 'Gyms', icon: MapPin, active: pathname.startsWith('/dashboard/gyms') },
    { href: '/dashboard/profile', label: 'Profile', icon: User, active: pathname === '/dashboard/profile' },
  ];

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-transparent text-white">
      <header className="border-b border-[rgba(255,255,255,0.08)] py-3 px-4 md:px-12 flex items-center justify-between bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="GymPass" className="h-9 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                n.active ? 'text-[#FFD54A] bg-[#FFD54A]/10' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              <n.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 relative" ref={panelRef}>
          <button onClick={toggleBell} aria-label="Notifications" className="relative p-2 text-[#A0A0A0] hover:text-white">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#E10600] text-[9px] font-black flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button onClick={logout} aria-label="Log out" className="hidden md:block p-2 text-[#A0A0A0] hover:text-[#E10600]">
            <LogOut className="w-5 h-5" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[min(92vw,360px)] card-charcoal bg-[#111111] z-50 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD54A]">Notifications</span>
                <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4 text-[#A0A0A0]" /></button>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-[10px] text-[#A0A0A0] uppercase font-bold tracking-widest">Nothing yet</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <div className="text-xs font-extrabold text-white">{n.title}</div>
                    <div className="text-[11px] text-[#A0A0A0] mt-0.5 leading-relaxed">{n.message}</div>
                    <div className="text-[9px] text-[#A0A0A0]/60 font-mono mt-1">{formatDateTime(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-grow flex flex-col pb-20 md:pb-0">{children}</div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center gap-1 py-3 text-[10px] font-black uppercase tracking-wider ${n.active ? 'text-[#FFD54A]' : 'text-[#A0A0A0]'}`}
          >
            <n.icon className="w-5 h-5" />
            {n.label === 'My Memberships' ? 'Home' : n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
