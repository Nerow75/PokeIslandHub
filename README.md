# PokeIslandHub

Outil de suivi pour le serveur Minecraft Pokémon **PokeIsland** (mod Cobblemon). Un seul fichier à ouvrir dans le navigateur : rien à installer, pas de compte, pas de connexion.

## Ce qu'il fait

| Onglet | À quoi ça sert |
|---|---|
| **Pokédex** | Toutes les générations, chaque Pokémon marqué vu ou capturé, avec le taux de complétion pour les rangs du serveur |
| **Fiche** | Tout sur un Pokémon : famille d'évolution, recherche PokéFinder, EV, stratégie, où le trouver |
| **Stratégie** | Tes captures classées selon les tiers Smogon et une team proposée pour les arènes |
| **Chasse** | Le défi de la chasse : six Pokémon à capturer en une heure |
| **Évolutions** | Les évolutions que tu peux faire avec ce que tu as déjà capturé (évolutions Cobblemon, pas celles des jeux officiels) |
| **Où trouver** | Biomes et conditions d'apparition dans Cobblemon |
| **PokéFinder** | Génère la recherche à coller dans l'item PokéFinder du jeu |
| **EV** | Les EV rapportés par chaque Pokémon |
| **Minuteurs** | Votes, dresseurs à recombattre et PokéStops de chaque monde : le hub te dit quand c'est de nouveau dispo |

## Installation (2 minutes)

1. **Télécharge le fichier** : [PokeIslandHub.html](https://github.com/Nerow75/PokeIslandHub/releases/latest/download/PokeIslandHub.html)
   (ou va dans [Releases](https://github.com/Nerow75/PokeIslandHub/releases/latest) et prends `PokeIslandHub.html` dans *Assets*).
2. **Range-le** où tu veux, par exemple dans *Documents*. Évite de le laisser dans *Téléchargements* si tu fais le ménage souvent.
3. **Double-clique dessus** : il s'ouvre dans ton navigateur (Chrome, Firefox, Edge...). C'est tout.

Astuce : ajoute la page à tes favoris pour la rouvrir en un clic.

> Si le navigateur affiche un avertissement au téléchargement, c'est simplement parce que c'est un fichier `.html`. Le fichier ne contient que l'application, rien n'est envoyé sur Internet.

Prévu pour un ordinateur. Sur téléphone, ouvrir un fichier HTML local marche mal selon les appareils.

## Ta progression

Tout est enregistré **dans ton navigateur**, automatiquement. Le badge **Navigateur** en haut de la page le rappelle.

Ça veut dire :

- Ouvre toujours le fichier avec **le même navigateur**, sinon tu repars de zéro.
- Si tu vides l'historique / les données de navigation, la progression peut partir avec.
- **Pense à exporter** de temps en temps : clique sur le badge **Navigateur** en haut, puis **Exporter**. Tu obtiens un petit fichier `.json`, garde-le précieusement.

Pour récupérer ta progression (autre PC, autre navigateur, après un nettoyage) : badge **Navigateur** > **Importer**, puis choisis ton fichier `.json`. Un fichier invalide est refusé sans toucher à ta progression actuelle.

## Mettre à jour

1. Exporte ta progression (voir ci-dessus), par sécurité.
2. Télécharge le nouveau `PokeIslandHub.html` avec le même lien et remplace l'ancien fichier **au même endroit**.
3. Rouvre-le : ta progression est toujours là. Les anciennes sauvegardes sont converties automatiquement.

Si ta progression n'apparaît pas (fichier rangé ailleurs, autre nom), importe ton export.

## Questions fréquentes

**Une évolution ou une apparition ne correspond pas à ce que je vois en jeu ?**
Les données viennent de Cobblemon et de PokeAPI. Le serveur peut avoir ses propres réglages : signale l'écart dans une [issue](https://github.com/Nerow75/PokeIslandHub/issues).

**C'est officiel ?**
Non, c'est un outil fait par un joueur, sans lien avec l'équipe de PokeIsland, Cobblemon, Nintendo ou The Pokémon Company.

---

## Pour les développeurs

Vite + React + TypeScript, sans backend.

```bash
npm install
npm run dev              # lance le hub, progression dans donnees/sauvegarde.json
npm test                 # tests
npm run build:portable   # produit dist-portable/PokeIslandHub.html
```

Publier une version : incrémenter `version` dans `package.json`, lancer `npm run build:portable`, puis
`gh release create vX.Y.Z dist-portable/PokeIslandHub.html`. Le nom du fichier doit rester `PokeIslandHub.html` pour que le lien de téléchargement direct continue de marcher.
