# Leeamm X Ange : mettre le site en ligne

> Site déjà en ligne et tu as reçu une mise à jour ? Va directement à **MISE-A-JOUR.md** (notifications, concerts et ciné, dossiers, musique…).

Le site est déjà complet. Sans rien faire, il s'ouvre en **mode démo** (contenu d'exemple, enregistré uniquement sur l'appareil) : double-clique sur `index.html` ou ouvre-le via l'hébergement pour l'essayer.

Pour que vous partagiez le contenu **en direct à deux**, il faut deux services gratuits : **Supabase** (les données, les photos, les fichiers) et **Netlify** (l'adresse du site). Compte environ 20 minutes, une seule fois.

## 1. Créer la base (Supabase)

1. Crée un compte sur supabase.com, puis « New project » (choisis une région en Europe, note le mot de passe de base de données quelque part, tu n'en auras pas besoin au quotidien).
2. Dans le menu de gauche : **SQL Editor** > **New query**. Ouvre le fichier `supabase-setup.sql`, copie tout son contenu, colle-le, clique **Run**. Tu dois voir « Success ».
3. Menu **Authentication** > **Users** > **Add user** > **Create new user** :
   - e-mail : une adresse de ton choix (elle peut être fictive, par exemple `nous@exemple.fr`)
   - mot de passe : **le mot de passe commun** que vous taperez tous les deux pour entrer sur le site
   - coche « Auto Confirm User »
4. Menu **Authentication** > **Sign In / Providers** (ou « Providers ») : vérifie que « Email » est activé et **désactive « Allow new users to sign up »** (ou « Enable sign ups »), pour que personne d'autre ne puisse créer de compte.
5. Menu **Project Settings** > **API** : note l'**URL du projet** et la clé publique (**anon** / **publishable**).

## 2. Remplir `config.js`

Ouvre `config.js` dans un éditeur de texte et complète :

```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "la clé publique",
SHARED_EMAIL: "nous@exemple.fr",   // l'e-mail créé à l'étape 1.3
```

Ne mets jamais la clé « service_role » (la clé secrète) : seule la clé publique va ici.

## 3. Mettre le site en ligne (Netlify)

1. Crée un compte sur netlify.com.
2. « Add new site » > **Deploy manually** : glisse-dépose le dossier `leeamm-x-ange` (celui qui contient `index.html`).
3. Netlify donne une adresse du type `quelquechose.netlify.app`. Dans **Site configuration** > **Change site name**, remplace-la par un nom long et impossible à deviner (par exemple `leeamm-ange-k7x2q9-lumiere`). **C'est ce lien privé qui protège le site.** Ne le publie nulle part.

Pour modifier le site plus tard : refais « glisser-déposer » du dossier mis à jour, dans l'onglet Deploys.

## 4. Premier lancement

- Ouvre le lien sur ton téléphone, entre le mot de passe commun, choisis « Je suis Ange ». Leeamm fait pareil sur le sien, avec « Je suis Leeamm ».
- **Installer comme une appli** : sur iPhone, Safari > Partager > « Sur l'écran d'accueil ». Sur Android, Chrome > menu > « Installer l'application ».
- Le site se met à jour tout seul toutes les 15 secondes quand il est ouvert (et dès qu'on revient dessus). Il n'y a pas de notification quand l'autre publie.

## À savoir

- **Deux protections** : le lien privé (long, secret) et le mot de passe commun. Quiconque a les deux peut entrer.
- **Photos** : réduites automatiquement à l'envoi. **Fichiers** : 40 Mo max pour un enregistrement, 20 Mo pour un document.
- **Gratuit** : l'offre gratuite de Supabase offre 1 Go de stockage, largement assez pour ~100 photos, 20 enregistrements et 10 PDF. Elle met un projet **en pause après 7 jours sans aucune activité** : il suffit d'ouvrir le site pour le réveiller, ou de cliquer « Restore » dans Supabase.
- **Sauvegarde** : de temps en temps, Supabase > Table Editor > `items` > Export en CSV, et télécharge vos photos importantes.
- **Musique** : le site utilise le service gratuit Odesli (song.link) pour retrouver le même morceau sur Deezer et Apple Music. S'il ne répond pas, il garde un lien de recherche sur chaque plateforme.
- **Synthèse PDF** d'un voyage : bouton dans la page du voyage, puis « Enregistrer en PDF » (sur iPhone : Partager > Enregistrer dans Fichiers).
- **Dates à retenir** : modifiables dans `config.js` (`KEY_DATES`), ainsi que les lieux proposés (`PLACE_PRESETS`).
- **Modifier / supprimer** : chacun ne modifie que ce qu'il a publié lui-même (idées, commentaires, questionnements, morceaux, photos, fichiers). Moments, voyages et dépenses sont modifiables par vous deux.
