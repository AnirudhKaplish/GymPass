'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { Plus, Trash2, Edit3, X, Loader2, Clock, Calendar, EyeOff, Save } from 'lucide-react';

export default function RedesignedAdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form Drawer states
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('monthly');
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [limitHours, setLimitHours] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [isVisible, setIsVisible] = useState(true);

  const fetchPlans = async () => {
    try {
      const res = await adminApi.getPlans();
      setPlans(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateDrawer = () => {
    setEditingId(null);
    setName('');
    setType('monthly');
    setPrice('');
    setValidityDays('30');
    setLimitHours('');
    setDescription('');
    setStatus('active');
    setIsVisible(true);
    setError('');
    setShowDrawer(true);
  };

  const openEditDrawer = (plan: any) => {
    setEditingId(plan.id);
    setName(plan.name);
    setType(plan.type);
    setPrice(String(plan.price));
    setValidityDays(String(plan.validity_days));
    setLimitHours(plan.limit_hours ? String(plan.limit_hours) : '');
    setDescription(plan.description || '');
    setStatus(plan.status);
    setIsVisible(plan.is_visible);
    setError('');
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a plan name.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    const valDays = parseInt(validityDays);
    if (isNaN(valDays) || valDays <= 0) {
      setError('Please enter valid validity days.');
      return;
    }

    let limHrs: number | null = null;
    if (type === 'hourly') {
      const hrNum = parseInt(limitHours);
      if (isNaN(hrNum) || hrNum <= 0) {
        setError('Please enter a valid hour limit for hourly packs.');
        return;
      }
      limHrs = hrNum;
    }

    setActionLoading(true);
    setError('');

    const payload = {
      name,
      type,
      price: priceNum,
      validity_days: valDays,
      limit_hours: limHrs,
      description,
      status,
      is_visible: isVisible,
    };

    try {
      if (editingId) {
        await adminApi.updatePlan(editingId, { ...payload, id: editingId });
      } else {
        await adminApi.createPlan(payload);
      }
      setShowDrawer(false);
      fetchPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) {
      return;
    }

    try {
      await adminApi.deletePlan(id);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to delete plan.');
    }
  };

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">Access Plans</h1>
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Publish memberships and hour packs for members</p>
        </div>

        <button
          onClick={openCreateDrawer}
          className="px-4 py-2.5 btn-red text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
          <span className="text-xs text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Loading plans...</span>
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isHourly = p.type === 'hourly';
            return (
              <div 
                key={p.id} 
                className={`card-charcoal p-6 flex flex-col justify-between gap-5 relative border bg-[#111111] border-[rgba(255,255,255,0.08)] ${
                  p.status === 'inactive' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                          isHourly ? 'bg-[#FFD54A]/10 border-[#FFD54A]/20 text-[#FFD54A]' : 'bg-[#E10600]/10 border-[#E10600]/20 text-[#E10600]'
                        }`}>
                          {p.type}
                        </span>
                        {!p.is_visible && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] bg-black border border-[rgba(255,255,255,0.08)] text-slate-500 flex items-center gap-1 font-semibold uppercase">
                            <EyeOff className="w-2.5 h-2.5" /> Hidden
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-white text-base mt-2 tracking-tight uppercase">{p.name}</h3>
                    </div>

                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isHourly ? 'bg-[#FFD54A]/10 text-[#FFD54A]' : 'bg-[#E10600]/10 text-[#E10600]'
                    }`}>
                      {isHourly ? <Clock className="w-4.5 h-4.5" /> : <Calendar className="w-4.5 h-4.5" />}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">₹{formatCurrency(p.price)}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">/ {p.validity_days} Days</span>
                  </div>

                  <p className="text-xs text-[#A0A0A0] leading-relaxed border-t border-[rgba(255,255,255,0.08)] pt-3">
                    {p.description || 'Access plan published for workouts.'}
                  </p>

                  <div className="flex gap-2 flex-wrap text-[10px]">
                    <span className={`px-2.5 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider ${
                      p.status === 'active' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-[#31C46C]' 
                        : 'bg-red-500/10 border-red-500/25 text-red-400'
                    }`}>
                      {p.status}
                    </span>
                    {p.limit_hours && (
                      <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                        {p.limit_hours} Hours
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit & Delete actions */}
                <div className="flex gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
                  <button
                    onClick={() => openEditDrawer(p)}
                    className="flex-grow py-2 rounded bg-black hover:bg-[#111111] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#FFD54A]" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2.5 rounded bg-red-950/20 border border-red-950/30 text-red-400 hover:bg-red-900/30 hover:border-red-800/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-[#A0A0A0] text-xs">
          No subscription plans mapped. Click "Create Plan" to publish a new passport.
        </div>
      )}

      {/* CRUD Form Slide overlay Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-[#111111] border-l border-[rgba(255,255,255,0.08)] flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#050505]/60">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-tight">
                {editingId ? 'Edit Plan' : 'Create Plan'}
              </h3>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg bg-black border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSave} className="flex-1 p-6 flex flex-col gap-5 text-xs text-[#A0A0A0]">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-center">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plan Name</label>
                <input
                  type="text"
                  placeholder="Monthly Premium Pass"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full input-performance px-3.5 py-3"
                  disabled={actionLoading}
                />
              </div>

              {/* Type & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plan Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full input-performance px-3 py-3 bg-[#050505]"
                    disabled={actionLoading}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="hourly">Hourly Packs</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full input-performance px-3.5 py-3"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              {/* Validity Days & Limit hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Validity (Days)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    className="w-full input-performance px-3.5 py-3"
                    disabled={actionLoading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hour Limit (Hourly only)</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={limitHours}
                    onChange={(e) => setLimitHours(e.target.value)}
                    className="w-full input-performance px-3.5 py-3 disabled:opacity-30"
                    disabled={type !== 'hourly' || actionLoading}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea
                  placeholder="Provide access bounds or hours details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full input-performance px-3.5 py-3 resize-none"
                  disabled={actionLoading}
                />
              </div>

              {/* Visibility toggle */}
              <div className="flex justify-between items-center bg-[#050505] border border-[rgba(255,255,255,0.08)] p-3 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">Publish Visible</span>
                  <span className="text-[9px] text-slate-500">Should users purchase this plan?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVisible(!isVisible)}
                  className={`px-3 py-1.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                    isVisible 
                      ? 'bg-blue-600/10 border-blue-500/25 text-blue-400' 
                      : 'bg-transparent border-[rgba(255,255,255,0.08)] text-slate-500'
                  }`}
                  disabled={actionLoading}
                >
                  {isVisible ? 'Visible' : 'Hidden'}
                </button>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operational Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full input-performance px-3 py-3 bg-[#050505]"
                  disabled={actionLoading}
                >
                  <option value="active">Active (Available for purchase)</option>
                  <option value="inactive">Disabled (Stop all sales)</option>
                </select>
              </div>

              {/* Save */}
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 btn-red text-xs font-black flex items-center justify-center gap-2 mt-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <Save className="w-4.5 h-4.5" />}
                {editingId ? 'Save Changes' : 'Create Access Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
