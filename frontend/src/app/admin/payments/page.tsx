'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { formatCurrency, formatDate, formatTime } from '../../../lib/utils';
import { Loader2 } from 'lucide-react';

export default function RedesignedAdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    try {
      const res = await adminApi.listPayments();
      setPayments(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">Payments Log</h1>
        <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Audit transactions and verify payments signature statuses</p>
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
            <span className="text-xs text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Loading transactions...</span>
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[9px]">
                  <th className="py-4 px-6">Transaction ID</th>
                  <th className="py-4 px-6">User / Contact</th>
                  <th className="py-4 px-6">Plan Purchased</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#A0A0A0]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white font-mono text-[10px]">{p.razorpay_payment_id || '-'}</span>
                        <span className="text-[9px] text-slate-500 font-mono">Order: {p.razorpay_order_id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white uppercase text-[10px]">{p.user_name}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{p.user_phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-bold uppercase text-[10px]">{p.plan_name}</td>
                    <td className="py-4 px-6 font-bold text-white font-mono">₹{formatCurrency(p.amount)}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {formatDate(p.created_at)} {formatTime(p.created_at)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {p.status === 'success' ? (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[#31C46C] text-[8px] font-bold uppercase tracking-wider">
                          Success
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[8px] font-bold uppercase tracking-wider">
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
          <div className="text-center py-20 text-[#A0A0A0] text-xs">
            No logged payment actions.
          </div>
        )}
      </div>
    </main>
  );
}
