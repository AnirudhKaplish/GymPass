'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CreditCard, Gauge, HandCoins, Loader2, LogOut, Menu, ScanLine, Settings, Tags, Users, History, X } from 'lucide-react';
import { Gym, clearAuthToken, getAuthToken, getRole, isAuthError, ownerApi } from '../../../lib/api';
import { OwnerContext } from '../../../components/OwnerContext';

const NAV = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: Gauge },
  { href: '/owner/scan', label: 'Scan QR', icon: ScanLine },
  { href: '/owner/requests', label: 'Cash requests', icon: HandCoins },
  { href: '/owner/plans', label: 'Plans & prices', icon: Tags },
  { href: '/owner/members', label: 'Members', icon: Users },
  { href: '/owner/sessions', label: 'Visits', icon: History },
  { href: '/owner/payments', label: 'Payments', icon: CreditCard },
  { href: '/owner/settings', label: 'Gym settings', icon: Settings },
];

const GYM_KEY = 'gympass_active_gym';

export default function OwnerConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymId, setGymId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = useCallback(() => {
    clearAuthToken();
    router.replace('/owner/login');
  }, [router]);

  const reloadGyms = useCallback(async () => {
    try {
      const list = await ownerApi.listGyms();
      setGyms(list);
      setGymId((current) => {
        if (current && list.some((g) => g.id === current)) return current;
        let saved = 0;
        try { saved = Number(localStorage.getItem(GYM_KEY)) || 0; } catch { /* optional */ }
        if (saved && list.some((g) => g.id === saved)) return saved;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      if (isAuthError(err)) logout();
    }
  }, [logout]);

  useEffect(() => {
    if (!getAuthToken() || getRole() !== 'owner') {
      router.replace('/owner/login');
      return;
    }
    reloadGyms().finally(() => setReady(true));
  }, [router, reloadGyms]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const selectGym = (id: number) => {
    setGymId(id);
    try { localStorage.setItem(GYM_KEY, String(id)); } catch { /* optional */ }
  };

  const gym = gyms.find((g) => g.id === gymId) ?? null;

  // A new owner has no gym yet: send them to register one first.
  useEffect(() => {
    if (ready && gyms.length === 0 && pathname !== '/owner/gyms/new') router.replace('/owner/gyms/new');
  }, [ready, gyms.length, pathname, router]);

  if (!ready) {
    return <div className="flex-grow flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" /></div>;
  }

  const sidebar = (
    <div className="flex flex-col gap-6 h-full">
      <Link href="/owner/dashboard" className="flex items-center gap-2 px-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="GymPass" className="h-9 w-auto object-contain" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD54A] border border-[#FFD54A]/30 px-2 py-0.5 rounded">Owner</span>
      </Link>

      {gyms.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gym-switch" className="text-[9px] font-black uppercase tracking-widest text-[#A0A0A0]">Active gym</label>
          <select id="gym-switch" value={gymId ?? ''} onChange={(e) => selectGym(Number(e.target.value))} className="input-performance px-3 py-2.5 text-xs font-bold">
            {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Link href="/owner/gyms/new" className="text-[10px] font-black uppercase tracking-wider text-[#FFD54A] hover:underline">+ Register another gym</Link>
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href}
              className={`px-3 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-2.5 transition-colors ${active ? 'bg-[#FFD54A]/10 text-[#FFD54A]' : 'text-[#A0A0A0] hover:text-white hover:bg-white/5'}`}>
              <n.icon className="w-4 h-4" /> {n.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="mt-auto px-3 py-2.5 text-[11px] font-black uppercase tracking-wider flex items-center gap-2.5 text-[#A0A0A0] hover:text-[#E10600]">
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  );

  return (
    <OwnerContext.Provider value={{ gyms, gym, selectGym, reloadGyms }}>
      <div className="flex-grow flex min-h-screen text-white">
        <aside className="hidden md:flex w-64 shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-black/60 backdrop-blur-md p-5 sticky top-0 h-screen overflow-y-auto">
          <div className="w-full">{sidebar}</div>
        </aside>

        <div className="flex-grow flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-black/60 backdrop-blur-md sticky top-0 z-30">
            <span className="text-xs font-black uppercase tracking-widest truncate">{gym?.name ?? 'GymPass Owner'}</span>
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
          </header>

          {menuOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setMenuOpen(false)}>
              <div className="w-72 max-w-[85vw] h-full bg-[#0b0b0b] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute top-4 right-4 md:hidden"><X className="w-5 h-5" /></button>
                {sidebar}
              </div>
            </div>
          )}

          <main className="flex-grow p-4 md:p-8 flex flex-col gap-6 max-w-6xl w-full">
            {gym || pathname === '/owner/gyms/new' || pathname === '/owner/gyms' ? <React.Fragment key={gym?.id ?? 'none'}>{children}</React.Fragment> : null}
          </main>
        </div>
      </div>
    </OwnerContext.Provider>
  );
}
