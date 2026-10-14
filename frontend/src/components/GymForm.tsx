'use client';

import React, { useState } from 'react';
import { ImagePlus, Loader2, LocateFixed, Trash2 } from 'lucide-react';
import { Gym, GymInput, assetUrl } from '../lib/api';
import { getCurrentPosition, parseMapsInput, validCoords } from '../lib/geo';
import GymMap from './GymMap';
import { ErrorBox, Field } from './OwnerUI';

export type GymFormValues = GymInput;

const EMPTY: GymFormValues = {
  name: '', description: '', address: '', city: '', latitude: 0, longitude: 0,
  contact_number: '', opening_time: '06:00', closing_time: '22:00', status: 'active',
};

export default function GymForm({ initial, submitLabel, onSubmit, existingPhotos, onDeletePhoto, allowStatus }: {
  initial?: Gym;
  submitLabel: string;
  onSubmit: (values: GymFormValues, newPhotos: File[]) => Promise<void>;
  existingPhotos?: Gym['photos'];
  onDeletePhoto?: (photoId: number) => Promise<void>;
  allowStatus?: boolean;
}) {
  const [v, setV] = useState<GymFormValues>(initial ? {
    name: initial.name, description: initial.description, address: initial.address, city: initial.city,
    latitude: initial.latitude, longitude: initial.longitude, contact_number: initial.contact_number,
    opening_time: initial.opening_time, closing_time: initial.closing_time, status: initial.status,
  } : EMPTY);
  const [latText, setLatText] = useState(initial ? String(initial.latitude) : '');
  const [lngText, setLngText] = useState(initial ? String(initial.longitude) : '');
  const [mapsInput, setMapsInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = <K extends keyof GymFormValues>(k: K, val: GymFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const applyCoords = (lat: number, lng: number) => {
    setV((p) => ({ ...p, latitude: lat, longitude: lng }));
    setLatText(String(Number(lat.toFixed(6))));
    setLngText(String(Number(lng.toFixed(6))));
  };

  const onLatLng = (which: 'lat' | 'lng', text: string) => {
    if (which === 'lat') setLatText(text); else setLngText(text);
    const n = parseFloat(text);
    if (Number.isFinite(n)) setV((p) => ({ ...p, [which === 'lat' ? 'latitude' : 'longitude']: n }));
  };

  const useMyLocation = async () => {
    setLocating(true);
    setNote('');
    try {
      const c = await getCurrentPosition();
      applyCoords(c.lat, c.lng);
      setNote('Pin set to your current location. Stand inside the gym for the best result, or adjust it below.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const readMapsLink = () => {
    const c = parseMapsInput(mapsInput);
    if (!c) {
      setNote('Could not find coordinates in that text. Open the gym in Google Maps, copy the full link from the address bar (not a short link) or paste "lat, lng".');
      return;
    }
    applyCoords(c.lat, c.lng);
    setNote('Location read from the link.');
  };

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 10);
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validCoords(v.latitude, v.longitude)) {
      setError('Set the gym location on the map first: use your location, paste a Google Maps link or enter coordinates.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ ...v, name: v.name.trim(), address: v.address.trim(), city: v.city.trim() }, files);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the gym');
    } finally {
      setBusy(false);
    }
  };

  const hasPin = validCoords(v.latitude, v.longitude);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <ErrorBox message={error} />

      <div className="card-charcoal p-5 bg-[#111111] grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><Field label="Gym name">
          <input required maxLength={100} value={v.name} onChange={(e) => set('name', e.target.value)} className="input-performance px-4 py-3 text-sm" />
        </Field></div>
        <div className="md:col-span-2"><Field label="About (optional)">
          <textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} className="input-performance px-4 py-3 text-sm resize-y" />
        </Field></div>
        <div className="md:col-span-2"><Field label="Address">
          <input required value={v.address} onChange={(e) => set('address', e.target.value)} className="input-performance px-4 py-3 text-sm" />
        </Field></div>
        <Field label="City"><input value={v.city} onChange={(e) => set('city', e.target.value)} className="input-performance px-4 py-3 text-sm" /></Field>
        <Field label="Contact number"><input value={v.contact_number} onChange={(e) => set('contact_number', e.target.value)} className="input-performance px-4 py-3 text-sm" /></Field>
        <Field label="Opens"><input type="time" value={v.opening_time} onChange={(e) => set('opening_time', e.target.value)} className="input-performance px-4 py-3 text-sm" /></Field>
        <Field label="Closes"><input type="time" value={v.closing_time} onChange={(e) => set('closing_time', e.target.value)} className="input-performance px-4 py-3 text-sm" /></Field>
        {allowStatus && (
          <Field label="Listing" hint="Inactive gyms are hidden from members.">
            <select value={v.status} onChange={(e) => set('status', e.target.value)} className="input-performance px-4 py-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Hidden</option>
            </select>
          </Field>
        )}
      </div>

      <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Location on Google Maps</h3>
          <p className="text-[11px] text-[#A0A0A0] mt-1">Members see this pin on the map and get distance and directions.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <button type="button" onClick={useMyLocation} disabled={locating} className="btn-gold px-4 py-3 text-[10px] font-black inline-flex items-center gap-2">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />} Use my location
          </button>
          <div className="flex-grow min-w-[220px] flex gap-2">
            <input value={mapsInput} onChange={(e) => setMapsInput(e.target.value)} placeholder="Paste a Google Maps link or “12.93, 77.62”" className="input-performance flex-grow px-3 py-3 text-xs" />
            <button type="button" onClick={readMapsLink} className="btn-gold px-4 text-[10px] font-black">Read</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input inputMode="decimal" value={latText} onChange={(e) => onLatLng('lat', e.target.value)} className="input-performance px-3 py-2.5 text-xs font-mono" /></Field>
          <Field label="Longitude"><input inputMode="decimal" value={lngText} onChange={(e) => onLatLng('lng', e.target.value)} className="input-performance px-3 py-2.5 text-xs font-mono" /></Field>
        </div>

        {note && <p className="text-[11px] text-[#A0A0A0]">{note}</p>}
        {hasPin ? <GymMap lat={v.latitude} lng={v.longitude} height={260} /> : (
          <div className="h-40 rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#A0A0A0]">Map preview appears once a location is set</div>
        )}
      </div>

      <div className="card-charcoal p-5 bg-[#111111] flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#FFD54A]">Photos <span className="text-[#A0A0A0]">(optional)</span></h3>
          <p className="text-[11px] text-[#A0A0A0] mt-1">Up to 10 photos, JPG, PNG or WebP, 5 MB each.</p>
        </div>

        {existingPhotos && existingPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingPhotos.map((p) => (
              <div key={p.id} className="relative h-24 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(p.url)} alt="" className="w-full h-full object-cover" />
                {onDeletePhoto && (
                  <button type="button" aria-label="Delete photo" onClick={() => onDeletePhoto(p.id).catch((err) => setError(err.message))}
                    className="absolute top-1 right-1 p-1.5 rounded bg-black/80 text-[#E10600]"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <ul className="text-[11px] text-[#A0A0A0] flex flex-col gap-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-[#E10600]" aria-label={`Remove ${f.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}

        <label className="btn-gold px-4 py-3 text-[10px] font-black inline-flex items-center gap-2 w-fit cursor-pointer">
          <ImagePlus className="w-4 h-4" /> Add photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      <button type="submit" disabled={busy} className="py-4 btn-red text-xs font-black max-w-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : submitLabel}
      </button>
    </form>
  );
}
