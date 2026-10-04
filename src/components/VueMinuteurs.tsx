// src/components/VueMinuteurs.tsx

import { useState, type FC, type FormEvent } from "react";
import {
  attenteAvantPassage,
  CATEGORIES_MINUTEUR,
  formaterAttente,
  LIBELLES_CATEGORIE,
  normaliserUrl,
  prochainPassage,
  type CategorieMinuteur,
  type Minuteur,
} from "../domaine/minuteurs.ts";
import {
  enregistrerPreferenceNotifications,
  lirePreferenceNotifications,
  notificationsDisponibles,
} from "../domaine/preferences.ts";
import { useMaintenant } from "../hooks/useMaintenant.ts";

interface VueMinuteursProps {
  minuteurs: readonly Minuteur[];
  onMinuteurChange: (id: string, transformer: (minuteur: Minuteur) => Minuteur) => void;
  onAjouter: (categorie: CategorieMinuteur) => string;
  onSupprimer: (id: string) => void;
}

const FORMAT_HEURE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function FormulaireMinuteur({
  minuteur,
  onEnregistrer,
  onAnnuler,
  onSupprimer,
}: {
  minuteur: Minuteur;
  onEnregistrer: (modifications: Pick<Minuteur, "nom" | "url" | "delaiMinutes">) => void;
  onAnnuler: () => void;
  onSupprimer: () => void;
}) {
  const [nom, setNom] = useState(minuteur.nom);
  const [url, setUrl] = useState(minuteur.url ?? "");
  const [heures, setHeures] = useState(String(minuteur.delaiMinutes / 60));
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  const handleEnvoi = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const urlNormalisee = normaliserUrl(url);
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
    <form className="minuteur__formulaire" onSubmit={handleEnvoi}>
      <label>
        Nom
        <input type="text" value={nom} maxLength={60} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Lien {minuteur.categorie === "vote" ? "du site de vote" : "(facultatif)"}
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label>
        Délai avant de pouvoir recommencer (heures)
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
      <div className="minuteur__boutons">
        <button type="submit" className="bouton bouton--plein">
          Enregistrer
        </button>
        <button type="button" className="bouton" onClick={onAnnuler}>
          Annuler
        </button>
        <button
          type="button"
          className="minuteur__lien-discret minuteur__supprimer"
          onClick={() => (confirmerSuppression ? onSupprimer() : setConfirmerSuppression(true))}
        >
          {confirmerSuppression ? "Confirmer la suppression" : "Supprimer"}
        </button>
      </div>
    </form>
  );
}

