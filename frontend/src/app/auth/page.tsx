'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userApi, setAuthToken } from '../../lib/api';
import { Dumbbell, Phone, KeyRound, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// Firebase Client Web SDK imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Safe client-side initialization
let auth: any = null;
const isFirebaseConfigured = typeof window !== 'undefined' && !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase Auth SDK initialization failed:", e);
  }
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = Phone, 2 = OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devBypassOtp, setDevBypassOtp] = useState('');

  // Firebase states
  const recaptchaVerifierRef = useRef<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    // Reset recaptcha verifier on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const formattedPhone = `+91${phone}`; // Firebase standard E.164 format

      if (isFirebaseConfigured && auth) {
        // Render invisible recaptcha
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            'expired-callback': () => {
              setError('reCAPTCHA expired. Please try sending OTP again.');
            }
          });
        }
        
        const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
        setConfirmationResult(result);
        setStep(2);
        setInfo(`Verification code dispatched via SMS to ${formattedPhone}`);
      } else {
        // Fallback to legacy simulated mock OTP flow in development
        const res = await userApi.sendOTP(phone);
        setStep(2);
        setInfo(`Simulated OTP code sent to +91 ${phone}`);
        if (res.otp_dev_bypass) {
          setDevBypassOtp(res.otp_dev_bypass);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Enter 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let verifyRes;
      
      if (confirmationResult) {
        // 1. Verify OTP with Firebase Auth SDK
        const userCredential = await confirmationResult.confirm(otp);
        const idToken = await userCredential.user.getIdToken();

        // 2. Submit Firebase ID token to the Go backend for roles & JWT generation
        verifyRes = await userApi.verifyOTP(phone, idToken);
      } else {
        // Fallback mock flow verification (otp value passed in otp field)
        verifyRes = await userApi.verifyOTP(phone, undefined, otp);
      }

      // 3. Backend Role Redirection Flow
      if (verifyRes.role === 'admin') {
        setAuthToken(verifyRes.token);
        localStorage.setItem('gympass_admin_email', verifyRes.admin_email || 'admin@gympass.com');
        router.push('/admin/dashboard');
      } else {
        setAuthToken(verifyRes.token);
        localStorage.setItem('gympass_phone', phone);
        localStorage.setItem('gympass_onboarded', String(verifyRes.is_onboarded));

        if (verifyRes.is_onboarded) {
          router.push('/dashboard');
        } else {
          router.push('/auth/onboarding');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP verification failed. Check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] flex flex-col gap-6 relative z-10">
      {/* Back to home link */}
      <Link href="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#A0A0A0] hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 text-[#FFD54A]" /> Back to Home
      </Link>

      {/* Login Card */}
      <div className="card-charcoal p-8 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] bg-[#111111]">
        <div className="flex flex-col items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-5 text-center">
          <img 
            src="/logo.png" 
            alt="GymPass Logo" 
            className="h-12 w-auto object-contain mb-3"
          />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Access Gate</h2>
          <span className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-widest">
            Enter your mobile number to check into the floor
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase text-center flex items-center gap-2 justify-center">
            <ShieldAlert className="w-4 h-4" /> {error}
          </div>
        )}

        {info && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase text-center">
            {info}
          </div>
        )}

        {/* Developer Bypass OTP display */}
        {devBypassOtp && (
          <div className="p-3 bg-[#FFD54A]/10 border border-[#FFD54A]/25 text-[#FFD54A] text-[10px] font-bold uppercase flex items-center justify-center gap-2 rounded-lg">
            <KeyRound className="w-4 h-4 text-[#FFD54A]" />
            <span>Simulated OTP Code: <strong>{devBypassOtp}</strong></span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-widest">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] font-black text-xs font-mono">+91</span>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full input-performance pl-14 pr-4 py-3.5 text-xs font-bold font-mono tracking-widest text-white"
                  disabled={loading}
                  required
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 btn-red text-center text-xs font-black shadow-lg"
            >
              {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto" /> : 'Send Access OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-widest">Verification Code</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full input-performance px-4 py-3.5 text-center text-sm font-black font-mono tracking-[0.4em] text-white"
                  disabled={loading}
                  required
                />
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 btn-red text-center text-xs font-black"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto" /> : 'Verify & Enter'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setError('');
                  setInfo('');
                  setDevBypassOtp('');
                  setConfirmationResult(null);
                }}
                disabled={loading}
                className="w-full py-3 text-center text-[10px] font-bold text-[#A0A0A0] hover:text-white uppercase tracking-widest transition-colors"
              >
                Back to Mobile Number
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Invisible container for mounting Firebase reCAPTCHA */}
      <div id="recaptcha-container"></div>
    </div>
  );
}

export default function RedesignedAuthPage() {
  return (
    <div className="flex-grow flex items-center justify-center min-h-screen p-6 bg-transparent">
      <Suspense fallback={
        <div className="text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#A0A0A0]">Loading access gate...</span>
        </div>
      }>
        <AuthForm />
      </Suspense>
    </div>
  );
}
