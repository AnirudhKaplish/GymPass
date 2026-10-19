'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Clock, History, Loader2, Maximize2, MapPin, QrCode, ShieldAlert, X } from 'lucide-react';
import { Membership, UserDashboard, userApi } from '../../lib/api';
import { PLAN_TYPE_LABEL, daysLeft, formatDate, formatHM, formatTime } from '../../lib/utils';

const QR_LIFETIME = 60;

function MembershipCard({ m, liveSession, now }: { m: Membership; liveSession: UserDashboard['active_session']; now: number }) {
  const hourly = m.plan_type === 'hourly';
  const inside = liveSession && liveSession.membership_id === m.id;
  // While the member is inside, show the prepaid balance running down.
  const elapsed = inside && hourly ? Math.max(0, Math.floor((now - new Date(liveSession!.entry_time).getTime()) / 1000)) : 0;
  const remaining = Math.max(0, m.remaining_seconds - elapsed);
  const days = daysLeft(m.end_date);
  const expiring = m.status === 'active' && ((days !== null && days <= 3) || (hourly && remaining > 0 && remaining <= 2 * 3600));
  const pct = hourly && m.total_seconds > 0 ? Math.round((remaining / m.total_seconds) * 100) : null;

  return (
    <div className={`card-charcoal p-5 bg-[#111111] flex flex-col gap-4 ${m.status === 'expired' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/dashboard/gyms/${m.gym_id}`} className="text-sm font-black text-white uppercase tracking-tight hover:text-[#FFD54A] block truncate">
            {m.gym_name || 'Gym'}
          </Link>
          <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">{m.plan_name} · {PLAN_TYPE_LABEL[m.plan_type] || m.plan_type}</span>
        </div>
        {inside ? (
          <span className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] animate-pulse shrink-0">Inside now</span>
        ) : (
          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider shrink-0 border ${
            m.status === 'active' ? 'bg-[#31C46C]/10 border-[#31C46C]/30 text-[#31C46C]' : 'bg-white/5 border-white/10 text-[#A0A0A0]'
          }`}>{m.status}</span>
        )}
      </div>

      {hourly ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest">Hours left</span>
            <span className="text-2xl font-black font-mono text-[#FFD54A]">{formatHM(remaining)}</span>
          </div>
          {pct !== null && (
            <div className="h-1.5 rounded-full bg-black overflow-hidden">
              <div className="h-full bg-[#FFD54A]" style={{ width: `${pct}%` }} />
            </div>
          )}
          <span className="text-[9px] text-[#A0A0A0]">
            Only the time you spend inside is deducted, across any number of days.
            {m.end_date ? ` Valid until ${formatDate(m.end_date)}.` : ''}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest">
              {m.status === 'active' ? 'Time remaining' : 'Ended'}
            </span>
            <span className="text-2xl font-black font-mono text-[#FFD54A]">
              {m.status === 'active' && days !== null ? (days <= 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'}`) : formatDate(m.end_date)}
            </span>
          </div>
          <span className="text-[9px] text-[#A0A0A0] font-mono">
            {formatDate(m.start_date)} → {formatDate(m.end_date)}
          </span>
        </div>
      )}

      {m.status === 'expired' && (
        <Link href={`/dashboard/gyms/${m.gym_id}`} className="text-[10px] font-black uppercase tracking-wider text-[#FFD54A] hover:underline">Buy again</Link>
      )}

      {expiring && (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#E10600]">
          <AlertTriangle className="w-3.5 h-3.5" /> {hourly ? 'Running low' : 'Ending soon'}
          <Link href={`/dashboard/gyms/${m.gym_id}`} className="ml-auto text-[#FFD54A] hover:underline">Renew</Link>
        </div>
      )}
    </div>
  );
}

