# Suivi d'exercices — spécification & état d'avancement

> Document de reprise (handoff). Toute IA ou personne peut lire ce fichier pour continuer le projet sans contexte préalable.

## 1. Concept

Application web **local-first (PWA)** pour un enseignant : suivre la progression des élèves dans des exercices.

- Développée sous **Linux**, doit tourner sur **macOS** (via navigateur).
- **Un seul appareil** : élèves ET prof utilisent la même machine (pas de comptes, pas de multi-utilisateur).
- L'application gère **plusieurs classes et plusieurs branches**. L’utilisateur choisit un couple classe–branche actif dans un sélecteur global.
- Une branche possède ses thèmes et exercices et peut être partagée par plusieurs classes. Une classe possède sa propre liste d’élèves et peut utiliser plusieurs branches.
- **Zéro coût** : aucun hébergement payant, aucun backend. Fonctionne **hors-ligne**.
- 3 niveaux de progression : **rien / en cours / terminé**.

## 2. Stack technique (décidée)

- **Vue 3 + Vite + TypeScript** (template `vue-ts`).
- **Dexie** → stockage local **IndexedDB** = source de vérité (persistant ; verrouiller via `navigator.storage.persist()`).
- **vite-plugin-pwa** → offline + manifest + installation.
- **ExcelJS** → export `.xlsx`.
- Hébergement gratuit **GitHub Pages** (remote : `git@github.com:arnaud-maillard1/exercises-monitoring.git`).

### Environnement de dev
- Runtime Node géré par **mise** (façon `uv`) : version épinglée dans `mise.toml`, Node installé dans `~/.local` (rien en bare-metal). Activation dans `~/.zshrc` : `eval "$(~/.local/bin/mise activate zsh)"`.
- Dépendances isolées dans `node_modules/`.
- Commandes : `npm run dev` (dev), `npm run build` (build → `dist/`), `npm run preview`.

## 3. Modèle de données

```
Branche     : nom
Classe      : nom
ClasseBranche : association plusieurs-à-plusieurs
Élève       : nom, appartient à 1 classe
Thème       : nom, appartient à 1 branche
Exercice    : nom, appartient à 1 thème
Progression : (élève × exercice) → 'rien' | 'en cours' | 'terminé'
Session     : liste d'exercices sélectionnés — une session courante
              par couple classe–branche
              (historique = évolution future ; concevoir le modèle extensible)
Configuration : classe active, branche active, date de la dernière copie externe
```
- Suppression **en cascade avec confirmation** (supprimer un thème → ses exercices + progressions ; supprimer un élève/exercice → ses progressions).
- Ordre d'affichage : par création + **tri alphabétique** + **flèches ↑/↓** pour déplacer une sélection.
- Retirer une association classe–branche masque les données correspondantes sans effacer les progressions. Supprimer réellement une classe ou une branche applique les cascades après confirmation.
- L'action « Recommencer à zéro » vide toutes les données après confirmation, puis recrée une classe et une branche par défaut.

## 4. Les 4 pages

Un bandeau global permet de choisir la **classe** puis l’une de ses **branches associées**, et d’ouvrir la gestion des classes, branches et associations.

1. **Classe** — liste des élèves de la classe active ; ajouter / supprimer.
2. **Thèmes & exercices** — CRUD des thèmes et exercices de la branche active (exercice rattaché à un thème).
3. **Suivi (prof)** — tableau : 1 ligne/élève × 1 colonne/exercice, colonnes **groupées par thème**. Édition d'une case = **clic-qui-défile** (rien → en cours → terminé → rien).
4. **Espace élèves** — bouton « Choisir les exercices » (popup de sélection) + tableau **réduit aux exercices sélectionnés**, édition par **menu déroulant**. Les élèves y marquent leur progression.

> Les pages Suivi et Espace élèves partagent la **même** donnée de progression : un changement côté élève apparaît immédiatement chez le prof. Seul le filtre d'exercices diffère (tous vs sélectionnés).

## 5. Sauvegarde & fichiers

