'use client';

import React, { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, CheckCircle2, Clock, Loader2, MapPin, Phone, Smartphone } from 'lucide-react';
import { Gym, Membership, Payment, Plan, assetUrl, userApi } from '../../../../lib/api';
import { Coords } from '../../../../lib/geo';
import { PLAN_TYPE_LABEL, formatCurrency, formatDate, formatDistance, formatHM } from '../../../../lib/utils';
import GymMap from '../../../../components/GymMap';
import PaymentSimulator from '../../../../components/PaymentSimulator';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const MOCK_KEY = 'rzp_test_mock_id_123';

interface Order { razorpay_order_id: string; amount: number; plan_name: string }

export default function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const gymId = Number(id);

  const [gym, setGym] = useState<Gym | null>(null);
  const [mine, setMine] = useState<Membership[]>([]);
  const [pending, setPending] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hours, setHours] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [mockOrder, setMockOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    let coords: Coords | undefined;
    try {
      const raw = sessionStorage.getItem('gympass_coords');
      if (raw) coords = JSON.parse(raw);
    } catch { /* optional */ }
    try {
      const res = await userApi.getGym(gymId, coords);
      setGym(res.gym);
      setMine(res.my_memberships);
      setPending(res.pending_requests);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this gym');
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const plans: Plan[] = (gym?.plans ?? []).filter((p) => p.status === 'active' && p.is_visible);
  const hoursFor = (p: Plan) => hours[p.id] ?? 5;

  const finish = async (message: string) => {
    setNotice(message);
    setMockOrder(null);
    await load();
  };

  const payOnline = async (plan: Plan) => {
    setError('');
    setNotice('');
    setBusy(`online-${plan.id}`);
    try {
      const order = await userApi.initiatePayment(plan.id, plan.type === 'hourly' ? hoursFor(plan) : undefined);
      if (order.key === MOCK_KEY) {
        setMockOrder({ razorpay_order_id: order.razorpay_order_id, amount: order.amount, plan_name: order.plan_name });
        return;
      }
      if (!window.Razorpay) {
        setError('The payment window is still loading. Try again in a moment.');
        return;
      }
      const rzp = new window.Razorpay({
        key: order.key,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: order.gym_name,
        description: order.plan_name,
        order_id: order.razorpay_order_id,
        prefill: { contact: localStorage.getItem('gympass_phone') || '' },
        theme: { color: '#FFD54A' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await userApi.verifyPayment(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
            await finish(`Payment received. Your ${order.plan_name} is active.`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed');
          }
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the payment');
    } finally {
      setBusy(null);
    }
  };

  const confirmMock = async () => {
    if (!mockOrder) return;
    setBusy('mock');
    try {
      await userApi.verifyPayment(mockOrder.razorpay_order_id, 'pay_mock_' + Math.random().toString(36).slice(2, 10), 'mock_signature_bypass');
      await finish(`Payment received. Your ${mockOrder.plan_name} is active.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setMockOrder(null);
    } finally {
      setBusy(null);
    }
  };

  const payCash = async (plan: Plan) => {
    setError('');
    setNotice('');
    setBusy(`cash-${plan.id}`);
    try {
      const res = await userApi.requestCash(plan.id, plan.type === 'hourly' ? hoursFor(plan) : undefined);
      await finish(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (paymentId: number) => {
    try {
      await userApi.cancelRequest(paymentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the request');
    }
  };

  if (loading) {
    return <div className="flex-grow flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" /></div>;
  }

  if (!gym) {
    return (
      <main className="max-w-3xl mx-auto p-10 text-center flex flex-col gap-4">
        <p className="text-sm text-[#A0A0A0]">{error || 'Gym not found'}</p>
        <Link href="/dashboard/gyms" className="btn-gold px-6 py-3 text-xs self-center">Back to gyms</Link>
      </main>
    );
  }

  const photos = gym.photos ?? [];

  return (
    <main className="flex-grow max-w-5xl w-full mx-auto p-4 md:p-10 flex flex-col gap-6 relative z-10">
      <Link href="/dashboard/gyms" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#A0A0A0] hover:text-white w-fit">
        <ArrowLeft className="w-3.5 h-3.5" /> All gyms
      </Link>

      {photos.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="h-56 md:h-80 rounded-xl overflow-hidden bg-black border border-[rgba(255,255,255,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(photos[Math.min(photoIndex, photos.length - 1)].url)} alt={gym.name} className="w-full h-full object-cover" />
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((p, i) => (
                <button key={p.id} onClick={() => setPhotoIndex(i)} className={`h-14 w-20 shrink-0 rounded-md overflow-hidden border ${i === photoIndex ? 'border-[#FFD54A]' : 'border-transparent opacity-60'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(p.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black uppercase tracking-tight">{gym.name}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#A0A0A0]">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#FFD54A]" />{gym.address}{gym.city ? `, ${gym.city}` : ''}</span>
          {gym.distance_km !== undefined && <span className="font-mono text-[#FFD54A]">{formatDistance(gym.distance_km)} away</span>}
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{gym.opening_time}–{gym.closing_time}</span>
          {gym.contact_number && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{gym.contact_number}</span>}
        </div>
        {gym.description && <p className="text-sm text-[#A0A0A0] leading-relaxed mt-2">{gym.description}</p>}
      </div>

      {notice && <div className="p-3 rounded-lg bg-[#31C46C]/10 border border-[#31C46C]/30 text-[#31C46C] text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</div>}

      {mine.length > 0 && (
        <div className="card-charcoal p-4 bg-[#111111] flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#31C46C]">Your active membership here</span>
          {mine.map((m) => (
            <div key={m.id} className="flex justify-between text-xs">
              <span className="font-bold">{m.plan_name}</span>
              <span className="font-mono text-[#FFD54A]">
                {m.plan_type === 'hourly' ? `${formatHM(m.remaining_seconds)} left` : `until ${formatDate(m.end_date)}`}
              </span>
            </div>
          ))}
          <span className="text-[10px] text-[#A0A0A0]">Buying the same plan again adds to it.</span>
        </div>
      )}

      {pending.length > 0 && (
        <div className="card-charcoal p-4 bg-[#111111] flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD54A]">Cash requests waiting for the owner</span>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs gap-3">
              <span>{p.plan_name}{p.plan_type === 'hourly' ? ` · ${p.hours}h` : ''} · ₹{formatCurrency(p.amount)}</span>
              <button onClick={() => cancel(p.id)} className="text-[10px] font-black uppercase tracking-wider text-[#E10600] hover:underline">Cancel</button>
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Choose a plan</h2>
        {plans.length === 0 ? (
          <div className="card-charcoal p-8 bg-[#111111] text-center text-xs text-[#A0A0A0] uppercase font-bold tracking-widest">This gym has not published any plans yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
              const isHourly = p.type === 'hourly';
              const h = hoursFor(p);
              const total = isHourly ? p.price * h : p.price;
              const hasPendingCash = pending.some((x) => x.plan_id === p.id);
              return (
                <div key={p.id} className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight">{p.name}</h3>
                      <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
                        {PLAN_TYPE_LABEL[p.type]}
                        {!isHourly && p.validity_days > 0 ? ` · ${p.validity_days} days` : ''}
                        {isHourly && p.validity_days > 0 ? ` · valid ${p.validity_days} days` : ''}
                        {isHourly && p.validity_days === 0 ? ' · never expires' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black font-mono text-[#FFD54A]">₹{formatCurrency(p.price)}</div>
                      {isHourly && <div className="text-[9px] text-[#A0A0A0] uppercase font-bold">per hour</div>}
                    </div>
                  </div>
                  {p.description && <p className="text-[11px] text-[#A0A0A0] leading-relaxed">{p.description}</p>}

                  {isHourly && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {[1, 5, 10, 20].map((n) => (
                        <button key={n} onClick={() => setHours({ ...hours, [p.id]: n })}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-black border ${h === n ? 'border-[#FFD54A] text-[#FFD54A] bg-[#FFD54A]/10' : 'border-[rgba(255,255,255,0.08)] text-[#A0A0A0]'}`}>
                          {n}h
                        </button>
                      ))}
                      <input type="number" min={1} max={500} value={h}
                        onChange={(e) => setHours({ ...hours, [p.id]: Math.max(1, Math.min(500, Math.floor(Number(e.target.value)) || 1)) })}
                        className="input-performance w-20 px-2 py-1.5 text-xs font-mono" aria-label="Hours" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-auto">
                    <button onClick={() => payOnline(p)} disabled={busy !== null} className="py-3 btn-red text-xs font-black flex items-center justify-center gap-2">
                      {busy === `online-${p.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      Pay ₹{formatCurrency(total)} · GPay / Paytm / UPI
                    </button>
                    <button onClick={() => payCash(p)} disabled={busy !== null || hasPendingCash} className="py-3 btn-gold text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                      {busy === `cash-${p.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                      {hasPendingCash ? 'Cash request sent' : 'Pay cash at the gym'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Location</h2>
        <GymMap lat={gym.latitude} lng={gym.longitude} />
      </section>

      {mockOrder && (
        <PaymentSimulator planName={mockOrder.plan_name} amount={mockOrder.amount} busy={busy === 'mock'} onPay={confirmMock} onCancel={() => setMockOrder(null)} />
      )}
    </main>
  );
}
