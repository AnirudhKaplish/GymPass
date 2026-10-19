'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Plan, PlanInput, PlanType, ownerApi } from '../../../../lib/api';
import { PLAN_TYPE_LABEL, formatCurrency } from '../../../../lib/utils';
import { Empty, ErrorBox, Field, PageTitle, Spinner } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

const TYPES: PlanType[] = ['hourly', 'monthly', 'quarterly', 'half-yearly', 'yearly'];
const DEFAULT_DAYS: Record<PlanType, number> = { hourly: 0, monthly: 30, quarterly: 90, 'half-yearly': 180, yearly: 365 };

const blank = (): PlanInput => ({ name: '', type: 'monthly', price: 0, validity_days: 30, description: '', is_visible: true, status: 'active' });

export default function PlansPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<PlanInput>(blank());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!gymId) return;
    try {
      setPlans(await ownerApi.listPlans(gymId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load plans');
    }
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => { setForm(blank()); setEditing('new'); setError(''); };
  const startEdit = (p: Plan) => {
    setForm({ name: p.name, type: p.type, price: p.price, validity_days: p.validity_days, description: p.description, is_visible: p.is_visible, status: p.status });
    setEditing(p.id);
    setError('');
  };

  const changeType = (type: PlanType) => setForm((f) => ({ ...f, type, validity_days: DEFAULT_DAYS[type], name: f.name || PLAN_TYPE_LABEL[type] }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;
    setBusy(true);
    setError('');
    try {
      const body = { ...form, name: form.name.trim(), price: Number(form.price), validity_days: Math.max(0, Math.floor(Number(form.validity_days) || 0)) };
      if (editing === 'new') await ownerApi.createPlan(gymId, body);
      else if (typeof editing === 'number') await ownerApi.updatePlan(editing, body);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan');
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (p: Plan) => {
    try {
      await ownerApi.updatePlan(p.id, { name: p.name, type: p.type, price: p.price, validity_days: p.validity_days, description: p.description, status: p.status, is_visible: !p.is_visible });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the plan');
    }
  };

  const remove = async (p: Plan) => {
    if (!window.confirm(`Delete “${p.name}”? Members who already bought it keep their membership.`)) return;
    try {
      await ownerApi.deletePlan(p.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the plan');
    }
  };

  if (!gym) return null;
  const hourly = form.type === 'hourly';

  return (
    <>
      <PageTitle title="Plans & prices" subtitle={gym.name}
        action={editing === null && <button onClick={startNew} className="btn-red px-4 py-3 text-[10px] font-black inline-flex items-center gap-2"><Plus className="w-4 h-4" /> New plan</button>} />
      <ErrorBox message={error} />

      {editing !== null && (
        <form onSubmit={save} className="card-charcoal p-5 bg-[#111111] grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Plan type">
            <select value={form.type} onChange={(e) => changeType(e.target.value as PlanType)} className="input-performance px-4 py-3 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{PLAN_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Name"><input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-performance px-4 py-3 text-sm" /></Field>
          <Field label={hourly ? 'Price per hour (₹)' : 'Price (₹)'}>
            <input required type="number" min={1} step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input-performance px-4 py-3 text-sm font-mono" />
          </Field>
          <Field label={hourly ? 'Hours valid for (days)' : 'Duration (days)'} hint={hourly ? '0 means the hours never expire. They are only used up by time spent inside.' : 'Counted from the day the member buys it.'}>
            <input type="number" min={hourly ? 0 : 1} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} className="input-performance px-4 py-3 text-sm font-mono" />
          </Field>
          <div className="md:col-span-2"><Field label="Description (optional)">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-performance px-4 py-3 text-sm" />
          </Field></div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={busy} className="btn-red px-6 py-3 text-xs font-black">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save plan'}</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-dark-red px-6 py-3 text-xs font-black">Cancel</button>
          </div>
        </form>
      )}

      {!plans ? <Spinner /> : plans.length === 0 ? <Empty text="No plans yet. Add hourly, monthly or yearly plans." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div key={p.id} className={`card-charcoal p-5 bg-[#111111] flex flex-col gap-3 ${!p.is_visible ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase">{p.name}</h3>
                  <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
                    {PLAN_TYPE_LABEL[p.type]}{p.type === 'hourly' ? (p.validity_days ? ` · valid ${p.validity_days} days` : ' · never expires') : ` · ${p.validity_days} days`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black font-mono text-[#FFD54A]">₹{formatCurrency(p.price)}</div>
                  {p.type === 'hourly' && <div className="text-[9px] text-[#A0A0A0] uppercase font-bold">per hour</div>}
                </div>
              </div>
              {p.description && <p className="text-[11px] text-[#A0A0A0]">{p.description}</p>}
              <div className="flex items-center gap-1 mt-auto">
                <button onClick={() => startEdit(p)} aria-label="Edit" className="p-2 text-[#A0A0A0] hover:text-[#FFD54A]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => toggleVisible(p)} aria-label={p.is_visible ? 'Hide from members' : 'Show to members'} className="p-2 text-[#A0A0A0] hover:text-[#FFD54A]">
                  {p.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(p)} aria-label="Delete" className="p-2 text-[#A0A0A0] hover:text-[#E10600] ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
