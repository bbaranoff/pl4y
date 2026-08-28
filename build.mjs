#!/usr/bin/env node
// Regenere src/worker.js a partir de la source de verite (setup_osmo_egprs.sh,
// setup_osmo_egprs.ps1) et du template worker.template.js. Aucune dependance
// externe (builtins Node).
//
// Lance automatiquement par `wrangler deploy` via la section [build] de
// wrangler.toml — donc en local, en CI GitHub Actions et sur Cloudflare
// Workers Builds, le base64 est toujours a jour.
//
// [2026-08-28] Les images et GIFs ne sont PLUS embarques en base64 : ils sont
// copies dans public/m/ et servis en Static Assets. Le bundle du Worker est
// passe de ~960 Kio a ~98 Kio, soit tres loin de la limite Cloudflare (1 Mio
// gzip en plan gratuit) — et le cold start ne paie plus le decodage.

import {
  readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync,
  readdirSync, rmSync, cpSync, statSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { skin } from "./docs/skin.mjs";

const SCRIPT = "setup_osmo_egprs.sh";
const PS_SCRIPT = "setup_osmo_egprs.ps1";
const TEMPLATE = "worker.template.js";
const OUT = "src/worker.js";

// Medias servis en Static Assets sous /m/ : source -> nom publie.
const MEDIA = {
  "assets/motorola_c123.jpg": "motorola_c123.jpg",
  "assets/screencast_demo.jpg": "screencast_demo.jpg",
  "assets/demo_iso.gif": "iso.gif",
  "assets/demo_launch.gif": "launch.gif",
  "assets/demo_console.gif": "console.gif",
};

const b64 = readFileSync(SCRIPT).toString("base64");
const psB64 = readFileSync(PS_SCRIPT).toString("base64");
const tpl = readFileSync(TEMPLATE, "utf8");
// Source unique de la palette : le meme fichier que docs/skin.mjs prefixe a
// pl4y-doc.css dans chaque arbre documentaire.
const themeTokens = readFileSync("docs/theme/pl4y-tokens.css", "utf8").trimEnd();

// Cartes de documentation : ecrites par docs/unify.mjs, identiques a celles du
// hub /docs/. Versionnees, car Cloudflare ne rejoue pas unify.mjs au build.
// Absentes (premier clone, section jamais rendue), la page de garde retombe sur
// un simple lien vers /docs/ plutot que de casser le build.
const CARDS = "docs/cards.html";
const cards = existsSync(CARDS)
  ? readFileSync(CARDS, "utf8").trimEnd()
  : `      <a class="hub-card" href="/docs/">
        <h2>Documentation</h2>
        <p>Les corpus rendus et unifies (Calypso, osmo_egprs, tests, SDR, cours &amp; CTF).</p>
        <span class="meta">/docs/</span>
      </a>`;
if (!existsSync(CARDS)) {
  console.warn(`[build] ATTENTION: ${CARDS} absent — lancer \`node docs/unify.mjs\``);
}

for (const ph of ["__SCRIPT_B64__", "__PS_SCRIPT_B64__", "__DOC_CARDS__", "__THEME_TOKENS__"]) {
  if (!tpl.includes(ph)) {
    console.error(`[build] ERREUR: placeholder ${ph} introuvable dans ${TEMPLATE}`);
    process.exit(1);
  }
}

// Le template ne doit plus contenir de media inline : un placeholder base64
// oublie ferait regonfler le bundle sans qu'on s'en apercoive.
if (/__[A-Z_]*(JPG|GIF|PNG)_B64__|data:image\/[a-z]+;base64,[A-Za-z0-9+/]{200}/.test(tpl)) {
  console.error(`[build] ERREUR: media inline detecte dans ${TEMPLATE} — le publier dans public/m/ et le referencer en /m/<nom>.`);
  process.exit(1);
}

// Les medias sont recopies dans public/m/ a chaque build : impossible qu'une
// image mise a jour dans assets/ reste perimee dans l'arbre publie.
mkdirSync("public/m", { recursive: true });
for (const [src, name] of Object.entries(MEDIA)) {
  if (!existsSync(src)) {
    console.error(`[build] ERREUR: media ${src} introuvable`);
    process.exit(1);
  }
  copyFileSync(src, `public/m/${name}`);
}

// ---------------------------------------------------------------------------
// bundles/ — dossiers produits par full_qmd.sh dans les depots sources.
//
// Le workflow : `MODE=site ./full_qmd.sh` dans ~/osmo_egprs ou ~/qemu-calypso,
// `quarto render` dans le dossier obtenu, puis on depose ce dossier dans
// pl4y/bundles/. `wrangler deploy` lance ce script via [build], qui publie le
// contenu sous public/<section>/ — donc sur https://pl4y.store/<section>/.
//
// La section visee est lue dans `.pl4y-section`, ecrit par full_qmd.sh. On ne
// la devine PAS d'apres le nom du dossier : `qemu-calypso` se publie sous
// /calypso/, et deux depots peuvent produire des dossiers homonymes.
// ---------------------------------------------------------------------------
const BUNDLES = "bundles";

// Correspondances de repli, pour un dossier depose sans marqueur.
const SECTION_ALIASES = { "qemu-calypso": "calypso", "calypso-qmd": "calypso" };

function sectionOf(dir) {
  const marker = join(BUNDLES, dir, ".pl4y-section");
  if (existsSync(marker)) {
    const s = readFileSync(marker, "utf8").trim();
    if (/^[a-z0-9_-]+$/i.test(s)) return s;
    console.error(`[build] ERREUR: .pl4y-section invalide dans ${dir} : "${s}"`);
    process.exit(1);
  }
  const base = dir.replace(/-qmd$/, "");
  return SECTION_ALIASES[dir] || SECTION_ALIASES[base] || base;
}

// Un bundle peut arriver rendu (quarto render deja passe) ou brut. On publie du
// HTML : il faut donc trouver l'arbre rendu, ou le produire.
function renderedRoot(dir) {
  const root = join(BUNDLES, dir);
  if (existsSync(join(root, "_site", "index.html"))) return join(root, "_site");
  if (existsSync(join(root, "index.html"))) return root;

  if (existsSync(join(root, "_quarto.yml"))) {
    try {
      execFileSync("quarto", ["render"], { cwd: root, stdio: "inherit" });
    } catch {
      console.error(
        `[build] ERREUR: ${root} est un projet Quarto non rendu et quarto est introuvable.\n` +
        `        Lancer \`(cd ${root} && quarto render)\` puis relancer le deploiement.`,
      );
      process.exit(1);
    }
    if (existsSync(join(root, "_site", "index.html"))) return join(root, "_site");
  }
  console.error(`[build] ERREUR: ${root} ne contient ni _site/index.html ni index.html.`);
  process.exit(1);
}

if (existsSync(BUNDLES)) {
  const dirs = readdirSync(BUNDLES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  // Deux dossiers visant la meme section se marcheraient dessus en silence.
  const seen = new Map();
  for (const dir of dirs) {
    const sec = sectionOf(dir);
    if (seen.has(sec)) {
      console.error(`[build] ERREUR: bundles/${dir} et bundles/${seen.get(sec)} visent tous deux /${sec}/.`);
      process.exit(1);
    }
    seen.set(sec, dir);
  }

  for (const [section, dir] of seen) {
    const from = renderedRoot(dir);
    const dest = join("public", section);
    // On repart d'un repertoire vide : sinon les pages d'un bundle precedent
    // dont la source a disparu resteraient publiees indefiniment.
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(from, dest, {
      recursive: true,
      filter: (src) => !/(^|[\\/])(\.pl4y-section|\.quarto|\.git)$/.test(src),
    });
    const r = skin(dest);
    const n = readdirSync(dest, { recursive: true }).length;
    console.log(
      `[build] bundles/${dir} -> public/${section}/ ` +
      `(${n} entrees, ${r.skinned}/${r.files} pages habillees)`,
    );
  }
}

// Le HTML de la page est un TEMPLATE LITERAL JavaScript dans worker.template.js.
// Tout ce qu'on y injecte doit donc etre neutralise : un backtick ou un `${`
// dans le CSS ou dans les cartes fermerait la chaine et casserait le Worker.
// (Le CSS des tokens contient bien un backtick, dans un commentaire.)
function forTemplateLiteral(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

// Remplacement par FONCTION : avec une chaine, `$&`, `$'` et `$\`` auraient un
// sens special dans le texte de remplacement et mutileraient silencieusement
// le contenu injecte.
function fill(str, placeholder, value) {
  return str.replace(placeholder, () => value);
}

mkdirSync("src", { recursive: true });
writeFileSync(
  OUT,
  [
    ["__SCRIPT_B64__", b64],
    ["__PS_SCRIPT_B64__", psB64],
    ["__DOC_CARDS__", forTemplateLiteral(cards)],
    // Palette partagee avec les sections documentaires. Injectee EN TETE du
    // <style> : la regle @import des polices doit rester la premiere du bloc,
    // sinon le navigateur l'ignore et les titres retombent sur la police
    // systeme.
    ["__THEME_TOKENS__", forTemplateLiteral(themeTokens)],
  ].reduce((acc, [ph, v]) => fill(acc, ph, v), tpl),
);

const kib = (readFileSync(OUT).length / 1024).toFixed(1);
console.log(
  `[build] ${OUT} genere — ${kib} Kio (bash ${b64.length} o + powershell ${psB64.length} o base64)`,
);
console.log(
  `[build] ${Object.keys(MEDIA).length} medias copies dans public/m/ (servis en Static Assets)`,
);
