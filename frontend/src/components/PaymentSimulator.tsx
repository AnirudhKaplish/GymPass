'use client';

import { Loader2 } from 'lucide-react';

/** Dev-only stand-in for Razorpay checkout, used when the server runs with mock keys. */
export default function PaymentSimulator({ planName, amount, busy, onPay, onCancel }: {
  planName: string; amount: number; busy: boolean; onPay: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card-charcoal p-6 max-w-sm w-full flex flex-col gap-4 bg-[#111111]">
        <h3 className="font-extrabold text-white uppercase text-xs tracking-wider">Payment simulation (dev mode)</h3>
        <p className="text-xs text-[#A0A0A0] leading-relaxed">
          The server is using mock Razorpay keys. With real keys this step opens Razorpay checkout with Google Pay, Paytm, PhonePe and other UPI apps, cards and netbanking.
        </p>
        <div className="flex justify-between text-xs border-y border-[rgba(255,255,255,0.08)] py-3">
          <span className="text-[#A0A0A0] uppercase font-bold tracking-wider">{planName}</span>
          <span className="font-black text-white font-mono">₹{amount}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={onPay} disabled={busy} className="flex-1 py-3 btn-red text-xs font-black">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Pay now'}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 py-3 btn-dark-red text-xs font-black">Cancel</button>
        </div>
      </div>
    </div>
  );
}
