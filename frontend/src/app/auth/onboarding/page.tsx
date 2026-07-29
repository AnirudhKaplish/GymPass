'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, getAuthToken } from '../../../lib/api';
import { Dumbbell, User, Calendar, Loader2, ShieldAlert } from 'lucide-react';

export default function RedesignedOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setError('Please enter a valid age.');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await userApi.onboard(name, ageNum, gender);
      localStorage.setItem('gympass_onboarded', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-transparent text-white relative z-10">
      <div className="w-full max-w-[420px] flex flex-col gap-6">
        <div className="card-charcoal p-8 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] bg-[#111111]">
          
          <div className="flex flex-col items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-5 text-center">
            <img 
              src="/logo.png" 
              alt="GymPass Logo" 
              className="h-12 w-auto object-contain mb-3"
            />
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Complete Profile</h2>
            <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest">
              Set up your facility access credentials
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase text-center flex items-center gap-2 justify-center">
              <ShieldAlert className="w-4 h-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs text-[#A0A0A0]">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full input-performance pl-10 pr-4 py-3.5 text-xs font-bold text-white"
                  disabled={loading}
                  required
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {/* Age */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-widest">Age</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full input-performance pl-10 pr-4 py-3.5 text-xs font-bold text-white"
                  disabled={loading}
                  required
                />
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {/* Gender grid select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-widest">Gender</label>
              <div className="grid grid-cols-3 gap-3">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 text-[10px] font-extrabold uppercase tracking-widest border rounded-lg transition-all ${
                      gender === g
                        ? 'bg-[#E10600] border-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]'
                        : 'bg-[#050505] border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white hover:border-[#FFD54A]'
                    }`}
                    disabled={loading}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 btn-red text-center text-xs font-black"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
