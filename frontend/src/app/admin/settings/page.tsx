'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

export default function RedesignedAdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [gymName, setGymName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      setGymName(res.gym_name);
      setLogoUrl(res.logo_url || '');
      setAddress(res.address || '');
      setContactNumber(res.contact_number || '');
      setEmail(res.email || '');
      setOpeningTime(res.opening_time || '06:00');
      setClosingTime(res.closing_time || '22:00');
      setCurrency(res.currency || 'INR');
      setTimezone(res.timezone || 'Asia/Kolkata');
    } catch (err: any) {
      setError(err.message || 'Failed to load gym settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName.trim()) {
      setError('Please enter a gym name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a gym email contact.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess(false);

    const payload = {
      gym_name: gymName,
      logo_url: logoUrl,
      address,
      contact_number: contactNumber,
      email,
      opening_time: openingTime,
      closing_time: closingTime,
      currency,
      timezone,
    };

    try {
      await adminApi.updateSettings(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save gym settings.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">Gym Parameters</h1>
        <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Modify gym facility bounds and regional parameters</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
          <span className="text-xs text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Loading settings...</span>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 mb-6 uppercase tracking-wider">
              <CheckCircle2 className="w-4.5 h-4.5" /> Configurations Saved Successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="card-charcoal p-8 flex flex-col gap-6 text-xs text-[#A0A0A0] bg-[#111111] border border-[rgba(255,255,255,0.08)]">
            {/* Gym Name & Logo path */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gym Name</label>
                <input
                  type="text"
                  placeholder="GymPass Prime"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logo URL Path</label>
                <input
                  type="text"
                  placeholder="/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Facility Address</label>
              <textarea
                placeholder="123 Fitness Avenue, Bangalore, India"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full input-performance px-3.5 py-3 resize-none text-white font-bold"
                disabled={actionLoading}
              />
            </div>

            {/* Contact Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Support Email</label>
                <input
                  type="email"
                  placeholder="support@gympass.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>
            </div>

            {/* Opening & Closing hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Opening Time</label>
                <input
                  type="text"
                  placeholder="06:00"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Closing Time</label>
                <input
                  type="text"
                  placeholder="22:00"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>
            </div>

            {/* Currency & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Currency Code</label>
                <input
                  type="text"
                  placeholder="INR"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Timezone Name</label>
                <input
                  type="text"
                  placeholder="Asia/Kolkata"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full input-performance px-3.5 py-3 text-white font-bold"
                  disabled={actionLoading}
                />
              </div>
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full md:w-fit px-8 py-3.5 btn-red text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 self-end mt-4"
            >
              {actionLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
              Save Gym Settings
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
