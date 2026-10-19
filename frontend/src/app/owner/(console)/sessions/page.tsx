'use client';

import React, { useEffect, useState } from 'react';
import { Visit, ownerApi } from '../../../../lib/api';
import { formatDate, formatHM, formatTime } from '../../../../lib/utils';
import { Download } from 'lucide-react';
import { downloadCSV } from '../../../../lib/csv';
import { Empty, ErrorBox, PageTitle, Spinner, StatusPill, Table } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

export default function SessionsPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [items, setItems] = useState<Visit[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gymId) return;
    ownerApi.sessions(gymId).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Could not load visits'));
  }, [gymId]);

  if (!gym) return null;

  return (
    <>
      <PageTitle
        title="Visits"
        subtitle="Every punch in and out"
        action={
          <button
            disabled={!items || items.length === 0}
            onClick={() => items && downloadCSV(`${gym.name}-visits.csv`.replace(/\s+/g, '-'), ['Member', 'Phone', 'Date', 'In', 'Out', 'Minutes', 'Hours used', 'Plan', 'Status'],
              items.map((s) => [s.user_name, s.user_phone, formatDate(s.entry_time), formatTime(s.entry_time), s.exit_time ? formatTime(s.exit_time) : '', s.duration_seconds != null ? Math.round(s.duration_seconds / 60) : '', s.hours_deducted ? s.hours_deducted.toFixed(2) : '', s.plan_name, s.status]))}
            className="btn-gold px-3 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        }
      />
      <ErrorBox message={error} />
      {!items ? <Spinner /> : items.length === 0 ? <Empty text="No visits yet" /> : (
        <Table head={['Member', 'Date', 'In', 'Out', 'Time spent', 'Hours used', 'Plan', 'Status']}>
          {items.map((s) => (
            <tr key={s.id}>
              <td className="font-bold text-white">{s.user_name}</td>
              <td className="font-mono">{formatDate(s.entry_time)}</td>
              <td className="font-mono">{formatTime(s.entry_time)}</td>
              <td className="font-mono">{s.exit_time ? formatTime(s.exit_time) : '-'}</td>
              <td className="font-mono">{s.duration_seconds != null ? formatHM(s.duration_seconds) : '-'}</td>
              <td className="font-mono text-[#FFD54A]">{s.hours_deducted ? `${s.hours_deducted.toFixed(2)}h` : '-'}</td>
              <td>{s.plan_name}</td>
              <td><StatusPill status={s.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
