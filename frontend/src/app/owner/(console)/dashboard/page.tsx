'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HandCoins, LogOut } from 'lucide-react';
import { OwnerDashboard, ownerApi } from '../../../../lib/api';
import { formatCurrency, formatDateTime, formatHM, formatTime } from '../../../../lib/utils';
import { Empty, ErrorBox, PageTitle, Spinner, Stat, StatusPill, Table } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

function hourLabel(h: number) {
  const suffix = h < 12 ? 'a' : 'p';
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${suffix}`;
}

export default function OwnerDashboardPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'today' | 'avg_30d'>('today');
  const [closing, setClosing] = useState<number | null>(null);

  const punchOut = async (sessionId: number, who: string) => {
    if (!window.confirm(`Punch ${who} out now? Prepaid hours will be deducted for the time inside.`)) return;
    setClosing(sessionId);
    try {
      await ownerApi.checkoutSession(sessionId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not punch out');
    } finally {
      setClosing(null);
    }
  };

  const load = useCallback(async () => {
    if (!gymId) return;
    try {
      setData(await ownerApi.dashboard(gymId));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard');
    }
  }, [gymId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  if (!gym) return null;
  if (!data) return error ? <ErrorBox message={error} /> : <Spinner />;

  const values = data.hourly.map((h) => h[mode]);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));

  return (
    <>
      <PageTitle title="Dashboard" subtitle={gym.name} />
      <ErrorBox message={error} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Inside now" value={data.on_floor_now} accent />
        <Stat label="Entries today" value={data.today_entries} />
        <Stat label="Active members" value={data.active_members} hint={`${data.total_members} ever joined`} />
        <Stat label="Ending in 7 days" value={data.expiring_soon} />
        <Stat label="Revenue today" value={`₹${formatCurrency(data.revenue_today)}`} />
        <Stat label="Revenue this month" value={`₹${formatCurrency(data.revenue_month)}`} />
        <Link href="/owner/requests" className="card-charcoal p-4 bg-[#111111] flex flex-col gap-1 col-span-2">
          <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest inline-flex items-center gap-1.5"><HandCoins className="w-3 h-3" /> Cash requests waiting</span>
          <span className={`text-2xl font-black font-mono ${data.pending_requests > 0 ? 'text-[#E10600]' : 'text-white'}`}>{data.pending_requests}</span>
        </Link>
      </div>

      <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">How busy, by hour</h3>
            <span className="text-[10px] text-[#A0A0A0]">
              Members in the gym per hour ({data.timezone}).{values[peak] > 0 ? ` Busiest around ${hourLabel(peak)}.` : ''}
            </span>
          </div>
          <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden text-[10px] font-black uppercase tracking-wider">
            {(['today', 'avg_30d'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-2 ${mode === m ? 'bg-[#FFD54A] text-black' : 'text-[#A0A0A0]'}`}>
                {m === 'today' ? 'Today' : '30-day average'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-1 h-44">
          {values.map((val, h) => (
            <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
              <span className="absolute -top-5 text-[9px] font-mono text-[#FFD54A] opacity-0 group-hover:opacity-100">{val}</span>
              <div className={`w-full rounded-t ${h === peak && val > 0 ? 'bg-[#FFD54A]' : 'bg-[#FFD54A]/40'}`} style={{ height: `${Math.max(val > 0 ? 4 : 1, (val / max) * 100)}%` }} />
              <span className="text-[8px] text-[#A0A0A0] font-mono hidden sm:block">{h % 3 === 0 ? hourLabel(h) : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">In the gym right now</h3>
        {data.on_floor.length === 0 ? <Empty text="Nobody is inside" /> : (
          <Table head={['Member', 'Phone', 'Plan', 'Since', 'Inside for', '']}>
            {data.on_floor.map((s) => (
              <tr key={s.id}>
                <td className="font-bold text-white">{s.user_name}</td>
                <td className="font-mono text-[#A0A0A0]">{s.user_phone}</td>
                <td>{s.plan_name}</td>
                <td className="font-mono">{formatTime(s.entry_time)}</td>
                <td className="font-mono text-[#FFD54A]">{formatHM(s.minutes_inside * 60)}</td>
                <td>
                  <button onClick={() => punchOut(s.id, s.user_name)} disabled={closing === s.id} className="btn-dark-red px-3 py-1.5 text-[9px] font-black inline-flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> Punch out
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Recent visits</h3>
          {data.recent_sessions.length === 0 ? <Empty text="No visits yet" /> : (
            <Table head={['Member', 'In', 'Out', 'Time']}>
              {data.recent_sessions.map((s) => (
                <tr key={s.id}>
                  <td className="font-bold text-white">{s.user_name}</td>
                  <td className="font-mono">{formatDateTime(s.entry_time)}</td>
                  <td className="font-mono">{s.exit_time ? formatTime(s.exit_time) : <StatusPill status="active" />}</td>
                  <td className="font-mono">{s.duration_seconds != null ? formatHM(s.duration_seconds) : '-'}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Recent payments</h3>
          {data.recent_payments.length === 0 ? <Empty text="No payments yet" /> : (
            <Table head={['Member', 'Plan', 'Amount', 'How', 'Status']}>
              {data.recent_payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-bold text-white">{p.user_name}</td>
                  <td>{p.plan_name}</td>
                  <td className="font-mono">₹{formatCurrency(p.amount)}</td>
                  <td className="uppercase text-[10px] font-bold text-[#A0A0A0]">{p.method}</td>
                  <td><StatusPill status={p.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
