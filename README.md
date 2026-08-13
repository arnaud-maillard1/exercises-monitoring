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

### 1. Préparer les classes et les branches

En haut de l’application, cliquez sur **Gérer les classes et branches**.

- Une **classe** contient sa propre liste d’élèves, par exemple « 9VG1 ».
- Une **branche** contient ses thèmes et exercices, par exemple « Mathématiques ».
- Une classe peut utiliser plusieurs branches et une branche peut être utilisée
  par plusieurs classes.

Lors de la création d’une classe ou d’une branche, cochez les associations
souhaitées. Vous pouvez les modifier plus tard dans la même fenêtre.

Les deux menus situés en haut de l’application permettent ensuite de choisir
la classe, puis l’une des branches qu’elle utilise.

### 2. Préparer les élèves d’une classe

Choisissez d’abord la classe en haut de l’application, puis ouvrez **Classe** :

- ajoutez les élèves ;
- utilisez **Modifier** pour corriger un nom ;
- utilisez les flèches pour changer l’ordre ;
- utilisez **Trier de A à Z** pour appliquer un tri alphabétique ;
- utilisez **Supprimer** pour retirer un élève.

La suppression d’un élève efface également ses progressions.

### 3. Préparer les exercices d’une branche

Choisissez la branche, puis ouvrez **Thèmes & exercices** :

1. créez un thème ;
2. créez des exercices en sélectionnant leur thème ;
3. utilisez les flèches ou le tri alphabétique pour les organiser.

La suppression d’un thème supprime également ses exercices et les
progressions correspondantes.

Les exercices sont partagés par toutes les classes associées à la branche.
Chaque classe conserve cependant ses propres progressions.

### 4. Suivre la progression

Dans **Suivi**, cliquez sur une case pour faire défiler les états :

```text
Rien → En cours → Terminé → Rien
```

Les couleurs permettent de repérer rapidement chaque état.

Le bouton **Exporter le suivi en Excel** télécharge une version lisible,
imprimable et partageable du tableau.

Le fichier contient uniquement la classe et la branche actuellement choisies.

Le fichier Excel ne permet pas de restaurer les données dans l’application.

### 5. Préparer l’espace élèves

Dans **Espace élèves** :

1. cliquez sur **Choisir les exercices** ;
2. sélectionnez les exercices à afficher ;
3. enregistrez la sélection.

Les élèves peuvent ensuite choisir leur progression avec les menus
déroulants.

Les pages **Suivi** et **Espace élèves** utilisent les mêmes
progressions. Une modification faite dans une page apparaît dans l’autre.

## Sauvegardes

Les modifications sont enregistrées automatiquement dans le navigateur.

Il reste cependant recommandé de conserver régulièrement une copie
externe, car les données du navigateur peuvent être effacées.

Dans **Sauvegarde** :

- **Télécharger une copie** crée un fichier `.suiviexos` contenant toute
  l’application : classes, branches, élèves, exercices et progressions ;
- **Ouvrir une copie** remplace toutes les données actuelles par celles du fichier,
  après confirmation ;
- **Tout effacer** permet de recommencer avec une classe et une branche vides.

Avant d’ouvrir une autre copie ou de tout effacer, téléchargez une copie
des données actuelles si vous souhaitez les conserver.

## Fonctionnement hors ligne

Après une première ouverture avec Internet, l’application peut fonctionner
hors ligne.

Les données restent sur l’appareil utilisé. Elles ne sont pas synchronisées
automatiquement avec un autre ordinateur ou un autre navigateur.

Pour transférer les données, téléchargez le fichier `.suiviexos`, puis
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
