# Mise à jour du site : mode d'emploi

Cette mise à jour **ne touche à aucune donnée** déjà enregistrée (idées, photos, voyages, dépenses…). Tout ce que vous avez déjà publié reste tel quel.

## 1. Mettre à jour le site (5 minutes)

1. Décompresse l'archive de mise à jour.
2. Copie **tous les fichiers** dans ton dossier `leeamm-x-ange`, en **remplaçant les anciens**.
3. **Ne remplace pas ton `config.js`.** Il contient tes réglages (URL Supabase, clé, e-mail) et n'est volontairement pas dans l'archive. Le fichier `config.exemple.js` sert seulement de modèle.
4. Netlify > ton site > onglet **Deploys** > glisse-dépose le dossier mis à jour.
5. Sur chaque téléphone, ferme complètement le site (ou l'appli installée) et rouvre-le.

Ce qui fonctionne **tout de suite**, sans rien configurer de plus :

- **Date (et heure facultative) de chaque dépense** d'un voyage. Les anciennes dépenses restent sans date ; il suffit d'en ouvrir une pour en ajouter une.
- **Dernière connexion** de l'autre, sous le titre (voir plus bas).
- **Textes longs réduits** (« Lire la suite ») dans les idées et les questionnements, et **bouton « Clore ce questionnement »** (les questionnements clos se retrouvent dans une section dédiée, on peut les rouvrir).
- **Musique** : barre de recherche avec pochettes, et un **seul bouton** qui ouvre Apple Music pour Leeamm et Deezer pour Ange.
- **Dossiers** dans l'onglet Fichiers (création, renommage, déplacement de fichiers, suppression sans perte de fichiers).
- **Concerts et ciné** : billetterie, date, durée, setlist, jusqu'à 3 photos de tenues, lien facultatif avec un voyage.

## 2. À savoir sur la dernière connexion

Le site écrit l'heure de connexion **sur le serveur** à chaque ouverture réelle du site (après la saisie du mot de passe commun), puis toutes les minutes tant que l'écran est allumé. Le choix « Je suis… » enregistré dans le navigateur n'y change rien.

- « en ligne » : vu dans les 3 dernières minutes.
- Sinon : « dernière connexion il y a 12 min », « hier, 21 h 12 »…
- C'est réciproque : l'autre voit aussi ta dernière connexion.

## 3. À savoir sur la musique

- La recherche utilise le catalogue gratuit d'Apple (iTunes) pour trouver le morceau exact et sa pochette. La version Deezer est retrouvée automatiquement avec le service gratuit Odesli (song.link), puis, à défaut, avec la recherche Deezer.
- Si le morceau n'est pas retrouvé, utilise « Je ne le trouve pas » : le bouton ouvrira alors une recherche sur la plateforme.
- Tu peux aussi coller directement un lien Deezer ou Apple Music dans la barre de recherche.
- Les anciens morceaux continuent de fonctionner : ils n'affichent plus qu'un seul bouton, adapté à la personne connectée.
- Ce sont des services tiers gratuits : s'ils sont indisponibles un jour, la recherche affiche un message et le repli « à la main » reste possible.
- Pour changer de plateforme par défaut, ajoute dans `config.js` : `PLATFORM: { Ange: "deezer", Leeamm: "apple" },` (valeurs possibles : `"deezer"` ou `"apple"`).

## 4. Activer les notifications (facultatif, environ 20 minutes)

Les notifications arrivent **même quand le site est fermé**. Chacun les reçoit **en tant que lui-même** (celui choisi dans « Je suis… » sur son appareil) pour ce que fait l'autre : idée ou questionnement ajouté, réponse à une idée, un questionnement ou un commentaire, photo / fichier / morceau ajouté, moment ensemble ajouté. Le texte de la notification ne contient jamais le contenu du message (plus discret sur un écran verrouillé).

**Important sur iPhone** : les notifications ne fonctionnent que si le site est installé sur l'écran d'accueil (Safari > Partager > « Sur l'écran d'accueil »), sur iOS 16.4 ou plus récent, et ouvert depuis cette icône.

### A. Générer les clés

Ouvre `generer-cles.html` (double-clic sur le fichier, depuis ton ordinateur) et clique « Générer mes clés ». Garde la page ouverte : tu as besoin des trois valeurs (clé publique, clé privée, secret du webhook). Tout se passe dans ton navigateur, rien n'est envoyé.

### B. Ajouter la clé publique dans `config.js`

Dans ton `config.js`, ajoute cette ligne (avec la clé publique), au même niveau que `SUPABASE_URL` :

```js
VAPID_PUBLIC_KEY: "ta clé publique",
```

### C. Préparer Supabase (SQL)

1. Ouvre `notifications-setup.sql` dans un éditeur de texte.
2. Remplace `REMPLACE_PAR_TA_REF` par la référence de ton projet (Project Settings > General > Reference ID) et `REMPLACE_PAR_TON_SECRET` par le **secret du webhook** (valeur n°3 de la page).
3. Supabase > **SQL Editor** > **New query** : colle tout le fichier > **Run**. Tu dois voir « Success ».

### D. Créer la fonction « notify »

1. Supabase > **Edge Functions** > **Deploy a new function** (ou « Create a new function ») > **Via Editor**.
2. Nomme-la exactement **`notify`**. Remplace tout le code proposé par le contenu de `edge-function-notify.ts`, puis **Deploy**.
3. Dans les réglages de cette fonction, **désactive « Verify JWT »** (elle est protégée par le secret du webhook à la place).
4. Supabase > **Edge Functions** > **Secrets** (ou « Manage secrets ») : ajoute quatre secrets :
   - `VAPID_PUBLIC_KEY` : la clé publique
   - `VAPID_PRIVATE_KEY` : la clé privée
   - `WEBHOOK_SECRET` : le secret du webhook (le même que dans le SQL)
   - `VAPID_SUBJECT` : `mailto:` suivi d'une adresse e-mail (par exemple `mailto:nous@exemple.fr`)

### E. Redéployer le site, puis activer

1. Redéploie le dossier sur Netlify (étape 1) avec ton `config.js` à jour.
2. Sur chaque téléphone : appuie sur ton nom en haut à droite > **Réglages** > **Activer les notifications** > autorise. Vérifie que le nom affiché est le bon.
3. Le bouton **Tester** envoie une notification locale pour vérifier que l'appareil les affiche.
4. Essayez : publie une idée sur un téléphone, l'autre doit recevoir une notification en quelques secondes.

### Si rien n'arrive

- Réglages : le bloc « Notifications » dit-il « Activées sur cet appareil » ? Sinon, relis le message affiché (iPhone non installé sur l'écran d'accueil, permission refusée dans les réglages du téléphone…).
- Supabase > Edge Functions > `notify` > **Logs** : une erreur 403 signifie que le secret du webhook n'est pas le même dans le SQL et dans les secrets de la fonction. Une erreur sur les clés signifie une clé mal copiée.
- Si tu changes les clés plus tard, désactive puis réactive les notifications sur chaque appareil.
