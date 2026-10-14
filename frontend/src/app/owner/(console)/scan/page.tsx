'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Loader2, LogIn, LogOut, XCircle } from 'lucide-react';
import { ScanResult, ownerApi } from '../../../../lib/api';
import { PageTitle } from '../../../../components/OwnerUI';
import { useOwner } from '../../../../components/OwnerContext';

interface BarcodeDetectorLike { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

type Outcome = { ok: true; result: ScanResult } | { ok: false; message: string };

export default function ScanPage() {
  const { gym } = useOwner();
  const gymId = gym?.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ token: '', at: 0 });
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const submit = useCallback(async (raw: string) => {
    const token = raw.trim();
    if (!token || !gymId || busyRef.current) return;
    // The camera sees the same code many times a second; ignore repeats.
    if (lastRef.current.token === token && Date.now() - lastRef.current.at < 8000) return;
    lastRef.current = { token, at: Date.now() };
    busyRef.current = true;
    setWorking(true);
    try {
      setOutcome({ ok: true, result: await ownerApi.scan(gymId, token) });
    } catch (err) {
      setOutcome({ ok: false, message: err instanceof Error ? err.message : 'Scan failed' });
    } finally {
      busyRef.current = false;
      setWorking(false);
    }
  }, [gymId]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraError('');
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      setCameraError('This browser cannot read QR codes from the camera. Use Chrome or Edge, or paste the code below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraError('Camera access was blocked. Allow it in the browser, or paste the code below.');
    }
  };

  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => undefined);
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });
    const timer = setInterval(async () => {
      if (video.readyState < 2 || busyRef.current) return;
      try {
        const codes = await detector.detect(video);
        if (codes[0]?.rawValue) submit(codes[0].rawValue);
      } catch {
        /* a frame that cannot be read is skipped */
      }
    }, 350);
    return () => clearInterval(timer);
  }, [cameraOn, submit]);

  if (!gym) return null;

  return (
    <>
      <PageTitle title="Scan member QR" subtitle={`${gym.name}: first scan punches in, second scan punches out`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
          <div className="aspect-square max-h-[420px] w-full rounded-lg bg-black overflow-hidden border border-[rgba(255,255,255,0.08)] flex items-center justify-center relative">
            {cameraOn ? (
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-[#A0A0A0] flex flex-col items-center gap-2 p-6">
                <CameraOff className="w-8 h-8" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Camera is off</span>
              </div>
            )}
            {working && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#FFD54A] animate-spin" /></div>}
          </div>
          {cameraError && <p className="text-[11px] text-red-300">{cameraError}</p>}
          <button onClick={cameraOn ? stopCamera : startCamera} className="btn-red py-3 text-xs font-black inline-flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> {cameraOn ? 'Stop camera' : 'Start camera'}
          </button>

          <form onSubmit={(e) => { e.preventDefault(); lastRef.current = { token: '', at: 0 }; submit(manual); setManual(''); }} className="flex flex-col gap-2 border-t border-[rgba(255,255,255,0.08)] pt-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A0A0]">Or paste the member&apos;s code</span>
            <div className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="GP-…" className="input-performance flex-grow px-3 py-3 text-xs font-mono" />
              <button type="submit" disabled={working || !manual.trim()} className="btn-gold px-5 text-[10px] font-black">Scan</button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          {!outcome ? (
            <div className="card-charcoal p-10 bg-[#111111] text-center text-[11px] text-[#A0A0A0] font-bold uppercase tracking-widest">Waiting for a scan</div>
          ) : outcome.ok ? (
            <div className="card-charcoal p-6 bg-[#111111] border-[#31C46C]/40 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {outcome.result.type === 'check_in' ? <LogIn className="w-6 h-6 text-[#31C46C]" /> : <LogOut className="w-6 h-6 text-[#FFD54A]" />}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#31C46C]">{outcome.result.type === 'check_in' ? 'Punched in' : 'Punched out'}</div>
                  <div className="text-xl font-black">{outcome.result.user_name}</div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-[#31C46C] ml-auto" />
              </div>
              <p className="text-xs text-[#A0A0A0]">{outcome.result.message}</p>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {outcome.result.plan_name && <Row k="Plan" v={outcome.result.plan_name} />}
                {outcome.result.time && <Row k="Time" v={outcome.result.time} />}
                {outcome.result.entry_time && <Row k="In" v={outcome.result.entry_time} />}
                {outcome.result.exit_time && <Row k="Out" v={outcome.result.exit_time} />}
                {outcome.result.duration && <Row k="Time spent" v={outcome.result.duration} />}
                {outcome.result.hours_deducted && <Row k="Deducted" v={outcome.result.hours_deducted} />}
                {outcome.result.remaining && <Row k="Remaining" v={outcome.result.remaining} />}
                {outcome.result.valid_until && <Row k="Valid until" v={outcome.result.valid_until} />}
              </dl>
            </div>
          ) : (
            <div className="card-charcoal p-6 bg-[#111111] border-[#E10600]/40 flex items-start gap-3">
              <XCircle className="w-6 h-6 text-[#E10600] shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#E10600]">Not allowed</div>
                <p className="text-sm text-white mt-1">{outcome.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[9px] font-black uppercase tracking-widest text-[#A0A0A0]">{k}</dt>
      <dd className="font-mono font-bold">{v}</dd>
    </div>
  );
}