export default function MemberDashboard() {
  const [data, setData] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [qrLeft, setQrLeft] = useState(QR_LIFETIME);
  const [now, setNow] = useState(() => Date.now());
  const [qrFull, setQrFull] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await userApi.getDashboard());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your memberships');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQR = useCallback(async () => {
    try {
      const res = await userApi.getQRToken();
      setQrToken(res.token);
      setQrLeft(res.expires_in);
    } catch {
      setQrToken('');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    refreshQR();
  }, [refreshQR]);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setQrLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (qrLeft <= 0) {
      setQrLeft(QR_LIFETIME);
      refreshQR();
    }
  }, [qrLeft, refreshQR]);

  const cancel = async (id: number) => {
    try {
      await userApi.cancelRequest(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the request');
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
      </div>
    );
  }

  const memberships = data?.memberships ?? [];
  const active = memberships.filter((m) => m.status === 'active');
  const past = memberships.filter((m) => m.status !== 'active');
  const session = data?.active_session ?? null;
  const pending = data?.pending_requests ?? [];

  return (
    <main className="flex-grow max-w-6xl w-full mx-auto p-4 md:p-10 flex flex-col gap-6 relative z-10">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Welcome back</span>
        <h1 className="text-2xl font-black uppercase tracking-tight">{data?.user?.name || 'Athlete'}</h1>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</div>}

      {session && (
        <div className="card-charcoal p-4 bg-[#111111] border-[#E10600]/30 flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#E10600] animate-pulse" />
          <div className="text-xs">
            <div className="font-black uppercase tracking-wider text-white">You are inside {session.gym_name}</div>
            <div className="text-[#A0A0A0] font-mono">
              Since {formatTime(session.entry_time)} · {formatHM((now - new Date(session.entry_time).getTime()) / 1000)} so far. Scan the QR again on your way out.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Your memberships</h2>
            <Link href="/dashboard/gyms" className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0] hover:text-white inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Find gyms
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="card-charcoal p-10 bg-[#111111] flex flex-col items-center text-center gap-3">
              <ShieldAlert className="w-8 h-8 text-[#E10600]" strokeWidth={1.5} />
              <span className="text-xs font-black uppercase tracking-widest">No active membership</span>
              <p className="text-[11px] text-[#A0A0A0] max-w-xs leading-relaxed">Find a gym near you and buy hours, a month or a year of access.</p>
              <Link href="/dashboard/gyms" className="px-6 py-3 btn-red text-xs font-black mt-1">Browse gyms</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map((m) => <MembershipCard key={m.id} m={m} liveSession={session} now={now} />)}
            </div>
          )}

          {pending.length > 0 && (
            <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Waiting for gym approval</h3>
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-black/60 border border-[rgba(255,255,255,0.04)] rounded-lg text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{p.gym_name} · {p.plan_name}{p.plan_type === 'hourly' ? ` (${p.hours}h)` : ''}</div>
                    <div className="text-[10px] text-[#A0A0A0]">Cash ₹{p.amount}. Pay at the desk and the owner will activate it.</div>
                  </div>
                  <button onClick={() => cancel(p.id)} aria-label="Cancel request" className="p-2 text-[#A0A0A0] hover:text-[#E10600]"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#A0A0A0]">Past memberships</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.slice(0, 6).map((m) => <MembershipCard key={m.id} m={m} liveSession={null} now={now} />)}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="card-charcoal p-6 flex flex-col items-center gap-4 bg-[#111111]">
            <div className="flex items-center gap-2 self-start">
              <QrCode className="w-4 h-4 text-[#FFD54A]" />
              <h3 className="text-xs font-black uppercase tracking-widest">Gym entry QR</h3>
            </div>
            <div className="p-4 bg-white rounded-xl border border-[#FFD54A]/30">
              {active.length > 0 && qrToken ? (
                <QRCodeSVG value={qrToken} size={200} level="M" fgColor="#050505" />
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-center gap-2 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                  {active.length === 0 ? 'Buy a membership to unlock your QR' : 'Refreshing…'}
                </div>
              )}
            </div>
            {active.length > 0 && qrToken && (
              <button onClick={() => setQrFull(true)} className="btn-gold px-4 py-2.5 text-[10px] font-black inline-flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5" /> Show full screen
              </button>
            )}
            {active.length > 0 && (
              <div className="text-center flex flex-col gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest">Scan at the gym to punch in, again to punch out</span>
                <span className="text-[9px] text-[#A0A0A0] font-mono">New code in {Math.max(0, qrLeft)}s · works once</span>
              </div>
            )}
          </div>

          <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
              <History className="w-4 h-4 text-[#FFD54A]" />
              <h3 className="text-xs font-black uppercase tracking-widest">Recent workouts</h3>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {(data?.sessions ?? []).length === 0 ? (
                <div className="text-center py-6 text-[10px] text-[#A0A0A0] uppercase font-bold tracking-widest">No workouts yet</div>
              ) : (
                (data?.sessions ?? []).slice(0, 8).map((s) => (
                  <div key={s.id} className="p-3 bg-black/60 border border-[rgba(255,255,255,0.04)] rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{s.gym_name}</div>
                      <div className="text-[9px] text-[#A0A0A0] font-mono">{formatDate(s.entry_time)} · {formatTime(s.entry_time)}–{s.exit_time ? formatTime(s.exit_time) : 'now'}</div>
                    </div>
                    <div className="text-right">
                      {s.status === 'active' ? (
                        <span className="text-[#E10600] font-black uppercase text-[9px] tracking-widest animate-pulse">Inside</span>
                      ) : (
                        <>
                          <div className="font-bold font-mono">{formatHM(s.duration_seconds ?? 0)}</div>
                          {s.hours_deducted ? <div className="text-[9px] text-[#A0A0A0] font-mono">−{s.hours_deducted.toFixed(2)}h</div> : null}
                          {s.status === 'auto_closed' && <div className="text-[8px] text-[#E10600] uppercase font-black">Auto-closed</div>}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {qrFull && qrToken && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6 p-6" onClick={() => setQrFull(false)}>
          <button aria-label="Close" className="absolute top-5 right-5 p-2 text-slate-700"><X className="w-7 h-7" /></button>
          <QRCodeSVG value={qrToken} size={Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 64 : 320)} level="M" fgColor="#050505" />
          <div className="text-center text-slate-900">
            <div className="text-sm font-black uppercase tracking-widest">Show this at the gym</div>
            <div className="text-xs font-mono mt-1 text-slate-600">New code in {Math.max(0, qrLeft)}s · tap anywhere to close</div>
          </div>
        </div>
      )}
    </main>
  );
}
