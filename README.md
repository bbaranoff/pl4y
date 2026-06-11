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
  Ce script installe **WSL 2 + Ubuntu**, crée l'utilisateur Ubuntu au premier
  démarrage, puis lance l'installeur bash dans Ubuntu avec le mode choisi
  (**build** / **build-iso** / **download** / **start**). Pour sauter le menu :
  `$env:OSMO_MODE="download"; irm pl4y.store | iex`.
- **navigateur** → renvoie une page HTML lisible qui **affiche la source** des
  scripts (pour les lire avant de les exécuter) avec des boutons copier.

La détection se fait sur l'en-tête `Accept` et le `User-Agent` (PowerShell est
reconnu via `WindowsPowerShell`/`PowerShell` dans l'UA). Par défaut on sert le
script bash : un client exotique qui pipe ne casse jamais.

## Source de vérité

Les fichiers à éditer sont **`setup_osmo_egprs.sh`** (Linux) et
**`setup_osmo_egprs.ps1`** (Windows 11). Le `.ps1` n'est qu'un *bootstrap* :
il met en place WSL + Ubuntu puis re-télécharge et exécute le `.sh`, qui reste
la source de vérité de l'installation réelle.

Le Worker (`worker.template.js`) contient deux placeholders `__SCRIPT_B64__`
(bash) et `__PS_SCRIPT_B64__` (PowerShell). À chaque build, `build.mjs` encode
les deux scripts en base64 et génère `src/worker.js`. Ce build est lancé
automatiquement par `wrangler deploy` grâce à la section `[build]` de
`wrangler.toml` — donc en local, en CI et sur Cloudflare, le contenu servi est
toujours à jour. Inutile de toucher au base64 à la main, et `src/worker.js` est
volontairement gitignoré (artefact généré).

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

Le workflow `.github/workflows/deploy.yml` déploie à chaque push sur `main`.
Ajoute deux secrets dans **Settings → Secrets and variables → Actions** :

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
curl -fsSL -H 'Accept: text/html' pl4y.store | head       # -> <!DOCTYPE html> ...
```

## Mettre à jour l'installeur

Édite `setup_osmo_egprs.sh`, commit, push. Le build régénère le base64 et
redéploie. Pense à purger le cache Cloudflare si tu testes une correction à
chaud (le Worker renvoie `Cache-Control: max-age=300`).