- **IndexedDB** est la mémoire principale. Chaque modification y est enregistrée automatiquement et survit à la fermeture du navigateur.
- L'application ne dépend pas d'un fichier ouvert en permanence et se comporte de la même manière dans Chrome, Edge, Safari et Firefox.
- **Copie `.suiviexos`** : fichier JSON avec une extension propre à l'application. Il contient l’ensemble des classes, branches, associations, élèves, thèmes, exercices, progressions, sessions et configuration.
- **Télécharger une copie** produit un fichier daté, par exemple `suivi-exercices-2026-08-12-1430.suiviexos`.
- **Ouvrir une copie** valide entièrement le fichier, affiche son résumé, puis demande confirmation avant de remplacer les données actuelles dans une transaction unique. Les anciennes copies au format branche unique sont converties automatiquement.
- L'interface affiche un **rappel de sauvegarde externe** lorsqu'aucune copie n'a été téléchargée depuis plus de 7 jours.
- **Export `.xlsx`** (lecture, via ExcelJS) : il porte sur le couple classe–branche actif ; les deux noms apparaissent dans le classeur et son nom de fichier ; le thème est en cellule fusionnée horizontalement au-dessus de ses exercices ; chaque exercice occupe une cellule ; chaque élève occupe une ligne ; les états sont écrits en clair et colorés. Les en-têtes et la colonne des élèves sont figés.
- Le fichier Excel sert à consulter, imprimer ou transmettre le suivi. Il ne peut pas être réimporté dans l'application.

## 6. Plan de tâches & avancement

- [x] **1. Init projet Vue 3 + Vite + TypeScript** — FAIT (dev server OK).
- [x] **2. Configurer la PWA** — vite-plugin-pwa : manifest (nom, icônes, thème), service worker offline, cache. Génère les icônes. Touche surtout `vite.config.ts`.
- [x] **3. Stockage Dexie** — schéma des tables (eleves, themes, exercices, progressions, session/config) + couche d'accès (composables). Activer `navigator.storage.persist()`. Définir les types TS (dont `type Etat = 'rien' | 'en cours' | 'terminé'`).
- [x] **4. Navigation + layout global** — router (ou onglets) entre les 4 pages ; barre de nav ; styles de base. Réécrit `App.vue`.
- [x] **5. Page « Classe »** — CRUD élèves, tri alpha, flèches ↑/↓, confirmations.
- [x] **6. Page « Thèmes & exercices »** — CRUD thèmes + exercices, cascade, tri, flèches.
- [x] **7. Composant tableau de progression réutilisable** — paramétrable : filtre exercices (tous vs session) + mode d'édition (clic-qui-défile vs menu déroulant) ; couleurs + légende. Utilisé par les pages 8 et 9.
- [x] **8. Page « Suivi (prof) »** — tableau (tous les exercices), clic-qui-défile.
- [x] **9. Page « Espace élèves »** — popup de sélection + tableau réduit + menus déroulants ; une sélection stockée par couple classe–branche.
- [x] **10. Export Excel (.xlsx)** — ExcelJS, nom de branche, cellules fusionnées par thème, couleurs et volets figés.
- [x] **11. Copies `.suiviexos`** — export/import complet, validation avant remplacement, nom de branche, rappel de copie externe et remise à zéro.
- [x] **12. Style / UX / responsive** — tablette/tactile, tableaux larges (scroll horizontal, colonne des élèves figée), états vides, focus clavier et retour à la ligne des noms longs.
- [x] **13. Test PWA hors-ligne + installation** — build de production testé avec `npm run preview`, service worker, fonctionnement hors ligne, persistance et installation validés.
- [x] **14. Déploiement GitHub Pages + notice** — `base` Vite = `/exercises-monitoring/`, workflow GitHub Actions ; mode d'emploi court de l'application et instructions d'installation PWA pour Chrome/Edge et Safari sur macOS.
- [x] **15. Multi-classes / multi-branches** — sélecteur global, gestion des associations, élèves par classe, exercices par branche, progression et session par couple, migration IndexedDB et copies complètes rétrocompatibles.

## 7. Conventions & décisions

- **JavaScript → non, TypeScript** retenu (modèle de données typé, autocomplétion, standard).
- Garder les types **légers**, pas de sur-ingénierie.
- Commiter au fur et à mesure, un commit par tâche (diffs lisibles).
- **Ne jamais** supprimer le dossier `.git` (lien GitHub). Ne jamais committer `node_modules`.
- Le travail quotidien est sauvegardé automatiquement dans IndexedDB. Les fichiers `.suiviexos` sont des **copies externes complètes** destinées à la sauvegarde, au transfert et à la restauration de toutes les données.
- Ne pas rendre le fonctionnement principal dépendant de la File System Access API : la réécriture directe du même fichier n'est pas disponible de manière uniforme dans tous les navigateurs.
- Attention au déploiement GitHub Pages : le nom du dépôt étant `exercises-monitoring`, il faudra régler `base: '/exercises-monitoring/'` dans `vite.config.ts` (tâche 14).