function CarteMinuteur({
  minuteur,
  maintenant,
  estEnEdition,
  onEdition,
  onMinuteurChange,
  onSupprimer,
}: {
  minuteur: Minuteur;
  maintenant: Date;
  estEnEdition: boolean;
  onEdition: (estEnEdition: boolean) => void;
  onMinuteurChange: VueMinuteursProps["onMinuteurChange"];
  onSupprimer: VueMinuteursProps["onSupprimer"];
}) {
  /* Dernier passage avant le clic, pour annuler une erreur de manipulation. */
  const [annulable, setAnnulable] = useState<{ precedent: string | null } | null>(null);
  const libelles = LIBELLES_CATEGORIE[minuteur.categorie];

  const attente = attenteAvantPassage(minuteur, maintenant);
  const estDisponible = attente === 0;
  const prochain = prochainPassage(minuteur);
  const progression = minuteur.dernier
    ? Math.min(100, 100 - (attente / (minuteur.delaiMinutes * 60_000)) * 100)
    : 100;

  const handleFait = (): void => {
    setAnnulable({ precedent: minuteur.dernier });
    onMinuteurChange(minuteur.id, (m) => ({ ...m, dernier: new Date().toISOString() }));
  };

  if (estEnEdition) {
    return (
      <li className="minuteur">
        <FormulaireMinuteur
          minuteur={minuteur}
          onAnnuler={() => onEdition(false)}
          onSupprimer={() => onSupprimer(minuteur.id)}
          onEnregistrer={(modifications) => {
            onMinuteurChange(minuteur.id, (m) => ({ ...m, ...modifications }));
            onEdition(false);
          }}
        />
      </li>
    );
  }

  let detail = "Jamais fait.";
  if (prochain && !estDisponible) {
    detail = `Disponible : ${FORMAT_HEURE.format(prochain)}`;
  } else if (minuteur.dernier) {
    detail = `${libelles.fait} : ${FORMAT_HEURE.format(new Date(minuteur.dernier))}`;
  }

  return (
    <li className={`minuteur${estDisponible ? " minuteur--disponible" : ""}`}>
      <div className="minuteur__entete">
        <h4>{minuteur.nom}</h4>
        <button type="button" className="minuteur__lien-discret" onClick={() => onEdition(true)}>
          Modifier
        </button>
      </div>

      <p className="minuteur__etat" role="timer" aria-live="off">
        {estDisponible ? "Disponible" : formaterAttente(attente)}
      </p>
      <div
        className="minuteur__jauge"
        role="progressbar"
        aria-label="Temps écoulé depuis la dernière fois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progression)}
      >
        <span style={{ transform: `scaleX(${progression / 100})` }} />
      </div>
      <p className="texte-discret">{detail}</p>

      <div className="minuteur__boutons">
        {minuteur.url && (
          <a className="bouton" href={minuteur.url} target="_blank" rel="noopener noreferrer">
            Ouvrir le site
          </a>
        )}
        {!minuteur.url && minuteur.categorie === "vote" && (
          <button type="button" className="bouton" onClick={() => onEdition(true)}>
            Ajouter le lien
          </button>
        )}
        <button
          type="button"
          className="bouton bouton--plein"
          onClick={handleFait}
          disabled={!estDisponible}
        >
          {libelles.action}
        </button>
      </div>
      {annulable && !estDisponible && (
        <button
          type="button"
          className="minuteur__lien-discret minuteur__annuler"
          onClick={() => {
            onMinuteurChange(minuteur.id, (m) => ({ ...m, dernier: annulable.precedent }));
            setAnnulable(null);
          }}
        >
          Annuler
        </button>
      )}
    </li>
  );
}

/**
 * Minuteurs du serveur : votes, dresseurs à recombattre et PokéStops à retourner,
 * avec le compte à rebours avant de pouvoir recommencer.
 */
const VueMinuteurs: FC<VueMinuteursProps> = ({
  minuteurs,
  onMinuteurChange,
  onAjouter,
  onSupprimer,
}) => {
  const maintenant = useMaintenant();
  const [idEnEdition, setIdEnEdition] = useState<string | null>(null);
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
    <section aria-labelledby="titre-minuteurs" className="vue">
      <div className="vue__entete">
        <h2 id="titre-minuteurs">Minuteurs</h2>
        <p className="texte-discret">
          Clique sur le bouton d'action après chaque vote, combat ou tournée de PokéStops : le hub
          indique quand recommencer.
        </p>
      </div>
      {notificationsDisponibles() && (
        <label className="case-a-cocher">
          <input
            type="checkbox"
            checked={notifier}
            onChange={(e) => void handleNotifications(e.target.checked)}
          />
          Me prévenir par une notification quand un minuteur se libère (hub ouvert, quel que soit
          l'onglet)
        </label>
      )}
      {CATEGORIES_MINUTEUR.map((categorie) => {
        const libelles = LIBELLES_CATEGORIE[categorie];
        const liste = minuteurs.filter((m) => m.categorie === categorie);
        return (
          <section
            key={categorie}
            aria-labelledby={`titre-minuteurs-${categorie}`}
            className="minuteurs__section"
          >
            <div className="minuteurs__entete">
              <h3 id={`titre-minuteurs-${categorie}`}>{libelles.titre}</h3>
              <button
                type="button"
                className="bouton bouton--petit"
                onClick={() => setIdEnEdition(onAjouter(categorie))}
              >
                Ajouter
              </button>
            </div>
            {liste.length === 0 ? (
              <p className="texte-discret">Aucun pour l'instant.</p>
            ) : (
              <ul className="minuteurs">
                {liste.map((minuteur) => (
                  <CarteMinuteur
                    key={minuteur.id}
                    minuteur={minuteur}
                    maintenant={maintenant}
                    estEnEdition={idEnEdition === minuteur.id}
                    onEdition={(estEnEdition) => setIdEnEdition(estEnEdition ? minuteur.id : null)}
                    onMinuteurChange={onMinuteurChange}
                    onSupprimer={(id) => {
                      onSupprimer(id);
                      setIdEnEdition(null);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </section>
  );
};

export default VueMinuteurs;
