'use client';

import React, { useState } from 'react';
import { scannerApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';
import { Scan, ShieldAlert, ShieldCheck, PlayCircle, Loader2, QrCode } from 'lucide-react';

export default function RedesignedAdminScanPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please paste a checkpoint token.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await scannerApi.scan(token.trim());
      setResult(res);
      setToken('');
    } catch (err: any) {
      setError(err.message || 'Access Denied: Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">Checkpoint Terminal</h1>
        <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Simulate reception check-in scans using secure client tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Card */}
        <div className="card-charcoal p-8 flex flex-col gap-6 bg-[#111111] border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
            <div className="w-9 h-9 bg-[#E10600] flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(225,6,0,0.3)]">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm uppercase tracking-tight">Access Gate Simulator</h3>
              <span className="block text-[8px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Terminal Input</span>
            </div>
          </div>

          <form onSubmit={handleScan} className="flex flex-col gap-5 text-xs text-[#A0A0A0]">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Access Token</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="GP-eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full input-performance px-4 py-3.5 font-mono text-[9px]"
                  disabled={loading}
                />
                <QrCode className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
              </div>
              <span className="text-[8.5px] text-slate-500 leading-relaxed mt-1">
                Copy the secure token from the User Dashboard page under "Dev Sandbox Token" and paste it here to simulate checking in/out.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 btn-red text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4.5 h-4.5" />}
              Scan Token
            </button>
          </form>
        </div>

        {/* Display Results */}
        <div className="flex flex-col gap-6">
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest font-mono">Terminal Output Screen</span>

          {/* Access Denied */}
          {error && (
            <div className="card-charcoal p-6 border border-red-500/20 bg-red-500/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="font-black text-red-400 text-sm uppercase tracking-tight">Access Denied!</h4>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{error}</p>
                <span className="text-[8px] text-slate-500 font-mono mt-1">{formatDateTime(new Date())}</span>
              </div>
            </div>
          )}

          {/* Check-In Success */}
          {result && result.type === 'check_in' && (
            <div className="card-charcoal p-6 border border-[#31C46C]/20 bg-[#31C46C]/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#31C46C]/10 border border-[#31C46C]/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#31C46C]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-black text-[#31C46C] text-sm uppercase tracking-tight">Check-In Successful!</h4>
                  <p className="text-xs text-[#A0A0A0]">Welcome to GymPass Prime.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[rgba(255,255,255,0.08)] pt-3 text-xs text-[#A0A0A0]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Member Name:</span>
                    <span className="font-bold text-white uppercase">{result.user_name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Entry Time:</span>
                    <span className="font-bold text-white font-mono">{result.time}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Plan Mapped:</span>
                    <span className="font-bold text-white uppercase">{result.plan_name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Remaining Balance:</span>
                    <span className="font-bold text-[#FFD54A] font-mono">{result.remaining}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check-Out Success */}
          {result && result.type === 'check_out' && (
            <div className="card-charcoal p-6 border border-[#FFD54A]/20 bg-[#FFD54A]/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#FFD54A]/10 border border-[#FFD54A]/25 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FFD54A]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-black text-[#FFD54A] text-sm uppercase tracking-tight">Check-Out Successful!</h4>
                  <p className="text-xs text-[#A0A0A0]">Workout logged. Good job!</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[rgba(255,255,255,0.08)] pt-3 text-xs text-[#A0A0A0]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Member Name:</span>
                    <span className="font-bold text-white uppercase">{result.user_name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Session Duration:</span>
                    <span className="font-bold text-white font-mono">{result.duration}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Entry & Exit:</span>
                    <span className="font-bold text-slate-300 font-mono text-[10px]">
                      {result.entry_time} - {result.exit_time}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Balance Remaining:</span>
                    <span className="font-bold text-[#FFD54A] font-mono">{result.remaining}</span>
                  </div>
                </div>

                {result.hours_deducted && (
                  <div className="p-3 bg-[#FFD54A]/10 border border-[#FFD54A]/25 rounded-lg flex items-center justify-between text-xs text-[#FFD54A] font-bold mt-2">
                    <span>Prepaid Hours Deducted:</span>
                    <span className="font-mono">{result.hours_deducted}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Idle screen */}
          {!error && !result && (
            <div className="border border-dashed border-[rgba(255,255,255,0.08)] p-12 rounded-xl flex flex-col items-center justify-center text-center gap-3">
              <Scan className="w-10 h-10 text-slate-700 animate-pulse" />
              <p className="text-xs text-slate-500 max-w-[200px]">Waiting for checkpoint scanner input...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
