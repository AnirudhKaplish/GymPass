'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { formatDate, formatTime } from '../../../lib/utils';
import { Loader2 } from 'lucide-react';

export default function RedesignedAdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      const res = await adminApi.listSessions();
      setSessions(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const formatDuration = (sec: number | null) => {
    if (!sec) return 'Active';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">Floor Sessions</h1>
        <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Review real-time access events and workout sessions durations</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="card-charcoal rounded-xl overflow-hidden bg-[#111111] border border-[rgba(255,255,255,0.08)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
            <span className="text-xs text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Loading logs...</span>
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[9px]">
                  <th className="py-4 px-6">User / Contact</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Entry Time</th>
                  <th className="py-4 px-6">Exit Time</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6 text-right">Access Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#A0A0A0]">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white uppercase text-[10px]">{s.user_name || 'Athlete'}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{s.user_phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {formatDate(s.entry_time)}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-[10px]">
                      {formatTime(s.entry_time)}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-[10px]">
                      {s.exit_time 
                        ? formatTime(s.exit_time) 
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-300 font-mono">
                      {formatDuration(s.duration_seconds)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {s.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded bg-[#E10600]/10 border border-[#E10600]/25 text-[#E10600] text-[8px] font-bold uppercase tracking-wider animate-pulse">
                          On Floor
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded bg-black border border-[rgba(255,255,255,0.08)] text-slate-500 text-[8px] font-bold uppercase tracking-wider">
                          Done
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-[#A0A0A0] text-xs">
            No check-in actions recorded yet.
          </div>
        )}
      </div>
    </main>
  );
}
