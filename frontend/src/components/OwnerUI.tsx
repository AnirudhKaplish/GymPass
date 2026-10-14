'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">{title}</h1>
        {subtitle && <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 text-[#FFD54A] animate-spin" /></div>;
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{message}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="card-charcoal p-10 bg-[#111111] text-center text-[11px] text-[#A0A0A0] font-bold uppercase tracking-widest">{text}</div>;
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="card-charcoal p-4 bg-[#111111] flex flex-col gap-1">
      <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-black font-mono ${accent ? 'text-[#FFD54A]' : 'text-white'}`}>{value}</span>
      {hint && <span className="text-[9px] text-[#A0A0A0]">{hint}</span>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0]">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[#A0A0A0]/70">{hint}</span>}
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const good = ['active', 'success', 'completed'].includes(status);
  const bad = ['rejected', 'failed', 'cancelled', 'auto_closed'].includes(status);
  const cls = good ? 'bg-[#31C46C]/10 border-[#31C46C]/30 text-[#31C46C]'
    : bad ? 'bg-[#E10600]/10 border-[#E10600]/30 text-[#E10600]'
    : 'bg-white/5 border-white/10 text-[#A0A0A0]';
  return <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${cls}`}>{status.replace('_', ' ')}</span>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card-charcoal bg-[#111111] overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.08)] text-[9px] uppercase tracking-widest text-[#A0A0A0]">
            {head.map((h) => <th key={h} className="px-4 py-3 font-black whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-[rgba(255,255,255,0.04)] [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-nowrap">{children}</tbody>
      </table>
    </div>
  );
}
