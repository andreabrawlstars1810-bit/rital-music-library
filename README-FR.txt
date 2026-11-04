RITAL — MUSIC LIBRARY
=====================

Ce dossier contient une première version fonctionnelle du site RITAL :
- site responsive (ordinateur et téléphone)
- liste des MP3 et PDF stockés dans Google Drive
- lecteur audio intégré
- consultation des PDF via l'aperçu Drive
- téléchargement des MP3 et PDF
- recherche et filtres
- actualisation automatique toutes les 2 minutes

IMPORTANT : le site n'est pas encore connecté à ton Google Drive et n'est pas publié.
Il faut faire une configuration initiale. Ne partage jamais ton mot de passe Google.

A. ORGANISER GOOGLE DRIVE
-------------------------
1. Dans Google Drive, crée un dossier nommé RITAL.
2. Dedans, crée deux dossiers :
   - Audios
   - Partitions
3. Dans les paramètres de partage de chacun des deux dossiers, règle l'accès général
   sur "Tous les utilisateurs disposant du lien" avec le rôle "Lecteur".
   Cela rend uniquement ces dossiers et leur contenu accessibles aux personnes qui
   possèdent le lien. Ne place rien de personnel dedans.
4. Ajoute tes fichiers MP3 dans Audios et tes PDF dans Partitions.

B. CONFIGURER L'API GOOGLE DRIVE
--------------------------------
Le site est hébergé statiquement : les visiteurs n'ont pas besoin de compte Google.
Pour afficher automatiquement le contenu d'un dossier Drive public, il faut une clé
API Google (pas ton mot de passe, pas une connexion Google des visiteurs).

1. Ouvre Google Cloud Console : https://console.cloud.google.com/
2. Crée un projet (par exemple "RITAL Music Library").
3. Dans "API et services" > "Bibliothèque", active "Google Drive API".
4. Dans "Identifiants", crée une "Clé API".
5. Restreins cette clé à l'API Google Drive. Après publication, ajoute aussi une
   restriction de sites web HTTP referrers pour ton domaine GitHub Pages.
6. Copie la clé dans config.js à la place de COLLE_TA_CLE_API_ICI.

C. TROUVER LES ID DES DOSSIERS
------------------------------
Ouvre chaque dossier Google Drive dans ton navigateur.
L'adresse ressemble à :
https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXX

La longue partie après /folders/ est l'ID du dossier.
Copie l'ID du dossier Audios dans audioFolderId et celui de Partitions dans
pdfFolderId, dans config.js.

Exemple :
window.RITAL_CONFIG = {
  googleApiKey: "TA_CLE_API",
  audioFolderId: "ID_DU_DOSSIER_AUDIOS",
  pdfFolderId: "ID_DU_DOSSIER_PARTITIONS",
  refreshIntervalMs: 120000
};

D. PUBLIER SUR GITHUB PAGES
---------------------------
1. Connecte-toi à GitHub et crée un dépôt nommé rital-music-library.
2. Dépose les fichiers index.html, style.css, app.js et config.js à la racine du dépôt.
3. Dans Settings > Pages, choisis "Deploy from a branch", branche "main", dossier "/ (root)".
4. Enregistre. GitHub donnera une adresse du type :
   https://TON-PSEUDO.github.io/rital-music-library/

E. À SAVOIR
-----------
- Les musiciens n'ont pas de connexion Google à effectuer.
- Les dossiers partagés publiquement en lecture peuvent être consultés par toute personne
  qui a le lien, et les fichiers peuvent être téléchargés.
- Les visiteurs ne peuvent pas ajouter, modifier ou supprimer les fichiers.
- Pour ajouter un morceau, dépose le fichier dans le bon dossier Drive. Le site le
  récupère lors de la prochaine actualisation (ou quand un visiteur recharge la page).
- La clé API est visible dans le code d'un site statique. Elle ne doit jamais être une
  clé OAuth ni un secret. Restreins-la à Google Drive API et à ton domaine.
- Google Drive peut afficher une page de confirmation ou limiter certains téléchargements
  selon la taille, le type de fichier ou les quotas. Pour une très grosse bibliothèque
  ou beaucoup d'écoutes simultanées, un stockage/CDN conçu pour servir des médias serait
  plus fiable.
- La première version liste les fichiers placés directement dans les deux dossiers,
  pas dans des sous-dossiers imbriqués.
- Le site utilise les noms des fichiers comme titres. Nomme-les clairement, par exemple :
  "Titre du morceau - Trompette 1.pdf" ou "Titre du morceau - Audio complet.mp3".

Ne m'envoie jamais ton mot de passe Google, tes codes de validation ou une clé privée.
Pour continuer, tu peux simplement me communiquer les deux ID de dossiers et me dire
quand tu as créé la clé API. Tu peux aussi faire la configuration avec moi étape par étape.
