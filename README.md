# pl4y.store

Cloudflare Worker qui sert l'installeur **osmo_egprs** de trois façons à la même URL :

- **`curl` / `wget`** (pipe) → renvoie le script bash brut, donc :
  ```bash
  bash <(wget -qO- pl4y.store)   # Linux / WSL
  curl -fsSL pl4y.store | bash
  wget -qO- pl4y.store | bash
  ```
- **PowerShell** (Windows 11) → renvoie le script PowerShell brut, donc :
  ```powershell
  irm pl4y.store | iex
  iwr -useb pl4y.store | iex
  ```
  Ce script installe **WSL 2 + Ubuntu 24.04**, crée l'utilisateur Ubuntu au
  premier démarrage, puis lance l'installeur bash dans Ubuntu avec le mode choisi
  (**build** / **build-iso** / **download** / **start**). Pour sauter le menu :
  `$env:OSMO_MODE="download"; irm pl4y.store | iex`.
  Voir **[Installeur Windows](#installeur-windows-wsl-2--ubuntu-2404)**.
- **navigateur** → renvoie une page HTML lisible qui **affiche la source** des
  scripts (pour les lire avant de les exécuter) avec des boutons copier.

La détection se fait sur le `User-Agent` **puis** sur l'en-tête `Accept`, dans
cet ordre : PowerShell (`WindowsPowerShell`/`PowerShell` dans l'UA) → `.ps1` ;
autre outil CLI (`curl`, `wget`, `httpie`, …) → `.sh` ; sinon `Accept: text/html`
→ la page. **L'UA l'emporte sur `Accept`** : un `curl -H 'Accept: text/html'`
reçoit le script bash, pas la page — c'est voulu, car c'est `curl … | bash` qui
doit marcher à tous les coups. Pour obtenir la page en ligne de commande, passer
un UA de navigateur (`-A 'Mozilla/5.0'`) ou demander `/wiki` (page
installeur + wiki ; l'accueil `/` est la page de présentation de l'ISO). Par défaut on sert
le script bash : un client exotique qui pipe ne casse jamais.

## Page d'accueil : le design osmo-operator-desktop

Au navigateur, **`/` renvoie la page d'accueil** `home.template.html` : le
design *osmo-operator-desktop.iso* (claude.ai/design, système « Nocturne »,
fond sombre) — hero, chiffres, contenu de l'ISO, les trois icônes du bureau
(`/m/osmo-*.svg`), démarrage rapide, installation. Le **bandeau pl4y** commun
au reste du site est conservé en haut, avec sa bascule clair/sombre. Le bouton
*Télécharger l'ISO* pointe sur le miroir MEGA d'`osmo-operator-desktop.iso`.
`build.mjs` injecte la palette partagée (`__THEME_TOKENS__`) dans cette page
puis la page entière dans le Worker (`__HOME_HTML__`). En CLI
(`curl`/`wget`/PowerShell), `/` renvoie toujours le script brut.

## Page installeur + wiki (`/wiki`)

Une **seule page** regroupe l'installeur (source des scripts, boutons copier)
**et** tout le wiki technique **QEMU Calypso / osmo_egprs / EGPRS**
(téléchargements ISO/MEGA, GIFs d'install, installation VirtualBox,
architecture multi-PLMN, pile Osmocom, émulation baseband Calypso, plan SS7,
GPRS/EGPRS, VTY, débogage, bugs observés, références). Elle est servie sur
**`/wiki`** (et sur tout chemin inconnu demandé par un navigateur) ; l'onglet
**Installeur &amp; wiki** du bandeau y mène depuis toutes les pages du site. Le
sommaire pointe vers des ancres (`#wiki`, `#virtualbox`, `#bugs`, …).

Les images et GIFs du screencast d'install sont servis en **Static Assets** sur
`/m/` (`motorola_c123.jpg`, `screencast_demo.jpg`, `iso.gif`, `launch.gif`,
`console.gif`) et affichés dans le wiki. Ils ne transitent **pas** par le bundle
du Worker — voir **[Poids du Worker](#poids-du-worker)**.

## Documentation unifiée — un seul site

Le contenu de **cinq dépôts voisins** est rendu, unifié sous le même habillage
que la page d'accueil, puis servi en **Cloudflare Static Assets** depuis
`public/` :

| URL | Source (voisin de ce dépôt) | Chaîne de rendu |
|---|---|---|
| `/calypso/` | `../qemu-calypso` | `full-qmd.sh` → Quarto |
| `/osmo_egprs/` | `../osmo_egprs` | `full_qmd.sh` → Quarto |
| `/tests/` | `../qemu/tests` | instantané pytest → Quarto |
| `/sdr/` | `../software-defined-radio` | Sphinx + MyST |
| `/bbaranoff/` | `../bbaranoff.github.io` | pandoc (pas de ruby ici) |
| `/docs/` | — | hub généré |

Les sources sont cherchées **à côté de ce dépôt** (`../<nom>`), puis dans
`$HOME/<nom>` en repli ; une variable par section a le dernier mot
(`PL4Y_SRC_SDR=/chemin/...`). Un clone des dépôts côte à côte suffit donc à
reconstruire le site, quel que soit l'utilisateur ou le point de montage.

**Une seule navigation pour tout le site** : la page d'accueil et les cinq
sections partagent la même barre pl4y (`docs/theme/pl4y-bar.html`, dupliquée
dans `worker.template.js`), le même thème clair/sombre et la même clé
`localStorage`. `/sdr/` et `/bbaranoff/` ne sont pas des annexes : ce sont des
onglets de premier niveau, au même titre que le wiki.

Le workflow est `node docs/unify.mjs` (voir **[docs/README.md](docs/README.md)**
pour les étapes, les prérequis et les limites). `public/` est versionné, car le
builder Cloudflare n'a ni quarto ni sphinx ni pandoc : après avoir modifié un
dépôt source, relancer le workflow puis committer `public/`.

Le Worker garde la main sur `/` (script brut en CLI, page HTML au navigateur) ;
les préfixes documentaires partent toujours vers les assets, même pour
`curl`/`wget`.

Toutes les pages proposent un **bascule de thème clair / sombre** (bouton dans la
barre de navigation) : le **thème clair est le défaut** et le choix est mémorisé
dans `localStorage` (clé `pl4y-theme`), appliqué avant le premier rendu pour
éviter tout flash. La clé est commune à l'accueil et aux sections, donc le choix
suit le visiteur de `/` à `/sdr/`.

## Source de vérité

Les fichiers à éditer sont **`setup_osmo_egprs.sh`** (Linux) et
**`setup_osmo_egprs.ps1`** (Windows 11). Le `.ps1` n'est qu'un *bootstrap* :
il met en place WSL + Ubuntu puis re-télécharge et exécute le `.sh`, qui reste
la source de vérité de l'installation réelle.

Le Worker (`worker.template.js`) contient deux placeholders : `__SCRIPT_B64__`
(bash) et `__PS_SCRIPT_B64__` (PowerShell), plus `__DOC_CARDS__` (les cartes du
hub). À chaque build, `build.mjs` encode les deux scripts en base64, copie les
médias de `assets/` vers `public/m/` et génère `src/worker.js`. Ce build est
lancé automatiquement par `wrangler deploy` grâce à la section `[build]` de
`wrangler.toml` — donc en local, en CI et sur Cloudflare, le contenu servi est
toujours à jour. Inutile de toucher au base64 à la main : `src/worker.js` est un
artefact généré (committé pour que le dépôt soit déployable tel quel, mais
jamais édité directement).

## Poids du Worker

Le bundle Worker doit rester **léger** : Cloudflare plafonne à 1 Mio compressé
en plan gratuit, et tout ce qu'il contient est chargé à chaque démarrage
d'isolate. Trois règles :

1. **Aucun binaire dans le Worker.** Images, GIFs, PDF, polices → `public/`,
   servis en Static Assets. `build.mjs` **échoue** s'il détecte un placeholder
   `__*_JPG_B64__` / `__*_GIF_B64__` ou un `data:image/...;base64,` volumineux
   dans le template : c'est un garde-fou, pas une suggestion.
2. **Décoder une seule fois.** Les scripts sont décodés et la page HTML rendue
   au chargement du module (portée globale), pas dans `fetch()`. Chaque requête
   ne fait plus que choisir quelle chaîne déjà construite renvoyer.
3. **Le contenu documentaire ne passe jamais par le Worker.** Les préfixes de
   `ASSET_PREFIXES` partent directement vers `env.ASSETS`.

Résultat : **~120 Kio** de bundle (essentiellement les deux scripts en base64 et
le HTML de la page), contre ~960 Kio quand les cinq médias y étaient encodés.

## Ref git par défaut : `RELEASE-0.1`

Les deux installeurs calent `osmo_egprs` sur **`RELEASE-0.1`** — la ref *stable*,
celle que décrit le wiki et sur laquelle l'ISO publiée est construite. `main` est
la branche de développement : elle bouge, et rien ne garantit qu'elle reste
compatible avec l'image Docker publiée.

```bash
bash <(wget -qO- pl4y.store) start                 # RELEASE-0.1 (défaut)
OSMO_REF=main bash <(wget -qO- pl4y.store) start   # suivre le développement
```
```powershell
$env:OSMO_REF="main"; irm pl4y.store | iex
```

`OSMO_REF` accepte une **branche ou un tag**. L'installeur interroge le remote
(`git ls-remote --heads` / `--tags`) pour savoir lequel des deux c'est, puis
utilise la refspec correspondante : `+refs/heads/<ref>:refs/remotes/origin/<ref>`
pour une branche, `+refs/tags/<ref>:refs/tags/<ref>` pour un tag. Ce n'est pas de
la coquetterie — le dépôt `osmo_egprs` porte **deux refs nommées `main`** (une
branche *et* un tag, ce dernier supportant la Release qui héberge l'ISO), et une
refspec ambiguë résout silencieusement vers le tag, 383 commits en arrière.

Le fork `qemu` suit `test` par défaut (`QEMU_REF`).

## Installeur Windows (WSL 2 + Ubuntu 24.04)

`setup_osmo_egprs.ps1` n'installe rien lui-même : il prépare Windows, puis passe
la main au `.sh` **dans Ubuntu**. Dans l'ordre :

1. contrôle de version Windows (build 19041+, WSL 2 requis) ;
2. validation de la configuration (`OSMO_*`) — voir plus bas ;
3. élévation administrateur **si nécessaire seulement** ;
4. fonctionnalités Windows (`Microsoft-Windows-Subsystem-Linux`,
   `VirtualMachinePlatform`) via DISM, avec détection du code 3010 (redémarrage) ;
5. `wsl --update` (noyau WSL 2) puis `wsl --set-default-version 2` ;
6. `wsl --install -d Ubuntu-24.04 --no-launch`, avec repli sur `Ubuntu-22.04`
   puis `Ubuntu` si le catalogue de la machine ne propose pas la 24.04 ;
7. vérification que la distro tourne **en version 2** (`wsl -l -v`), conversion
   `wsl --set-version <distro> 2` sinon ;
8. création du compte Ubuntu au premier démarrage ;
9. installation de `wget` / `ca-certificates` / `git` dans la distro ;
10. relais `socat` `localhost:8080` → `172.20.0.11:8080` (dashboard) ;
11. `OSMO_REF=... bash <(wget -qO- pl4y.store) <mode>` dans Ubuntu.

**Pourquoi forcer WSL 2 explicitement** : en WSL 1 il n'y a ni cgroups ni
iptables complet, donc Docker ne démarre pas et rien de ce que fait `osmo_egprs`
ne fonctionne. Or `wsl --set-default-version` vaut encore `1` sur d'anciennes
installations, et une distro déjà présente peut y être restée. Le script traite
les deux cas plutôt que d'échouer plus tard, au fond de `start.sh`.

### Élévation de privilèges

Le chemin d'élévation rouvre une console administrateur qui rejoue
`irm https://pl4y.store | iex`. C'est littéralement « télécharger du code et
l'exécuter en Administrateur », donc il est encadré par trois règles :

- **HTTPS obligatoire** (`Assert-SafeConfig`). En HTTP, n'importe quel
  intermédiaire réseau choisirait le code exécuté en administrateur. Seul un
  loopback explicite (`wrangler dev`) est toléré, et jamais pour la session
  élevée.
- **Aucune interpolation brute.** `Start-Process -ArgumentList` re-quote ses
  arguments : une valeur contenant un guillemet s'échapperait de sa chaîne et
  injecterait des commandes dans une console Administrateur. Les variables
  reportées sont donc validées contre une regex stricte et **abandonnées** si
  elles ne correspondent pas — jamais « réparées » par échappement. `OSMO_URL`
  n'est **pas** reportée du tout : elle désigne le code à exécuter.
  `-NoProfile` empêche par ailleurs le `$PROFILE` de l'utilisateur de s'exécuter
  en administrateur.
- **Moindre privilège.** `Test-ElevationNeeded` n'élève que si WSL manque, si la
  distro manque, si la VM ne démarre pas, ou si la distro est en WSL 1. Sur une
  machine déjà prête : aucune invite UAC, tout tourne en droits utilisateur.

Les mêmes contrôles s'appliquent aux valeurs utilisées **localement**
(`$WSL_DISTRO` part dans une ligne de commande `wsl.exe`, `$OSMO_REF` et
`$DASH_*` dans un `bash -c`) : même vecteur, sans passer par l'élévation.

## Déploiement

Le domaine `pl4y.store` doit être actif sur Cloudflare (DNS proxifié, nuage
orange). Deux options, au choix.

### Option A — Intégration Git native de Cloudflare (recommandée)

1. Dashboard Cloudflare → **Workers & Pages** → **Create** → **Connect to Git**.
2. Sélectionne ce dépôt GitHub.
3. Build command : `node build.mjs` — Deploy command : `npx wrangler deploy`.
   (Cloudflare lit `wrangler.toml`, donc le `[build]` suffit ; laisse les
   valeurs par défaut si proposées.)
4. Chaque push sur `main` redéploie.

### Option B — GitHub Actions

> **Note** — le fichier `.github/workflows/deploy.yml` n'est pas présent dans ce
> dépôt : cette option demande de l'ajouter (il doit lancer `node build.mjs`
> puis `npx wrangler deploy`). L'option A ne le nécessite pas.

Un tel workflow déploierait à chaque push sur `main`. Il faut alors deux secrets
dans **Settings → Secrets and variables → Actions** :

- `CLOUDFLARE_API_TOKEN` — token avec la permission *Edit Cloudflare Workers*.
- `CLOUDFLARE_ACCOUNT_ID` — ton account ID (visible dans le dashboard).

### Déploiement manuel (local)

```bash
npm install
npx wrangler login
npm run deploy        # lance le build puis wrangler deploy
```

## Vérifier

```bash
curl -fsSL pl4y.store | head                              # -> #!/usr/bin/env bash ...
curl -fsSL -A 'WindowsPowerShell/5.1' pl4y.store | head   # -> # setup_osmo_egprs.ps1 ...
curl -fsSL -A 'Mozilla/5.0' pl4y.store | head             # -> <!DOCTYPE html> ...
curl -fsSL pl4y.store/install.sh  | head -1               # meme script, URL directe
curl -fsSL pl4y.store/install.ps1 | head -1               # idem, PowerShell
curl -fsSI pl4y.store/m/iso.gif   | head -1               # -> 200, servi en asset
curl -fsSL pl4y.store/sdr/ | head -1                      # -> HTML, pas le script
```

Et le garde-fou de poids, à lancer après toute modification du template :

```bash
node build.mjs                    # affiche la taille du bundle généré
du -h src/worker.js               # doit rester très en dessous de 1 Mio
```

## Mettre à jour l'installeur

Édite `setup_osmo_egprs.sh`, commit, push. Le build régénère le base64 et
redéploie. Pense à purger le cache Cloudflare si tu testes une correction à
chaud (le Worker renvoie `Cache-Control: max-age=300`).
