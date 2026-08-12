# Suivi d’exercices

Application locale permettant à un enseignant de suivre la progression
de ses élèves dans différents exercices.

L’application fonctionne hors ligne et ne nécessite aucun compte ni
serveur. Les données sont enregistrées automatiquement dans le navigateur.

## Ouvrir l’application

L’application est disponible à cette adresse :

https://arnaud-maillard1.github.io/exercises-monitoring/

Lors de la première utilisation, ouvrez l’application avec une connexion
Internet afin que tous les fichiers nécessaires soient installés.

## Installer l’application

### Avec Chrome ou Edge

1. Ouvrez l’application dans Chrome ou Edge.
2. Cliquez sur l’icône d’installation située dans la barre d’adresse.
3. Confirmez avec **Installer**.

L’application s’ouvrira ensuite dans sa propre fenêtre et pourra être
lancée depuis les applications de l’ordinateur.

### Avec Safari sur macOS

Cette fonction nécessite macOS Sonoma 14 ou une version plus récente.

1. Ouvrez l’application dans Safari.
2. Sélectionnez **Fichier → Ajouter au Dock**.
3. Choisissez un nom.
4. Cliquez sur **Ajouter**.

## Utilisation

### 1. Nommer la branche

Dans **Thèmes & exercices**, indiquez le nom de la branche, par exemple
« Informatique » ou « Mécanique ».

Ce nom sera utilisé dans les fichiers de sauvegarde et les exports Excel.

### 2. Préparer la classe

Dans **Ma classe** :

- ajoutez les élèves ;
- utilisez **Modifier** pour corriger un nom ;
- utilisez les flèches pour changer l’ordre ;
- utilisez **Trier de A à Z** pour appliquer un tri alphabétique ;
- utilisez **Supprimer** pour retirer un élève.

La suppression d’un élève efface également ses progressions.

### 3. Préparer les exercices

Dans **Thèmes & exercices** :

1. créez un thème ;
2. créez des exercices en sélectionnant leur thème ;
3. utilisez les flèches ou le tri alphabétique pour les organiser.

La suppression d’un thème supprime également ses exercices et les
progressions correspondantes.

### 4. Suivre la progression

Dans **Suivi**, cliquez sur une case pour faire défiler les états :

```text
Rien → En cours → Terminé → Rien
```

Les couleurs permettent de repérer rapidement chaque état.

Le bouton **Exporter le suivi en Excel** télécharge une version lisible,
imprimable et partageable du tableau.

Le fichier Excel ne permet pas de restaurer les données dans l’application.

### 5. Préparer une session pour les élèves

Dans **Session actuelle** :

1. cliquez sur **Modifier la session actuelle** ;
2. sélectionnez les exercices à afficher ;
3. enregistrez la sélection.

Les élèves peuvent ensuite choisir leur progression avec les menus
déroulants.

Les pages **Suivi** et **Session actuelle** utilisent les mêmes
progressions. Une modification faite dans une page apparaît dans l’autre.

## Sauvegardes

Les modifications sont enregistrées automatiquement dans le navigateur.

Il reste cependant recommandé de conserver régulièrement une copie
externe, car les données du navigateur peuvent être effacées.

Dans **Sauvegarde** :

- **Télécharger une copie** crée un fichier `.suiviexos` contenant toute
  la branche ;
- **Ouvrir une copie** remplace la branche actuelle par celle du fichier,
  après confirmation ;
- **Tout effacer** permet de recommencer avec une branche vide.

Avant d’ouvrir une autre copie ou de tout effacer, téléchargez une copie
de la branche actuelle si vous souhaitez la conserver.

## Fonctionnement hors ligne

Après une première ouverture avec Internet, l’application peut fonctionner
hors ligne.

Les données restent sur l’appareil utilisé. Elles ne sont pas synchronisées
automatiquement avec un autre ordinateur ou un autre navigateur.

Pour transférer une branche, téléchargez son fichier `.suiviexos`, puis
ouvrez cette copie sur l’autre appareil.

## Développement

```bash
npm install
npm run dev
```

Construire et tester la version de production :

```bash
npm run build
npm run preview
```