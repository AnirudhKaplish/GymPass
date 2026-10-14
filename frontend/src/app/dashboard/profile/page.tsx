'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { clearAuthToken, userApi } from '../../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    userApi
      .getDashboard()
      .then((d) => {
        setPhone(d.user.phone);
        setName(d.user.name ?? '');
        setAge(d.user.age ? String(d.user.age) : '');
        setGender(d.user.gender ? d.user.gender.charAt(0).toUpperCase() + d.user.gender.slice(1).toLowerCase() : '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    const ageNum = parseInt(age, 10);
    if (!name.trim() || !ageNum || ageNum < 1 || !gender) {
      setError('Fill in your name, age and gender.');
      return;
    }
    setSaving(true);
    try {
      await userApi.onboard(name.trim(), ageNum, gender);
      localStorage.setItem('gympass_onboarded', 'true');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    router.replace('/auth');
  };

  if (loading) {
    return <div className="flex-grow flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" /></div>;
  }

  return (
    <main className="flex-grow max-w-xl w-full mx-auto p-4 md:p-10 flex flex-col gap-6 relative z-10">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Profile</h1>
        <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest font-mono">{phone}</span>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</div>}
      {saved && <div className="p-3 rounded-lg bg-[#31C46C]/10 border border-[#31C46C]/30 text-[#31C46C] text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Saved</div>}

      <form onSubmit={save} className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0]">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="input-performance px-4 py-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0]">Age</span>
          <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} className="input-performance px-4 py-3 text-sm font-mono" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0]">Gender</span>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-performance px-4 py-3 text-sm">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <button type="submit" disabled={saving} className="py-3.5 btn-red text-xs font-black">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save changes'}
        </button>
      </form>

      <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-2 text-[11px] text-[#A0A0A0] leading-relaxed">
        <span className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Install as an app</span>
        <span>On Android Chrome, open the menu and choose &ldquo;Install app&rdquo;. On iPhone Safari, tap Share, then &ldquo;Add to Home Screen&rdquo;. Your QR is then one tap away.</span>
      </div>

      <button onClick={logout} className="btn-dark-red py-3.5 text-xs font-black inline-flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </main>
  );
}
