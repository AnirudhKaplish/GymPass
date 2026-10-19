'use client';

import { createContext, useContext } from 'react';
import type { Gym } from '../lib/api';

export interface OwnerCtx {
  gyms: Gym[];
  gym: Gym | null;
  selectGym: (id: number) => void;
  reloadGyms: () => Promise<void>;
}

export const OwnerContext = createContext<OwnerCtx | null>(null);

export function useOwner(): OwnerCtx {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error('useOwner must be used inside the owner console');
  return ctx;
}
