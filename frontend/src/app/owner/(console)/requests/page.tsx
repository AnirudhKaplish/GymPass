'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Payment, ownerApi } from '../../../../lib/api';
import { PLAN_TYPE_LABEL, formatCurrency, formatDateTime } from '../../../../lib/utils';
import { Empty, ErrorBox, PageTitle, Spinner } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

export default function RequestsPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [items, setItems] = useState<Payment[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!gymId) return;
    try {
      setItems(await ownerApi.requests(gymId));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests');
    }
  }, [gymId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    setError('');
    try {
      if (action === 'approve') await ownerApi.approveRequest(id);
      else await ownerApi.rejectRequest(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the request');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!gym) return null;

  return (
    <>
      <PageTitle title="Cash requests" subtitle="Approve once you have received the cash. The plan starts immediately." />
      <ErrorBox message={error} />
      {!items ? <Spinner /> : items.length === 0 ? <Empty text="No pending requests" /> : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="card-charcoal p-4 bg-[#111111] flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-black text-white">{r.user_name || 'Member'} <span className="text-[#A0A0A0] font-mono text-xs font-normal">{r.user_phone}</span></div>
                <div className="text-[11px] text-[#A0A0A0] mt-0.5">
                  {r.plan_name} · {PLAN_TYPE_LABEL[r.plan_type] || r.plan_type}{r.plan_type === 'hourly' ? ` · ${r.hours}h` : ''} · {formatDateTime(r.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black font-mono text-[#FFD54A]">₹{formatCurrency(r.amount)}</span>
                <button onClick={() => act(r.id, 'approve')} disabled={busyId !== null} className="btn-red px-4 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5">
                  {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Cash received
                </button>
                <button onClick={() => act(r.id, 'reject')} disabled={busyId !== null} className="btn-dark-red px-4 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
