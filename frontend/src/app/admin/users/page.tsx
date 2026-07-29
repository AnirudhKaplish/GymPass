'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { formatDate, formatTime } from '../../../lib/utils';
import { Users, Search, ShieldAlert, ShieldCheck, Clock, Calendar, X, Loader2, Eye } from 'lucide-react';

export default function RedesignedAdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Details Modal States
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.listUsers(search);
      setUsers(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleOpenDetails = async (user: any) => {
    setSelectedUser(user);
    setModalLoading(true);
    setModalData(null);
    try {
      const res = await adminApi.getUserDetails(user.id);
      setModalData(res);
    } catch (err) {
      console.error('User details fetch failed:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const isSuspended = user.status === 'suspended';
    try {
      if (isSuspended) {
        await adminApi.activateUser(user.id);
      } else {
        await adminApi.suspendUser(user.id);
      }
      fetchUsers();
      if (selectedUser && selectedUser.id === user.id) {
        const updatedUser = { ...user, status: isSuspended ? 'active' : 'suspended' };
        setSelectedUser(updatedUser);
        const res = await adminApi.getUserDetails(user.id);
        setModalData(res);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  return (
    <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 bg-transparent text-white relative z-10">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">Members Registry</h1>
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold mt-0.5">Search profiles, audits remaining hour packs, and restrict accesses</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-performance pl-10 pr-4 py-2.5 text-xs uppercase font-bold tracking-wider"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* Directory Table */}
      <div className="card-charcoal rounded-xl overflow-hidden bg-[#111111]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
            <span className="text-xs text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Opening files...</span>
          </div>
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[9px]">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Stats</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#A0A0A0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-bold text-white uppercase">{u.name || 'Pending Onboard'}</td>
                    <td className="py-4 px-6 text-slate-400 font-mono">{u.phone}</td>
                    <td className="py-4 px-6 text-slate-400 font-medium">
                      {u.age ? `${u.age} yrs` : '-'} / {u.gender || '-'}
                    </td>
                    <td className="py-4 px-6">
                      {u.status === 'suspended' ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-400 text-[8px] font-bold uppercase tracking-wider">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleOpenDetails(u)}
                        className="p-2 rounded-lg bg-black border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4.5 h-4.5 text-[#FFD54A]" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          u.status === 'suspended'
                            ? 'bg-emerald-950/20 border-emerald-900/30 text-[#31C46C] hover:bg-emerald-900/30'
                            : 'bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900/30'
                        }`}
                      >
                        {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-[#A0A0A0] text-xs">
            No member profiles found.
          </div>
        )}
      </div>

      {/* Slide-over User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg card-charcoal flex flex-col justify-between overflow-hidden bg-[#111111] border border-[rgba(255,255,255,0.08)]">
            {/* Header */}
            <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#E10600] flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(225,6,0,0.3)]">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-tight">
                    {selectedUser.name || 'Pending Onboard'}
                  </h3>
                  <span className="block text-[9px] text-[#A0A0A0] font-mono font-bold tracking-wider">{selectedUser.phone}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg bg-black border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-6 max-h-[480px] overflow-y-auto text-xs text-[#A0A0A0]">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
                  <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-wider mt-2">Loading profiles...</span>
                </div>
              ) : modalData ? (
                <>
                  {/* Status Toggle Area */}
                  <div className="bg-black/60 border border-[rgba(255,255,255,0.08)] p-4 rounded-xl flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider">Access Lock State:</span>
                      <span className="font-extrabold text-white uppercase">{selectedUser.status}</span>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(selectedUser)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border uppercase tracking-wider transition-all ${
                        selectedUser.status === 'suspended' ? 'btn-gold' : 'btn-red'
                      }`}
                    >
                      {selectedUser.status === 'suspended' ? 'Reactivate Member' : 'Suspend Member'}
                    </button>
                  </div>

                  {/* Active Subscription details */}
                  <div className="bg-black/60 border border-[rgba(255,255,255,0.08)] p-4 rounded-xl flex flex-col gap-3">
                    <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-white">Active Subscription</span>
                    {modalData.active_plan ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-extrabold text-white text-sm uppercase">{modalData.active_plan.plan_name}</h4>
                          <span className="px-2 py-0.5 border border-[rgba(255,255,255,0.08)] rounded bg-black font-mono text-[9px] uppercase font-bold text-[#FFD54A]">
                            {modalData.active_plan.plan_type}
                          </span>
                        </div>

                        {modalData.active_plan.plan_type === 'hourly' && (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-[#FFD54A]" />
                            <span className="text-sm font-black text-white font-mono">
                              {Math.floor(modalData.active_plan.remaining_seconds / 3600)}h {Math.floor((modalData.active_plan.remaining_seconds % 3600) / 60)}m left
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] border-t border-[rgba(255,255,255,0.08)] pt-2 mt-1">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span>Expiration: <strong>{formatDate(modalData.active_plan.end_date)}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">No active membership found.</span>
                    )}
                  </div>

                  {/* Check-ins sessions logs list */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-white">Floor Entries List</span>
                    <div className="max-h-40 overflow-y-auto border border-[rgba(255,255,255,0.08)] rounded-xl bg-black/60 text-xs">
                      {modalData.sessions && modalData.sessions.length > 0 ? (
                        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                          {modalData.sessions.map((s: any) => (
                            <div key={s.id} className="p-3 flex justify-between items-center hover:bg-white/5 transition-all">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-white">{formatDate(s.entry_time)}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatTime(s.entry_time)} - {s.exit_time ? formatTime(s.exit_time) : 'Floor'}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                {s.status === 'active' ? (
                                  <span className="text-[#E10600] font-black uppercase text-[8px] tracking-wider animate-pulse">On Floor</span>
                                ) : (
                                  <>
                                    <span className="font-bold text-white font-mono">{s.duration}</span>
                                    <span className="text-[9px] text-[#A0A0A0] font-mono mt-0.5">
                                      {s.hours_deducted ? `-${s.hours_deducted.toFixed(2)}h` : '-'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-600">No workout records found.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-600 font-bold">Failed to load detail logs.</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[rgba(255,255,255,0.08)] bg-black/40 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 rounded bg-black border border-[rgba(255,255,255,0.08)] text-xs font-bold text-[#A0A0A0] hover:text-white"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
