'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { Gym, assetUrl, userApi } from '../../../lib/api';
import { Coords, getCurrentPosition } from '../../../lib/geo';
import { formatCurrency, formatDistance } from '../../../lib/utils';

const COORDS_KEY = 'gympass_coords';

function fromPrice(g: Gym): string | null {
  const prices = (g.plans ?? []).filter((p) => p.status === 'active' && p.is_visible).map((p) => p.price);
  if (prices.length === 0) return null;
  return `from ₹${formatCurrency(Math.min(...prices))}`;
}

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationNote, setLocationNote] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  const locate = async () => {
    setLocating(true);
    setLocationNote('');
    try {
      const c = await getCurrentPosition();
      setCoords(c);
      try { sessionStorage.setItem(COORDS_KEY, JSON.stringify(c)); } catch { /* optional */ }
    } catch (err) {
      setLocationNote(err instanceof Error ? err.message : 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    locate();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (locating) return;
    let cancelled = false;
    setLoading(true);
    userApi
      .listGyms({ ...(coords ?? {}), q: debounced })
      .then((res) => { if (!cancelled) { setGyms(res); setError(''); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load gyms'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [coords, debounced, locating]);

  return (
    <main className="flex-grow max-w-6xl w-full mx-auto p-4 md:p-10 flex flex-col gap-6 relative z-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Gyms</h1>
          <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">
            {coords ? 'Nearest to you first' : 'Showing all gyms'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={locate} aria-label="Use my location" className="p-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#FFD54A]">
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setQuery(''); }}
            aria-label="Search gyms"
            className={`p-2.5 rounded-lg border ${searchOpen ? 'border-[#FFD54A] text-[#FFD54A]' : 'border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#FFD54A]'}`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by gym name, area or city"
            className="input-performance w-full pl-9 pr-9 py-3 text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {locationNote && (
        <div className="text-[11px] text-[#A0A0A0] border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
          {locationNote}. Allow location access to sort gyms by distance, or search by name.
        </div>
      )}
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</div>}

      {loading || locating ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" /></div>
      ) : gyms.length === 0 ? (
        <div className="card-charcoal p-10 bg-[#111111] text-center text-xs text-[#A0A0A0] font-bold uppercase tracking-widest">
          {debounced ? `No gyms match “${debounced}”` : 'No gyms have registered yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gyms.map((g) => {
            const photo = g.photos?.[0];
            const price = fromPrice(g);
            return (
              <Link key={g.id} href={`/dashboard/gyms/${g.id}`} className="card-charcoal bg-[#111111] overflow-hidden flex flex-col">
                <div className="h-36 bg-black relative">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(photo.url)} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#FFD54A]/30"><MapPin className="w-10 h-10" /></div>
                  )}
                  {g.distance_km !== undefined && (
                    <span className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 text-[10px] font-black text-[#FFD54A] font-mono">{formatDistance(g.distance_km)}</span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase tracking-tight truncate">{g.name}</h3>
                  <span className="text-[11px] text-[#A0A0A0] line-clamp-2">{g.address}{g.city ? `, ${g.city}` : ''}</span>
                  <div className="flex justify-between items-center mt-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-[#A0A0A0] font-mono">{g.opening_time}–{g.closing_time}</span>
                    {price && <span className="text-[#FFD54A]">{price}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
