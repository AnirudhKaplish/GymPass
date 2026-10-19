'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ownerApi, setAuth } from '../lib/api';

export default function OwnerAuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isRegister
        ? await ownerApi.register(name.trim(), email.trim(), phone.trim(), password)
        : await ownerApi.login(email.trim(), password);
      setAuth(res.token, 'owner');
      router.push(isRegister ? '/owner/gyms/new' : '/owner/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#A0A0A0] hover:text-white w-fit">
          <ArrowLeft className="w-4 h-4 text-[#FFD54A]" /> Back to home
        </Link>
        <div className="card-charcoal p-8 bg-[#111111] flex flex-col gap-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FFD54A]">Gym owners</span>
            <h1 className="text-2xl font-black uppercase tracking-tight mt-1">{isRegister ? 'Create owner account' : 'Owner sign in'}</h1>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</div>}

          <form onSubmit={submit} className="flex flex-col gap-4">
            {isRegister && (
              <>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="input-performance px-4 py-3 text-sm" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" autoComplete="tel" className="input-performance px-4 py-3 text-sm" />
              </>
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className="input-performance px-4 py-3 text-sm" />
            <input required type="password" minLength={isRegister ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Password (8+ characters)' : 'Password'} autoComplete={isRegister ? 'new-password' : 'current-password'} className="input-performance px-4 py-3 text-sm" />
            <button type="submit" disabled={loading} className="py-3.5 btn-red text-xs font-black">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">
            {isRegister ? (
              <>Already registered? <Link href="/owner/login" className="text-[#FFD54A] hover:underline">Sign in</Link></>
            ) : (
              <>New gym? <Link href="/owner/register" className="text-[#FFD54A] hover:underline">Register as an owner</Link></>
            )}
          </p>
          <p className="text-center text-[10px] text-[#A0A0A0]/70">
            Looking to work out? <Link href="/auth" className="text-[#FFD54A] hover:underline">Member sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
