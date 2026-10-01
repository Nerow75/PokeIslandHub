// src/hooks/useMaintenant.ts

import { useEffect, useState } from "react";

/** Heure courante, rafraîchie à intervalle régulier (comptes à rebours). */
export function useMaintenant(intervalleMs = 1000): Date {
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(new Date()), intervalleMs);
    return () => clearInterval(minuteur);
  }, [intervalleMs]);
  return maintenant;
}
