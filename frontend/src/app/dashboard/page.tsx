'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, clearAuthToken, getAuthToken } from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Dumbbell, ShieldAlert, Award, Clock, History, LogOut, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function RedesignedUserDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await userApi.getDashboard();
      setData(res);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('expired')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNewQR = async () => {
    if (qrLoading) return;
    setQrLoading(true);
    try {
      const res = await userApi.getQRToken();
      setQrToken(res.token);
      setQrExpiresIn(res.expires_in);
    } catch (err) {
      console.error('QR token fetch failed:', err);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth');
      return;
    }

    fetchDashboardData();
    fetchNewQR();

    const statsInterval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(statsInterval);
  }, []);

  useEffect(() => {
    if (qrExpiresIn > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setQrExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            fetchNewQR();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [qrExpiresIn]);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('gympass_phone');
    localStorage.removeItem('gympass_onboarded');
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-transparent text-white">
        <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin mb-2" />
        <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">Opening Member Dashboard...</span>
      </div>
    );
  }

  const { user, active_purchase, settings, active_session, sessions } = data || {};
  const isHourly = active_purchase?.plan_type === 'hourly';

  // Calculate upcoming expiry
  let expiryDateString = '-';
  let isExpiringSoon = false;
  if (active_purchase?.end_date) {
    const expiryDate = new Date(active_purchase.end_date);
    expiryDateString = formatDate(active_purchase.end_date);
    
    // Check if expiring in less than 3 days
    const diffTime = expiryDate.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 3) {
      isExpiringSoon = true;
    }
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-transparent text-white">
      {/* Top Navbar */}
      <header className="border-b border-[rgba(255,255,255,0.08)] py-4 px-6 md:px-16 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="GymPass Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>

        <span className="text-[9px] font-bold uppercase text-[#FFD54A] tracking-widest border border-[#FFD54A]/30 px-3 py-1 rounded bg-[#FFD54A]/5">
          Member Dashboard
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8 relative z-10">
        
        {/* Profile Card Header */}
        <div className="card-charcoal p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111]">
          <div>
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">Welcome Back</span>
            <h2 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">{user?.name || 'Athlete'}</h2>
            <span className="block text-[10px] text-[#A0A0A0] font-mono mt-0.5">{user?.phone}</span>
          </div>

          <div className="flex gap-3">
            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              active_purchase 
                ? active_session 
                  ? 'bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]' 
                  : 'bg-[#31C46C]/10 border border-[#31C46C]/30 text-[#31C46C]'
                : 'bg-red-500/10 border border-red-500/25 text-red-400'
            }`}>
              {active_purchase ? active_session ? 'Active Workout' : 'Access Unlocked' : 'No Active Pass'}
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Passport Status Details */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Membership passport info card */}
            <div className="card-charcoal p-6 flex flex-col gap-5 bg-[#111111]">
              <div className="flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.08)] pb-4">
                <Award className="w-5 h-5 text-[#FFD54A]" />
                <h3 className="font-extrabold text-sm uppercase text-white tracking-wider">Access Passport</h3>
              </div>

              {active_purchase ? (
                <div className="flex flex-col gap-4 text-xs text-[#A0A0A0]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase text-[9px] tracking-wider">Plan Name:</span>
                    <span className="font-extrabold text-white text-sm uppercase">{active_purchase.plan_name}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.04)] pt-3">
                    <span className="font-bold uppercase text-[9px] tracking-wider">Plan Type:</span>
                    <span className="font-bold text-white uppercase font-mono">{active_purchase.plan_type}</span>
                  </div>

                  {isHourly && (
                    <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.04)] pt-3">
                      <span className="font-bold uppercase text-[9px] tracking-wider text-[#FFD54A]">Hours Remaining:</span>
                      <span className="font-black text-white text-base font-mono text-[#FFD54A]">
                        {Math.floor(active_purchase.remaining_seconds / 3600)}h {Math.floor((active_purchase.remaining_seconds % 3600) / 60)}m
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.04)] pt-3">
                    <span className="font-bold uppercase text-[9px] tracking-wider">Passport Expiry:</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-white font-mono">{expiryDateString}</span>
                      {isExpiringSoon && (
                        <span className="text-[8px] text-[#E10600] font-black uppercase tracking-wider animate-pulse">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center flex flex-col items-center gap-2">
                  <ShieldAlert className="w-8 h-8 text-[#E10600] opacity-80" />
                  <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">No Active Membership</span>
                  <p className="text-[10px] text-[#A0A0A0]/60 max-w-[250px] leading-relaxed mt-1">
                    Unlock full access to the gym floor by choosing one of our flexible pricing plans.
                  </p>
                </div>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/plans"
                className="py-4 btn-red text-center shadow-lg text-xs font-black"
              >
                Buy Access Plan
              </Link>

              <button
                onClick={handleLogout}
                className="py-4 btn-dark-red text-xs font-black"
              >
                Logout Account
              </button>
            </div>

            {/* Recent Session logs list */}
            <div className="card-charcoal p-6 flex flex-col gap-4 bg-[#111111]">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <History className="w-4.5 h-4.5 text-[#FFD54A]" />
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Recent Workouts</h3>
              </div>

              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {sessions && sessions.length > 0 ? (
                  sessions.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="p-3 bg-black/60 border border-[rgba(255,255,255,0.04)] rounded-lg flex justify-between items-center text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">{formatDate(s.entry_time)}</span>
                        <span className="text-[9px] text-[#A0A0A0] font-mono">
                          {formatTime(s.entry_time)} - {s.exit_time ? formatTime(s.exit_time) : 'On Floor'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        {s.status === 'active' ? (
                          <span className="text-[#E10600] font-black uppercase text-[8px] tracking-widest animate-pulse">Active Floor</span>
                        ) : (
                          <>
                            <span className="font-bold text-white font-mono">{s.duration}</span>
                            <span className="text-[9px] text-[#A0A0A0]/60 font-mono mt-0.5">
                              {isHourly && s.hours_deducted ? `-${s.hours_deducted.toFixed(2)}h` : 'Unlimited'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#A0A0A0] text-[10px] uppercase font-bold tracking-widest">
                    No workouts logged. Scan QR to start.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Glowing QR card */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* QR Card */}
            <div className="card-charcoal p-8 flex flex-col items-center justify-center gap-5 bg-[#111111] border border-[rgba(255,255,255,0.08)] relative overflow-hidden group">
              {/* Gold light corner hover highlights */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD54A]/5 blur-2xl group-hover:bg-[#FFD54A]/10 transition-all pointer-events-none" />

              <div className="p-4 bg-white rounded-xl shadow-lg relative border border-[#FFD54A]/30">
                {active_purchase ? (
                  qrToken ? (
                    <QRCodeSVG 
                      value={qrToken} 
                      size={200}
                      level="H"
                      fgColor="#050505"
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-500 font-bold font-mono text-xs">
                      REFRESHING...
                    </div>
                  )
                ) : (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-[#050505] text-[#A0A0A0] rounded p-4 gap-2">
                    <ShieldAlert className="w-8 h-8 text-[#E10600]" strokeWidth={1.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E10600]">Access Locked</span>
                    <span className="text-[8px] text-[#A0A0A0] leading-tight">Plan purchase required</span>
                  </div>
                )}
              </div>

              {active_purchase && (
                <div className="flex flex-col gap-1.5 text-center mt-2 w-full">
                  <span className="text-[10px] text-white font-extrabold tracking-widest uppercase">
                    Checkpoint QR Key
                  </span>
                  <span className="text-[8px] text-[#A0A0A0] font-mono font-bold">
                    Refreshes automatically in {qrExpiresIn}s
                  </span>
                  
                  {/* Copier link for scanning simulator */}
                  <div className="mt-4 flex flex-col items-center gap-2 border-t border-[rgba(255,255,255,0.08)] pt-4 w-full">
                    <span className="text-[8px] text-[#A0A0A0] uppercase font-black tracking-widest font-mono">Dev Sandbox Token</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={qrToken || 'Activate plan to copy token'} 
                      onClick={(e) => {
                        const el = e.target as HTMLInputElement;
                        el.select();
                        navigator.clipboard.writeText(qrToken);
                      }}
                      className="text-[9px] font-mono bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] rounded px-3 py-2 text-center cursor-pointer select-all w-full focus:border-[#FFD54A] transition-colors"
                    />
                    <span className="text-[7.5px] text-[#A0A0A0] font-bold uppercase tracking-wider">Click text to copy & scan in Admin Scan panel</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
