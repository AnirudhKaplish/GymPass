'use client';

import React from 'react';

export default function CinematicContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex-grow flex flex-col">
      {children}
    </div>
  );
}
