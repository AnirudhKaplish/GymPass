'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, getAuthToken } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { Dumbbell, ArrowLeft, Loader2, Check, Sparkles, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function RedesignedPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Mock payment modal states
  const [showMockModal, setShowMockModal] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState<any>(null);
  const [mockPaymentLoading, setMockPaymentLoading] = useState(false);
  const [selectedHourlyPlan, setSelectedHourlyPlan] = useState<any | null>(null);
  const [purchaseHours, setPurchaseHours] = useState<number>(10);

  const fetchPlans = async () => {
    try {
      const res = await userApi.getPlans();
      setPlans(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchPlans();
  }, []);

  const handlePurchase = async (plan: any, selectedHours?: number) => {
    if (plan.type === 'hourly' && !selectedHours) {
      setSelectedHourlyPlan(plan);
      setPurchaseHours(plan.limit_hours || 10);
      return;
    }

    setActionLoading(plan.id);
    setError('');
    try {
      const orderData = await userApi.initiatePayment(plan.id, selectedHours);
      setCurrentOrderData({ ...orderData, planId: plan.id });

      if (orderData.key === 'rzp_test_mock_id_123') {
        setShowMockModal(true);
      } else {
        const options = {
          key: orderData.key,
          amount: orderData.amount * 100,
          currency: orderData.currency,
          name: 'GymPass Premium',
          description: `Purchase ${orderData.plan_name}`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: any) {
            setLoading(true);
            try {
              await userApi.verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              setSuccess(true);
            } catch (err: any) {
              setError(err.message || 'Payment verification failed.');
              setLoading(false);
            }
          },
          prefill: {
            contact: localStorage.getItem('gympass_phone') || '',
          },
          theme: {
            color: '#FFD54A',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate order.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulatedPaymentSuccess = async () => {
    if (!currentOrderData) return;
    setMockPaymentLoading(true);
    try {
      await userApi.verifyPayment(
        currentOrderData.razorpay_order_id,
        'pay_mock_' + Math.random().toString(36).substring(7),
        'mock_signature_bypass'
      );
      setShowMockModal(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Mock verification failed.');
    } finally {
      setMockPaymentLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-transparent p-6 text-white relative z-10">
        <div className="w-full max-w-[400px] card-charcoal p-8 text-center flex flex-col items-center gap-6 border border-[rgba(255,255,255,0.08)] bg-[#111111]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" strokeWidth={3} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Passport Activated</h2>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Your gym subscription has been updated. Scan your access QR code to check into the facility floors.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 btn-red text-xs font-black"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-transparent text-white">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] py-5 px-6 md:px-16 flex items-center gap-4 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <Link href="/dashboard" className="p-2 rounded-lg bg-[#111111] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-extrabold text-sm uppercase tracking-wider text-white">Choose Passport</span>
      </header>

      {/* Catalog */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-12 flex flex-col gap-8 relative z-10">
        <div className="text-center flex flex-col gap-2 max-w-xl mx-auto mb-4">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Subscription Plans</h1>
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-bold">
            Select a plan to unlock floor entries
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center max-w-md mx-auto">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center min-h-[250px]">
            <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
            <span className="text-xs text-[#A0A0A0] mt-2">Loading catalog...</span>
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isHourly = p.type === 'hourly';
              return (
                <div 
                  key={p.id} 
                  className={`card-charcoal p-6 flex flex-col justify-between gap-6 bg-[#111111] border border-[rgba(255,255,255,0.08)] transition-all hover:scale-[1.01] ${
                    isHourly ? 'hover:border-[#FFD54A]/30' : 'hover:border-[#E10600]/30'
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border w-fit ${
                          isHourly ? 'bg-[#FFD54A]/10 border-[#FFD54A]/20 text-[#FFD54A]' : 'bg-[#E10600]/10 border-[#E10600]/20 text-[#E10600]'
                        }`}>
                          {p.type}
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-2 tracking-tight">{p.name}</h3>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isHourly ? 'bg-[#FFD54A]/10 text-[#FFD54A]' : 'bg-[#E10600]/10 text-[#E10600]'
                      }`}>
                        {isHourly ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-white">₹{formatCurrency(p.price)}</span>
                      <span className="text-[9px] text-[#A0A0A0] font-semibold uppercase">
                        {isHourly ? '/ Hour' : `/ ${p.validity_days} Days`}
                      </span>
                    </div>

                    <p className="text-xs text-[#A0A0A0] leading-relaxed border-t border-[rgba(255,255,255,0.08)] pt-4">
                      {p.description || 'Gain full access to the gym floor.'}
                    </p>

                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-[#FFD54A] shrink-0" />
                        <span>Gym floor access included</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-[#FFD54A] shrink-0" />
                        <span>
                          {isHourly ? 'Purchase custom hours pack' : 'Unlimited gym entries'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchase(p)}
                    disabled={actionLoading !== null}
                    className={`w-full py-3 text-[10px] font-black ${
                      isHourly ? 'btn-gold' : 'btn-red'
                    }`}
                  >
                    {actionLoading === p.id ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto" />
                    ) : (
                      'Purchase Access'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-[#A0A0A0] text-xs">
            No active memberships published.
          </div>
        )}
      </main>

      {/* Dev Mode Sandbox Modal */}
      {showMockModal && currentOrderData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm card-charcoal p-6 flex flex-col gap-6 border border-[#FFD54A]/30 bg-[#111111]">
            <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="w-10 h-10 bg-[#FFD54A]/10 flex items-center justify-center rounded-xl">
                <Sparkles className="w-5 h-5 text-[#FFD54A]" />
              </div>
              <div>
                <h3 className="font-extrabold text-white uppercase text-xs tracking-wider">Razorpay Simulation</h3>
                <span className="block text-[8px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Sandbox Sandbox</span>
              </div>
            </div>

            <div className="p-4 bg-black/60 border border-[rgba(255,255,255,0.08)] rounded-lg flex flex-col gap-3 text-xs text-[#A0A0A0]">
              <div className="flex justify-between">
                <span>Product Name:</span>
                <span className="font-bold text-white uppercase">{currentOrderData.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono text-slate-300">{currentOrderData.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between border-t border-[rgba(255,255,255,0.08)] pt-3">
                <span>Amount:</span>
                <span className="font-black text-white">₹{currentOrderData.amount}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSimulatedPaymentSuccess}
                disabled={mockPaymentLoading}
                className="w-full py-3.5 btn-red text-xs font-black"
              >
                {mockPaymentLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify Payment"}
              </button>
              <button
                onClick={() => {
                  setShowMockModal(false);
                  setCurrentOrderData(null);
                }}
                disabled={mockPaymentLoading}
                className="w-full py-3 bg-black border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white rounded-lg text-xs font-black transition-all"
              >
                Cancel Checkout
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Hourly Configuration Modal */}
        {selectedHourlyPlan && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm card-charcoal p-6 flex flex-col gap-6 border border-[#FFD54A]/30 bg-[#111111]">
              <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
                <div className="w-10 h-10 bg-[#FFD54A]/10 flex items-center justify-center rounded-xl">
                  <Clock className="w-5 h-5 text-[#FFD54A]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white uppercase text-xs tracking-wider">Configure Hourly Pack</h3>
                  <span className="block text-[8px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Custom hours selection</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-xs text-[#A0A0A0]">
                <div className="flex justify-between items-center">
                  <span>Plan:</span>
                  <span className="font-bold text-white uppercase">{selectedHourlyPlan.name}</span>
                </div>
                 <div className="flex justify-between items-center">
                  <span>Hourly Rate:</span>
                  <span className="font-bold text-white font-mono">₹{formatCurrency(selectedHourlyPlan.price)} / Hour</span>
                </div>
                
                <div className="flex flex-col gap-2 border-t border-[rgba(255,255,255,0.08)] pt-4 mt-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Number of Hours</label>
                  <div className="flex items-center justify-between bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-lg p-1 w-full">
                    <button
                      type="button"
                      onClick={() => setPurchaseHours(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded bg-[#111111] hover:text-[#FFD54A] font-bold text-lg flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={purchaseHours}
                      onChange={(e) => setPurchaseHours(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center font-black text-sm text-white font-mono bg-transparent outline-none focus:ring-0 focus:border-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPurchaseHours(prev => prev + 1)}
                      className="w-10 h-10 rounded bg-[#111111] hover:text-[#FFD54A] font-bold text-lg flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                 <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.08)] pt-4 mt-2">
                  <span className="font-black text-white text-xs uppercase">Total Amount:</span>
                  <span className="font-black text-[#FFD54A] text-lg font-mono">
                    ₹{formatCurrency(parseFloat(selectedHourlyPlan.price) * purchaseHours)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    const plan = selectedHourlyPlan;
                    setSelectedHourlyPlan(null);
                    handlePurchase(plan, purchaseHours);
                  }}
                  className="w-full py-3.5 btn-red text-xs font-black uppercase tracking-wider"
                >
                  Proceed to Pay
                </button>
                <button
                  onClick={() => setSelectedHourlyPlan(null)}
                  className="w-full py-3 bg-black border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white rounded-lg text-xs font-black transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
