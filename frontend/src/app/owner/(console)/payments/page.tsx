'use client';

import React, { useEffect, useState } from 'react';
import { Payment, ownerApi } from '../../../../lib/api';
import { formatCurrency, formatDateTime } from '../../../../lib/utils';
import { Download } from 'lucide-react';
import { downloadCSV } from '../../../../lib/csv';
import { Empty, ErrorBox, PageTitle, Spinner, StatusPill, Table } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

export default function PaymentsPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [items, setItems] = useState<Payment[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gymId) return;
    ownerApi.payments(gymId).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Could not load payments'));
  }, [gymId]);

  if (!gym) return null;

  return (
    <>
      <PageTitle
        title="Payments"
        subtitle={gym.name}
        action={
          <button
            disabled={!items || items.length === 0}
            onClick={() => items && downloadCSV(`${gym.name}-payments.csv`.replace(/\s+/g, '-'), ['When', 'Member', 'Phone', 'Plan', 'Hours', 'Amount', 'Method', 'Status'],
              items.map((p) => [formatDateTime(p.created_at), p.user_name, p.user_phone, p.plan_name, p.plan_type === 'hourly' ? p.hours : '', p.amount, p.method, p.status]))}
            className="btn-gold px-3 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        }
      />
      <ErrorBox message={error} />
      {!items ? <Spinner /> : items.length === 0 ? <Empty text="No payments yet" /> : (
        <Table head={['When', 'Member', 'Plan', 'Amount', 'How', 'Status']}>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="font-mono">{formatDateTime(p.created_at)}</td>
              <td className="font-bold text-white">{p.user_name}</td>
              <td>{p.plan_name}{p.plan_type === 'hourly' ? ` · ${p.hours}h` : ''}</td>
              <td className="font-mono text-[#FFD54A]">₹{formatCurrency(p.amount)}</td>
              <td className="uppercase text-[10px] font-bold text-[#A0A0A0]">{p.method}</td>
              <td><StatusPill status={p.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
