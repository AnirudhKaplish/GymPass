'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, Plus, Search } from 'lucide-react';
import { Membership, Plan, ownerApi } from '../../../../lib/api';
import { PLAN_TYPE_LABEL, formatCurrency, formatDate, formatHM } from '../../../../lib/utils';
import { downloadCSV } from '../../../../lib/csv';
import { Empty, ErrorBox, Field, PageTitle, Spinner, StatusPill, Table } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

export default function MembersPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [items, setItems] = useState<Membership[] | null>(null);
  const [status, setStatus] = useState('active');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const [adding, setAdding] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState(0);
  const [hours, setHours] = useState(5);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!gymId) return;
    try {
      setItems(await ownerApi.members(gymId, status));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load members');
    }
  }, [gymId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = async () => {
    if (!gymId) return;
    setAdding(true);
    setNotice('');
    setError('');
    try {
      const list = (await ownerApi.listPlans(gymId)).filter((p) => p.status === 'active');
      setPlans(list);
      setPlanId(list[0]?.id ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load plans');
    }
  };

  const plan = plans.find((p) => p.id === planId);
  const isHourly = plan?.type === 'hourly';
  const total = plan ? (isHourly ? plan.price * hours : plan.price) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId || !plan) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await ownerApi.addMember(gymId, { phone: phone.trim(), name: name.trim(), plan_id: plan.id, hours: isHourly ? hours : undefined });
      setNotice(`${name.trim() || phone.trim()} now has ${plan.name}. They can sign in with that phone number.`);
      setPhone('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member');
    } finally {
      setBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter(
    (m) => !q || (m.user_name ?? '').toLowerCase().includes(q) || (m.user_phone ?? '').includes(q.replace(/\s/g, '')) || m.plan_name.toLowerCase().includes(q)
  );

  const exportCSV = () =>
    downloadCSV(
      `${gym?.name ?? 'gym'}-members.csv`.replace(/\s+/g, '-'),
      ['Name', 'Phone', 'Plan', 'Type', 'Status', 'Time left', 'Valid until'],
      shown.map((m) => [
        m.user_name, m.user_phone, m.plan_name, m.plan_type, m.status,
        m.plan_type === 'hourly' ? formatHM(m.remaining_seconds) : '',
        m.end_date ? formatDate(m.end_date) : 'No limit',
      ])
    );

  if (!gym) return null;

  return (
    <>
      <PageTitle
        title="Members"
        subtitle={gym.name}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-performance px-3 py-2.5 text-xs font-bold">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="">All</option>
            </select>
            <button onClick={exportCSV} disabled={shown.length === 0} className="btn-gold px-3 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            {!adding && (
              <button onClick={openForm} className="btn-red px-4 py-2.5 text-[10px] font-black inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add member
              </button>
            )}
          </div>
        }
      />

      {notice && <div className="p-3 rounded-lg bg-[#31C46C]/10 border border-[#31C46C]/30 text-[#31C46C] text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{notice}</div>}
      <ErrorBox message={error} />

      {adding && (
        <form onSubmit={submit} className="card-charcoal p-5 bg-[#111111] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Add a walk-in member</h3>
            <p className="text-[11px] text-[#A0A0A0] mt-1">For someone paying cash at the desk. The plan starts right away and is recorded as a cash payment.</p>
          </div>
          <Field label="Phone number"><input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" className="input-performance px-4 py-3 text-sm font-mono" /></Field>
          <Field label="Name (optional)"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="input-performance px-4 py-3 text-sm" /></Field>
          <Field label="Plan">
            <select value={planId} onChange={(e) => setPlanId(Number(e.target.value))} className="input-performance px-4 py-3 text-sm">
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {PLAN_TYPE_LABEL[p.type]} · ₹{formatCurrency(p.price)}{p.type === 'hourly' ? '/h' : ''}</option>)}
            </select>
          </Field>
          {isHourly && (
            <Field label="Hours"><input type="number" min={1} max={500} value={hours} onChange={(e) => setHours(Math.max(1, Math.min(500, Math.floor(Number(e.target.value)) || 1)))} className="input-performance px-4 py-3 text-sm font-mono" /></Field>
          )}
          <div className="md:col-span-2 flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={busy || !plan} className="btn-red px-6 py-3 text-xs font-black">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Cash received ₹${formatCurrency(total)}`}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn-dark-red px-6 py-3 text-xs font-black">Close</button>
            {plans.length === 0 && <span className="text-[11px] text-[#A0A0A0]">Create a plan first in Plans &amp; prices.</span>}
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or plan" className="input-performance w-full pl-9 pr-3 py-3 text-sm" />
      </div>

      {!items ? <Spinner /> : shown.length === 0 ? <Empty text={q ? 'No members match your search' : 'No members'} /> : (
        <Table head={['Member', 'Phone', 'Plan', 'Status', 'Time left', 'Valid until']}>
          {shown.map((m) => (
            <tr key={m.id}>
              <td className="font-bold text-white">{m.user_name}</td>
              <td className="font-mono text-[#A0A0A0]">{m.user_phone}</td>
              <td>{m.plan_name} <span className="text-[#A0A0A0] text-[10px]">· {PLAN_TYPE_LABEL[m.plan_type] || m.plan_type}</span></td>
              <td><StatusPill status={m.status} /></td>
              <td className="font-mono text-[#FFD54A]">{m.plan_type === 'hourly' ? formatHM(m.remaining_seconds) : '-'}</td>
              <td className="font-mono">{m.end_date ? formatDate(m.end_date) : 'No limit'}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
