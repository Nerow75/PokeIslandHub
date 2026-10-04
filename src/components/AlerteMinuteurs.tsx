// src/components/AlerteMinuteurs.tsx

import { useEffect, useRef, type FC } from "react";
import {
  attenteAvantPassage,
  formaterAttente,
  LIBELLES_CATEGORIE,
  prochainPassage,
  type Minuteur,
} from "../domaine/minuteurs.ts";
import { lirePreferenceNotifications, notificationsDisponibles } from "../domaine/preferences.ts";
import { useMaintenant } from "../hooks/useMaintenant.ts";

interface AlerteMinuteursProps {
  minuteurs: readonly Minuteur[];
  onOuvrir: () => void;
}

/* Fenêtre pendant laquelle un minuteur est considéré comme "venant de se libérer". */
const FENETRE_NOTIFICATION_MS = 5_000;

/**
 * Repère de la barre du haut : votes, dresseurs et PokéStops disponibles (mis en avant)
 * ou délai avant le prochain, et notification système au moment où un minuteur se
 * libère, quel que soit l'onglet. Composant isolé : seul lui se rafraîchit chaque seconde.
 */
const AlerteMinuteurs: FC<AlerteMinuteursProps> = ({ minuteurs, onOuvrir }) => {
  const maintenant = useMaintenant();
  const dejaSignales = useRef(new Set<string>());

  useEffect(() => {
    for (const minuteur of minuteurs) {
      if (!minuteur.dernier || attenteAvantPassage(minuteur, maintenant) > 0) continue;
      const cle = `${minuteur.id}:${minuteur.dernier}`;
      if (dejaSignales.current.has(cle)) continue;
      dejaSignales.current.add(cle);
      const vientDeSeLiberer =
        maintenant.getTime() - (prochainPassage(minuteur)?.getTime() ?? 0) <
        FENETRE_NOTIFICATION_MS;
      if (
        vientDeSeLiberer &&
        lirePreferenceNotifications() &&
        notificationsDisponibles() &&
        Notification.permission === "granted"
      ) {
        new Notification("PokeIslandHub", {
          body: `${minuteur.nom} : ${LIBELLES_CATEGORIE[minuteur.categorie].disponible}.`,
        });
      }
    }
  }, [minuteurs, maintenant]);

  if (minuteurs.length === 0) return null;
  const attentes = minuteurs.map((minuteur) => ({
    minuteur,
    attente: attenteAvantPassage(minuteur, maintenant),
  }));
  const disponibles = attentes.filter(({ attente }) => attente === 0).map((a) => a.minuteur);
  if (disponibles.length > 0) {
    const noms = disponibles.map((m) => m.nom).join(", ");
    return (
      <button
        type="button"
        className="repere repere--votes-dispo"
        onClick={onOuvrir}
        title={`Disponible : ${noms}`}
        aria-label={`${disponibles.length} à faire : ${noms}`}
      >
        À faire <span className="repere__compteur">{disponibles.length}</span>
      </button>
    );
  }
  const prochain = attentes.reduce((a, b) => (b.attente < a.attente ? b : a));
  return (
    <button
      type="button"
      className="repere"
      onClick={onOuvrir}
      title={`Prochain : ${prochain.minuteur.nom}`}
    >
      <span className="repere__libelle">Prochain dans</span>
      <span className="repere__chiffre">{formaterAttente(prochain.attente)}</span>
    </button>
  );
};

export default AlerteMinuteurs;
