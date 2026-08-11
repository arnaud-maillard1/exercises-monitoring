# Suivi d'exercices — spécification & état d'avancement

> Document de reprise (handoff). Toute IA ou personne peut lire ce fichier pour continuer le projet sans contexte préalable.

## 1. Concept

Application web **local-first (PWA)** pour un enseignant : suivre la progression des élèves dans des exercices.

- Développée sous **Linux**, doit tourner sur **macOS** (via navigateur).
- **Un seul appareil** : élèves ET prof utilisent la même machine (pas de comptes, pas de multi-utilisateur).
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
Élève       : nom
Thème       : nom
Exercice    : nom, appartient à 1 thème
Progression : (élève × exercice) → 'rien' | 'en cours' | 'terminé'
Session     : liste d'exercices sélectionnés — UNE SEULE session courante
              (historique = évolution future ; concevoir le modèle extensible)
```
- Suppression **en cascade avec confirmation** (supprimer un thème → ses exercices + progressions ; supprimer un élève/exercice → ses progressions).
- Ordre d'affichage : par création + **tri alphabétique** + **flèches ↑/↓** pour déplacer une sélection.

## 4. Les 4 pages

1. **Ma classe** — liste des élèves ; ajouter / supprimer.
2. **Thèmes & exercices** — CRUD thèmes + exercices (exercice rattaché à un thème).
3. **Suivi (prof)** — tableau : 1 ligne/élève × 1 colonne/exercice, colonnes **groupées par thème**. Édition d'une case = **clic-qui-défile** (rien → en cours → terminé → rien).
4. **Session actuelle** — bouton « Modifier la session actuelle » (popup de sélection des exercices) + tableau **réduit aux exercices sélectionnés**, édition par **menu déroulant**. Les élèves y marquent leur progression.

> Les pages Suivi et Session partagent la **même** donnée de progression : un changement côté élève apparaît immédiatement chez le prof. Seul le filtre d'exercices diffère (tous vs sélectionnés).

## 5. Sauvegarde & fichiers

- **IndexedDB** = mémoire principale (persistante, survit à la fermeture du navigateur).
- **Export `.xlsx`** (lecture, via ExcelJS) : le **thème en cellule fusionnée horizontale** au-dessus de ses exercices ; chaque exercice dans sa cellule ; 1 ligne/élève ; états en clair + **couleurs par état**.
- **Export ET import `.json`** = sauvegarde/restauration complète (le vrai filet de sécurité ; réimport depuis Excel écarté car trop fragile).
- Prévoir un **rappel de sauvegarde** dans l'UI (le cache navigateur peut être vidé).

## 6. Plan de tâches & avancement

- [x] **1. Init projet Vue 3 + Vite + TypeScript** — FAIT (dev server OK).
- [x] **2. Configurer la PWA** — vite-plugin-pwa : manifest (nom, icônes, thème), service worker offline, cache. Génère les icônes. Touche surtout `vite.config.ts`.
- [x] **3. Stockage Dexie** — schéma des tables (eleves, themes, exercices, progressions, session/config) + couche d'accès (composables). Activer `navigator.storage.persist()`. Définir les types TS (dont `type Etat = 'rien' | 'en cours' | 'terminé'`).
- [x] **4. Navigation + layout global** — router (ou onglets) entre les 4 pages ; barre de nav ; styles de base. Réécrit `App.vue`.
- [ ] **5. Page « Ma classe »** — CRUD élèves, tri alpha, flèches ↑/↓, confirmations.
- [ ] **6. Page « Thèmes & exercices »** — CRUD thèmes + exercices, cascade, tri, flèches.
- [ ] **7. Composant tableau de progression réutilisable** — paramétrable : filtre exercices (tous vs session) + mode d'édition (clic-qui-défile vs menu déroulant) ; couleurs + légende. Utilisé par les pages 8 et 9.
- [ ] **8. Page « Suivi (prof) »** — tableau (tous les exercices), clic-qui-défile.
- [ ] **9. Page « Session actuelle »** — popup de sélection + tableau réduit + menus déroulants ; session courante stockée en config.
- [ ] **10. Export Excel (.xlsx)** — ExcelJS, cellules fusionnées par thème, couleurs.
- [ ] **11. Export/import JSON** — sauvegarde/restauration + rappel de sauvegarde.
- [ ] **12. Style / UX / responsive** — tablette/tactile, tableaux larges (scroll horizontal, colonnes figées), états vides.
- [ ] **13. Test PWA hors-ligne + installation** — offline, persistance, install PWA.
- [ ] **14. Déploiement GitHub Pages + notice** — `base` Vite = `/exercises-monitoring/`, workflow GitHub Actions ou build manuel ; notice courte pour l'enseignant.

## 7. Conventions & décisions

- **JavaScript → non, TypeScript** retenu (modèle de données typé, autocomplétion, standard).
- Garder les types **légers**, pas de sur-ingénierie.
- Commiter au fur et à mesure, un commit par tâche (diffs lisibles).
- **Ne jamais** supprimer le dossier `.git` (lien GitHub). Ne jamais committer `node_modules`.
- Attention au déploiement GitHub Pages : le nom du dépôt étant `exercises-monitoring`, il faudra régler `base: '/exercises-monitoring/'` dans `vite.config.ts` (tâche 14).
