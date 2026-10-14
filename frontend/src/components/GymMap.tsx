'use client';

import { ExternalLink, Navigation } from 'lucide-react';
import { directionsLink, mapEmbedUrl, mapsLink } from '../lib/geo';

export default function GymMap({ lat, lng, height = 240, showLinks = true }: { lat: number; lng: number; height?: number; showLinks?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-black" style={{ height }}>
        <iframe
          title="Gym location on Google Maps"
          src={mapEmbedUrl(lat, lng)}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {showLinks && (
        <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider">
          <a href={mapsLink(lat, lng)} target="_blank" rel="noopener noreferrer" className="text-[#FFD54A] hover:underline inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Open in Google Maps
          </a>
          <a href={directionsLink(lat, lng)} target="_blank" rel="noopener noreferrer" className="text-[#FFD54A] hover:underline inline-flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Directions
          </a>
        </div>
      )}
    </div>
  );
}
