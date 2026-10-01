// src/components/VueVotes.tsx

import { useState, type FC, type FormEvent } from "react";
import {
  enregistrerPreferenceNotifications,
  lirePreferenceNotifications,
  notificationsDisponibles,
} from "../domaine/preferences.ts";
import {
  attenteAvantVote,
  formaterAttente,
  normaliserUrlVote,
  prochainVote,
  type Vote,
} from "../domaine/votes.ts";
import { useMaintenant } from "../hooks/useMaintenant.ts";

interface VueVotesProps {
  votes: readonly Vote[];
  onVoteChange: (id: string, transformer: (vote: Vote) => Vote) => void;
}

const FORMAT_HEURE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function FormulaireVote({
  vote,
  onEnregistrer,
  onAnnuler,
}: {
  vote: Vote;
  onEnregistrer: (modifications: Pick<Vote, "nom" | "url" | "delaiMinutes">) => void;
  onAnnuler: () => void;
}) {
  const [nom, setNom] = useState(vote.nom);
  const [url, setUrl] = useState(vote.url ?? "");
  const [heures, setHeures] = useState(String(vote.delaiMinutes / 60));
  const [erreur, setErreur] = useState<string | null>(null);

  const handleEnvoi = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const urlNormalisee = normaliserUrlVote(url);
    const delai = Math.round(Number(heures.replace(",", ".")) * 60);
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    if (url.trim() && !urlNormalisee) {
      setErreur("Lien invalide : http(s) uniquement.");
      return;
    }
    if (!Number.isFinite(delai) || delai <= 0) {
      setErreur("Délai invalide.");
      return;
    }
    onEnregistrer({ nom: nom.trim().slice(0, 60), url: urlNormalisee, delaiMinutes: delai });
  };

  return (
    <form className="vote__formulaire" onSubmit={handleEnvoi}>
      <label>
        Nom
        <input type="text" value={nom} maxLength={60} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Lien du site de vote
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label>
        Délai entre deux votes (heures)
        <input
          type="text"
          inputMode="decimal"
          value={heures}
          onChange={(e) => setHeures(e.target.value)}
        />
      </label>
      {erreur && (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      )}
      <div className="vote__boutons">
        <button type="submit" className="bouton bouton--plein">
          Enregistrer
        </button>
        <button type="button" className="bouton" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function CarteVote({
  vote,
  maintenant,
  onVoteChange,
}: {
  vote: Vote;
  maintenant: Date;
  onVoteChange: VueVotesProps["onVoteChange"];
}) {
  const [estEnEdition, setEstEnEdition] = useState(false);
  /* Dernier vote avant le clic, pour annuler une erreur de manipulation. */
  const [voteAnnulable, setVoteAnnulable] = useState<{ precedent: string | null } | null>(null);

  const attente = attenteAvantVote(vote, maintenant);
  const estDisponible = attente === 0;
  const prochain = prochainVote(vote);
  const progression = vote.dernierVote
    ? Math.min(100, 100 - (attente / (vote.delaiMinutes * 60_000)) * 100)
    : 100;

  const handleVote = (): void => {
    setVoteAnnulable({ precedent: vote.dernierVote });
    onVoteChange(vote.id, (v) => ({ ...v, dernierVote: new Date().toISOString() }));
  };

  if (estEnEdition) {
    return (
      <li className="vote">
        <FormulaireVote
          vote={vote}
          onAnnuler={() => setEstEnEdition(false)}
          onEnregistrer={(modifications) => {
            onVoteChange(vote.id, (v) => ({ ...v, ...modifications }));
            setEstEnEdition(false);
          }}
        />
      </li>
    );
  }

  let detail = "Aucun vote enregistré.";
  if (prochain && !estDisponible) {
    detail = `Prochain vote : ${FORMAT_HEURE.format(prochain)}`;
  } else if (vote.dernierVote) {
    detail = `Dernier vote : ${FORMAT_HEURE.format(new Date(vote.dernierVote))}`;
  }

  return (
    <li className={`vote${estDisponible ? " vote--disponible" : ""}`}>
      <div className="vote__entete">
        <h3>{vote.nom}</h3>
        <button type="button" className="vote__modifier" onClick={() => setEstEnEdition(true)}>
          Modifier
        </button>
      </div>

      <p className="vote__etat" role="timer" aria-live="off">
        {estDisponible ? "Disponible" : formaterAttente(attente)}
      </p>
      <div
        className="vote__jauge"
        role="progressbar"
        aria-label="Temps écoulé depuis le dernier vote"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progression)}
      >
        <span style={{ transform: `scaleX(${progression / 100})` }} />
      </div>
      <p className="texte-discret">{detail}</p>

      <div className="vote__boutons">
        {vote.url ? (
          <a className="bouton" href={vote.url} target="_blank" rel="noopener noreferrer">
            Ouvrir le site
          </a>
        ) : (
          <button type="button" className="bouton" onClick={() => setEstEnEdition(true)}>
            Ajouter le lien
          </button>
        )}
        <button
          type="button"
          className="bouton bouton--plein"
          onClick={handleVote}
          disabled={!estDisponible}
        >
          J'ai voté
        </button>
      </div>
      {voteAnnulable && !estDisponible && (
        <button
          type="button"
          className="vote__annuler"
          onClick={() => {
            onVoteChange(vote.id, (v) => ({ ...v, dernierVote: voteAnnulable.precedent }));
            setVoteAnnulable(null);
          }}
        >
          Annuler ce vote
        </button>
      )}
    </li>
  );
}

/**
 * Votes pour le serveur : compte à rebours avant de pouvoir revoter sur chaque site.
 */
const VueVotes: FC<VueVotesProps> = ({ votes, onVoteChange }) => {
  const maintenant = useMaintenant();
  const [notifier, setNotifier] = useState(lirePreferenceNotifications);
  const handleNotifications = async (estActive: boolean): Promise<void> => {
    if (estActive && notificationsDisponibles() && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    setNotifier(estActive);
    enregistrerPreferenceNotifications(estActive);
  };

  return (
    <section aria-labelledby="titre-votes" className="vue">
      <div className="vue__entete">
        <h2 id="titre-votes">Votes</h2>
        <p className="texte-discret">
          Clique sur « J'ai voté » après chaque vote : le hub indique quand revoter.
        </p>
      </div>
      {notificationsDisponibles() && (
        <label className="case-a-cocher">
          <input
            type="checkbox"
            checked={notifier}
            onChange={(e) => void handleNotifications(e.target.checked)}
          />
          Me prévenir par une notification quand un vote se libère (hub ouvert, quel que soit
          l'onglet)
        </label>
      )}
      <ul className="votes">
        {votes.map((vote) => (
          <CarteVote
            key={vote.id}
            vote={vote}
            maintenant={maintenant}
            onVoteChange={onVoteChange}
          />
        ))}
      </ul>
    </section>
  );
};

export default VueVotes;
