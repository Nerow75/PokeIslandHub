// src/components/AlerteVotes.tsx

import { useEffect, useRef, type FC } from "react";
import { lirePreferenceNotifications, notificationsDisponibles } from "../domaine/preferences.ts";
import { attenteAvantVote, formaterAttente, prochainVote, type Vote } from "../domaine/votes.ts";
import { useMaintenant } from "../hooks/useMaintenant.ts";

interface AlerteVotesProps {
  votes: readonly Vote[];
  onOuvrir: () => void;
}

/* Fenêtre pendant laquelle un vote est considéré comme "venant de se libérer". */
const FENETRE_NOTIFICATION_MS = 5_000;

/**
 * Repère de la barre du haut : votes disponibles (mis en avant) ou délai avant le
 * prochain, et notification
 * système au moment où un vote se libère (quel que soit l'onglet affiché).
 * Composant isolé : seul lui se rafraîchit chaque seconde.
 */
const AlerteVotes: FC<AlerteVotesProps> = ({ votes, onOuvrir }) => {
  const maintenant = useMaintenant();
  const dejaSignales = useRef(new Set<string>());

  useEffect(() => {
    for (const vote of votes) {
      if (!vote.dernierVote || attenteAvantVote(vote, maintenant) > 0) continue;
      const cle = `${vote.id}:${vote.dernierVote}`;
      if (dejaSignales.current.has(cle)) continue;
      dejaSignales.current.add(cle);
      const vientDeSeLiberer =
        maintenant.getTime() - (prochainVote(vote)?.getTime() ?? 0) < FENETRE_NOTIFICATION_MS;
      if (
        vientDeSeLiberer &&
        lirePreferenceNotifications() &&
        notificationsDisponibles() &&
        Notification.permission === "granted"
      ) {
        new Notification("PokeIslandHub", { body: `${vote.nom} : tu peux revoter.` });
      }
    }
  }, [votes, maintenant]);

  if (votes.length === 0) return null;
  const attentes = votes.map((vote) => attenteAvantVote(vote, maintenant));
  const disponibles = attentes.filter((attente) => attente === 0).length;
  if (disponibles > 0) {
    return (
      <button
        type="button"
        className="repere repere--votes-dispo"
        onClick={onOuvrir}
        aria-label={disponibles === 1 ? "1 vote disponible" : `${disponibles} votes disponibles`}
      >
        Votes <span className="repere__compteur">{disponibles}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="repere"
      onClick={onOuvrir}
      title="Aucun vote disponible : délai avant le prochain"
    >
      <span className="repere__libelle">Vote dans</span>
      <span className="repere__chiffre">{formaterAttente(Math.min(...attentes))}</span>
    </button>
  );
};

export default AlerteVotes;
