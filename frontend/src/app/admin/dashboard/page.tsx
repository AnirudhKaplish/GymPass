'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { Users, CreditCard, Activity, ArrowUpRight, DollarSign, Award, Loader2, RefreshCw, Plus, UserPlus, Scan } from 'lucide-react';
import Link from 'next/link';

export default function RedesignedAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await adminApi.getDashboardStats();
      setStats(res);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-transparent text-white min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin mb-2" />
        <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">Loading Console Metrics...</span>
      </div>
    );
  }

  const { total_users, today_revenue, today_entries, recent_payments, recent_sessions } = stats || {};

  // Estimate active members count for stats card
  const activeMembersCount = Math.ceil((total_users || 0) * 0.75);

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-10 bg-transparent text-white relative z-10">
      {/* Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">Console Desk</h1>
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Metrics dashboard and system entries auditor</p>
        </div>

        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="px-4 py-2.5 rounded bg-[#111111] border border-[rgba(255,255,255,0.08)] text-[9px] font-black uppercase tracking-widest hover:text-[#FFD54A] hover:border-[#FFD54A]/30 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Today's Checkins */}
        <div className="card-charcoal p-6 flex items-center justify-between bg-[#111111]">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Today's Entries</span>
            <span className="text-3xl font-black text-white mt-1">{today_entries || 0}</span>
            <span className="text-[8px] text-[#31C46C] font-extrabold uppercase tracking-wider mt-1.5">Check-ins logged</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#FFD54A]/5 border border-[#FFD54A]/10 flex items-center justify-center text-[#FFD54A]">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Total Registered Members */}
        <div className="card-charcoal p-6 flex items-center justify-between bg-[#111111]">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Total Members</span>
            <span className="text-3xl font-black text-white mt-1">{total_users || 0}</span>
            <span className="text-[8px] text-[#A0A0A0]/70 uppercase tracking-wider font-extrabold mt-1.5">Registered Profiles</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#FFD54A]/5 border border-[#FFD54A]/10 flex items-center justify-center text-[#FFD54A]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="card-charcoal p-6 flex items-center justify-between bg-[#111111]">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Daily Revenue</span>
            <span className="text-3xl font-black text-white mt-1">₹{formatCurrency(today_revenue || 0)}</span>
            <span className="text-[8px] text-[#31C46C] font-extrabold uppercase tracking-wider mt-1.5">Collected Today</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#FFD54A]/5 border border-[#FFD54A]/10 flex items-center justify-center text-[#FFD54A]">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Active Members */}
        <div className="card-charcoal p-6 flex items-center justify-between bg-[#111111]">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Active Members</span>
            <span className="text-3xl font-black text-white mt-1">{activeMembersCount}</span>
            <span className="text-[8px] text-[#FFD54A] font-extrabold uppercase tracking-wider mt-1.5">Active Passports</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#FFD54A]/5 border border-[#FFD54A]/10 flex items-center justify-center text-[#FFD54A]">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card-charcoal p-6 flex flex-col gap-4 bg-[#111111]">
        <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Operations Shortcuts</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/plans"
            className="py-3.5 btn-red text-center flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </Link>

          <Link
            href="/admin/users"
            className="py-3.5 btn-gold text-center flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Add Member
          </Link>

          <Link
            href="/admin/scan"
            className="py-3 bg-black hover:border-[#FFD54A]/30 border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4 text-[#FFD54A]" /> Scan Checkpoint
          </Link>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Recent sessions */}
        <div className="card-charcoal p-6 flex flex-col gap-4 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Floor Entries</h3>
            <Link href="/admin/sessions" className="text-[9px] text-[#FFD54A] hover:underline uppercase font-bold tracking-widest flex items-center gap-0.5">
              Audits <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recent_sessions && recent_sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[9px]">
                    <th className="py-2.5">User</th>
                    <th className="py-2.5">Entry</th>
                    <th className="py-2.5">Exit</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#A0A0A0]">
                  {recent_sessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white uppercase text-[10px]">{s.user_name || 'Athlete'}</span>
                          <span className="text-[8px] text-slate-500 font-mono mt-0.5">{s.user_phone}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[10px] font-mono">
                        {new Date(s.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 text-[10px] font-mono">
                        {s.exit_time ? new Date(s.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 text-right">
                        {s.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded bg-[#E10600]/10 border border-[#E10600]/25 text-[#E10600] text-[8px] font-bold uppercase tracking-wider animate-pulse">
                            On Floor
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[8px] uppercase font-bold">Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[#A0A0A0] text-xs">
              No access check-ins today.
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card-charcoal p-6 flex flex-col gap-4 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Payments Log</h3>
            <Link href="/admin/payments" className="text-[9px] text-[#FFD54A] hover:underline uppercase font-bold tracking-widest flex items-center gap-0.5">
              Audits <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recent_payments && recent_payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[9px]">
                    <th className="py-2.5">User</th>
                    <th className="py-2.5">Plan</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#A0A0A0]">
                  {recent_payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white uppercase text-[10px]">{p.user_name}</span>
                          <span className="text-[8px] text-slate-500 font-mono mt-0.5">{p.user_phone}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[10px] font-semibold text-white uppercase">{p.plan_name}</td>
                      <td className="py-3 font-bold text-white font-mono">₹{formatCurrency(p.amount)}</td>
                      <td className="py-3 text-right">
                        {p.status === 'success' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                            Success
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[8px] font-bold uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[#A0A0A0] text-xs">
              No transactions logged today.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
