# `docs/` — workflow d'unification du contenu

`pl4y.store` sert le contenu de **plusieurs dépôts** sous un seul habillage.
Chacun a sa propre chaîne de rendu ; le workflow les ramène à un arbre statique
unique, `public/`, servi par le Worker en **Cloudflare Static Assets**.

| URL | Source | Chaîne |
|---|---|---|
| `/calypso/` | `../qemu-calypso` | `full-qmd.sh` (bundle) → **Quarto** |
| `/osmo_egprs/` | `../osmo_egprs` | `full_qmd.sh` (même bundle) → **Quarto** |
| `/tests/` | `../qemu/tests` | instantané de `test_results.qmd` → **Quarto** |
| `/sdr/` | `../software-defined-radio` | **Sphinx** + MyST (thème RTD) |
| `/bbaranoff/` | `../bbaranoff.github.io` | **pandoc** + sommaire de section reconstruit |
| `/docs/` | — | hub généré + feuille de style commune |

### Où sont cherchées les sources

`sourceDir()` résout dans cet ordre, et s'arrête au premier hit :

1. `PL4Y_SRC_<SECTION>` (ex. `PL4Y_SRC_SDR=/srv/software-defined-radio`) ;
2. **`../<nom>`**, relatif à ce dépôt — le cas normal, les dépôts sont clonés
   côte à côte ;
3. `$HOME/<nom>`, repli pour les configurations où ils ne le sont pas.

Le chemin relatif passe en premier pour que le workflow marche à l'identique
quel que soit l'utilisateur ou le point de montage (clone dans `/srv`, CI,
conteneur) sans dépendre de `$HOME`.

## Lancer le workflow

```bash
node docs/unify.mjs                 # toutes les sections
node docs/unify.mjs sdr bbaranoff   # seulement celles-ci
FORCE=1 node docs/unify.mjs         # re-rend même si déjà construit
```

Prérequis : `quarto`, `pandoc`, et `sphinx-build` (cherché dans `$PL4Y_VENV`,
par défaut `~/.env` — sinon `pip install -r ../software-defined-radio/requirements.txt`).
Une section dont l'outil manque est **sautée** avec un avertissement : le reste
du site se construit quand même.

## Les cinq étapes

1. **collect** — vérifie que chaque dépôt source existe.
2. **render** — chaque source avec sa chaîne native. Pour Calypso, le
   `_quarto.yml` généré est repatché : thème neutre (`cosmo`) au lieu de
   `sketchy`, et `execute: false` — sans quoi Quarto réclame Jupyter et le
   rendu casse.
3. **dedupe** — supprime les fichiers octet-à-octet identiques **qui ne sont
   référencés par aucune page**. Un doublon encore cité par un `src=`/`href=`
   est conservé : deux copies de la même image servies sous deux URL (`en/`,
   `fr/`) doivent rester. Les pages HTML ne sont jamais supprimées.
   Le vendoring (`_sass/`, `_includes/`, `_layouts/`, `node_modules/`, …) est
   écarté en amont, à la copie.
4. **skin** — injecte dans chaque page : le script de thème (anti-flash), le
   `<link>` vers `pl4y-doc.css`, et la barre de navigation pl4y. Idempotent
   (marqueur `<!-- pl4y-skin v1 -->`).
5. **index** — génère `/docs/`, la page d'accueil du hub.

## Le skin

`theme/pl4y-doc.css` reprend les tokens de la page principale
(`worker.template.js`) et les applique aux trois familles de thèmes :
Quarto/Bootstrap, Sphinx/RTD, et le template pandoc `theme/pandoc-pl4y.html`.
Le thème clair/sombre est partagé avec la page d'accueil via la même clé
`localStorage` (`pl4y-theme`), donc le choix suit le visiteur d'une section à
l'autre.

## Limites assumées

- **Fichiers > 20 Mo écartés** : Static Assets plafonne à 25 Mio par fichier.
  Concrètement, quatre `.mp4` de `bbaranoff.github.io` (`rickroll`, `find_key`,
  `redir`, `encrypt`) ne sont pas publiés — les pages qui les référencent
  s'affichent, la vidéo seule manque.
- **Jekyll n'est pas rejoué** : pas de ruby ici. Le markdown est rendu par
  pandoc, donc les gabarits Jekyll (`_layouts`) ne sont pas appliqués — ce qui
  est voulu, puisque l'habillage cible est celui de pl4y.
- `public/` est **versionné** : le builder Cloudflare n'a ni quarto ni sphinx ni
  pandoc, il ne peut donc pas rejouer ce workflow. Après avoir modifié un dépôt
  source, relancer `node docs/unify.mjs` puis committer `public/`.
