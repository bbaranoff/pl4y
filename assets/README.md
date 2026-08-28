# assets/

Sources des médias du site. `build.mjs` les **copie** vers `public/m/`, d'où
elles sont servies en Cloudflare Static Assets. Elles ne sont plus encodées en
base64 dans le Worker : c'était ~880 Kio de bundle, sur un plafond de 1 Mio.

| Fichier | Publié sur | Rôle |
|---|---|---|
| `motorola_c123.jpg` | `/m/motorola_c123.jpg` | Photo du Motorola C123 (chipset Calypso), section « Matériel de référence ». |
| `screencast_demo.jpg` | `/m/screencast_demo.jpg` | Capture du système en fonction (Operations Console + FFT Calypso + VTY OsmocomBB). |
| `demo_iso.gif` | `/m/iso.gif` | Vérification sha256 de l'ISO et création de la VM VirtualBox. |
| `demo_launch.gif` | `/m/launch.gif` | Bannière `start-direct.sh`, lancement du launcher natif. |
| `demo_console.gif` | `/m/console.gif` | Operations Console en direct : FFT Calypso, GRGSM record, deux VTY OsmocomBB envoyant un SMS. |

## Ajouter ou remplacer un média

1. Déposer le fichier ici.
2. L'ajouter à la table `MEDIA` de `build.mjs` (source → nom publié).
3. Le référencer dans `worker.template.js` par son URL : `src="/m/<nom>"`.
4. `node build.mjs` — la copie vers `public/m/` est refaite à chaque build, donc
   une image mise à jour ici ne peut pas rester périmée dans l'arbre publié.
5. Committer `public/m/` (versionné, comme le reste de `public/`).

**Ne jamais** ré-encoder un média en base64 dans le template : `build.mjs`
échoue s'il en détecte un, et le déploiement s'arrête.

Contrainte Static Assets : **25 Mio par fichier** (`docs/unify.mjs` coupe à 20
pour garder de la marge).
