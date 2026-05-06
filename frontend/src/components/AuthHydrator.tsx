'use client';

import { useEffect } from 'react';
import { useAuth } from '@/stores/authStore';
import { useNotifySocket } from '@/hooks/useNotifySocket';

export function AuthHydrator() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  // Realtime notification stream — opens once per authenticated session.
  useNotifySocket();
  return null;
}
