#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * unify.mjs — workflow d'unification du contenu servi par pl4y.store
 *
 * Prend les depots sources, les rend chacun avec sa chaine native, puis
 * unifie le resultat dans un seul arbre statique `public/` : meme skin, meme
 * navigation, meme bascule de theme, sans doublon.
 *
 *   /calypso/     <- ~/qemu-calypso           (Quarto, bundle du depot)
 *   /sdr/         <- ~/software-defined-radio (Sphinx / MyST / RTD)
 *   /bbaranoff/   <- ~/bbaranoff.github.io    (Jekyll -> pandoc + sommaire)
 *   /osmo_egprs/  <- ~/osmo_egprs             (Quarto, meme bundle que Calypso)
 *   /tests/       <- ~/qemu/tests             (instantane du rapport pytest)
 *
 * Etapes :
 *   1. collect  — verifie les sources et les outils disponibles
 *   2. render   — chaque source avec sa chaine (quarto / sphinx / pandoc)
 *   3. dedupe   — supprime les doublons octet-a-octet et le vendoring
 *   4. skin     — injecte le skin pl4y dans chaque page HTML
 *   5. index    — genere la page d'accueil /docs/ du hub documentaire
 *
 * Usage :
 *   node docs/unify.mjs                 # tout
 *   node docs/unify.mjs calypso sdr     # seulement ces cibles
 *   FORCE=1 node docs/unify.mjs         # re-rend meme si deja construit
 *
 * Idempotent : relancer ne reconstruit que ce qui manque (sauf FORCE=1).
 * ------------------------------------------------------------------------- */

import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
  rmSync, cpSync, statSync,
} from "node:fs";
import { join, relative, dirname, extname, basename, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { skin } from "./skin.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DOCS = join(ROOT, "docs");
const PUBLIC = join(ROOT, "public");
const HOME = process.env.HOME || "/root";
const FORCE = process.env.FORCE === "1";
const VENV = process.env.PL4Y_VENV || join(HOME, ".env");

// Cloudflare Workers Static Assets : 25 MiB max par fichier. On coupe a 20 pour
// garder de la marge (et parce qu'aucun media du site n'a besoin d'etre plus gros).
const MAX_ASSET = 20 * 1024 * 1024;

// Repertoires/fichiers qui n'ont rien a faire dans un site publie : vendoring,
// machinerie de build, doublons de theme.
const NOISE = [
  /(^|\/)\.git(\/|$)/, /(^|\/)node_modules(\/|$)/, /(^|\/)_sass(\/|$)/,
  /(^|\/)_includes(\/|$)/, /(^|\/)_layouts(\/|$)/, /(^|\/)\.github(\/|$)/,
  /(^|\/)\.jekyll-cache(\/|$)/, /(^|\/)vendor(\/|$)/, /(^|\/)\.pytest_cache(\/|$)/,
  /(^|\/)Gemfile(\.lock)?$/, /(^|\/)webpack\.config\.js$/, /(^|\/)Makefile$/,
  /(^|\/)_config\.yml$/, /(^|\/)\.gitignore$/, /(^|\/)LICENSE$/,
  /(^|\/)[^/]*\.gemspec$/, /(^|\/)google[0-9a-f]+\.html$/,
];

const log = (s) => console.log(s);
const step = (s) => console.log(`\n\x1b[1m▸ ${s}\x1b[0m`);
const warn = (s) => console.log(`  ! ${s}`);

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });
}
function have(cmd) {
  try { sh("sh", ["-c", `command -v ${cmd}`]); return true; } catch { return false; }
}
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}
const isNoise = (rel) => NOISE.some((re) => re.test(rel));

/* ------------------------------------------------------------------ sources */

const SOURCES = {
  calypso: {
    title: "QEMU Calypso",
    blurb:
      "Bundle complet du depot <code>qemu-calypso</code> : documentation, tests, " +
      "headers, sources C du DSP C54x, scripts Python et shell — chaque fichier " +
      "dans son bloc de code, avec filtre et recherche plein-texte.",
    src: join(HOME, "qemu-calypso"),
    out: join(PUBLIC, "calypso"),
    build: buildCalypso,
  },
  sdr: {
    title: "Software Defined Radio",
    blurb:
      "La documentation <strong>software-defined-radio.com</strong> : 2G / 3G / 4G / 5G " +
      "et SDR, en francais et en anglais (Sphinx + MyST).",
    src: join(HOME, "software-defined-radio"),
    out: join(PUBLIC, "sdr"),
    build: buildSdr,
  },
  bbaranoff: {
    title: "Cours, projets & CTF",
    blurb:
      "Le contenu de <strong>bbaranoff.github.io</strong> : cours (Agile, UML, Git), " +
      "projets radio (IMSI catcher, chiffrement, LoRa, ADS-B), CTF et jeux.",
    src: join(HOME, "bbaranoff.github.io"),
    out: join(PUBLIC, "bbaranoff"),
    build: buildBbaranoff,
  },
  osmo_egprs: {
    title: "osmo_egprs",
    blurb:
      "Bundle complet du depot <code>osmo_egprs</code> : la plateforme multi-PLMN " +
      "(Docker, configs Osmocom, reseau, helpers, scripts de lancement) — meme " +
      "rendu que le bundle Calypso, chaque fichier dans son bloc de code.",
    src: join(HOME, "osmo_egprs"),
    out: join(PUBLIC, "osmo_egprs"),
    build: buildEgprs,
  },
  tests: {
    title: "Instantane des tests",
    blurb:
      "Le rapport de test genere par <code>tests/conftest.py</code> dans le fork " +
      "<strong>qemu</strong> : statut global, pipeline GSM colorie par taux de " +
      "reussite, detail par test — plus les diagrammes et la timeline bruts.",
    src: join(HOME, "qemu", "tests"),
    out: join(PUBLIC, "tests"),
    build: buildTests,
  },
};

/* ------------------------------------------- 2. render : bundles Quarto (qmd) */

// Deux depots portent le meme generateur de bundle : un script qui balaie
// l'arbre et emet un projet Quarto multi-pages (doc, tests, headers, sources,
// python, shell). Il s'appelle `full-qmd.sh` dans qemu-calypso et `full_qmd.sh`
// dans osmo_egprs — d'ou la recherche sur les deux noms.
const BUNDLER_NAMES = ["full-qmd.sh", "full_qmd.sh"];

function buildQmdBundle(s, { work, title, subtitle, exclude }) {
  const site = join(work, "_site");

  if (FORCE || !existsSync(join(work, "_quarto.yml"))) {
    const bundler = BUNDLER_NAMES.find((n) => existsSync(join(s.src, n)));
    if (!bundler) {
      warn(`${BUNDLER_NAMES.join(" / ")} introuvable dans ${s.src} — etape sautee`);
      return false;
    }
    log(`  generation du bundle Quarto (${bundler}, mode site)…`);
    const env = { ...process.env, MODE: "site", OUTDIR: work, SPLIT_KB: "350" };
    if (title) env.TITLE = title;
    if (subtitle) env.SUBTITLE = subtitle;
    if (exclude) env.EXCLUDE = exclude;
    // bash explicitement : le bundler utilise `set -o pipefail`, que dash — le
    // /bin/sh de Debian — refuse ("Illegal option -o pipefail").
    sh("bash", [join(s.src, bundler)], { cwd: s.src, env });
    patchQuartoConfig(join(work, "_quarto.yml"));
    const pruned = pruneEmptyPages(work);
    if (pruned.length) log(`  rubriques vides elaguees : ${pruned.join(", ")}`);
  }

  if (FORCE || !existsSync(site)) {
    if (!have("quarto")) { warn(`quarto absent — ${s.out} non reconstruit`); return existsSync(site); }
    log("  quarto render (peut prendre quelques minutes)…");
    sh("quarto", ["render"], { cwd: work, stdio: "inherit" });
  }
  if (!existsSync(site)) return false;

  copyTree(site, s.out);
  // Les fichiers sources demandes explicitement, servis a cote du rendu.
  for (const f of ["sketchy.css", "sk-filter.html"]) {
    const p = join(work, f);
    if (existsSync(p)) cpSync(p, join(s.out, f));
  }
  return true;
}

function buildCalypso(s) {
  return buildQmdBundle(s, { work: join(DOCS, "calypso-site") });
}

// Meme chaine que Calypso. Deux exclusions en plus : le bundle deja rendu qui
// traine dans le depot (`calypso-full.qmd` et son dossier de ressources) se
// re-inclurait lui-meme — 800 ko de doublon dans une page — et `rsconnect/`
// n'est que la machinerie de publication Posit.
function buildEgprs(s) {
  return buildQmdBundle(s, {
    work: join(DOCS, "egprs-site"),
    title: "osmo_egprs",
    subtitle: "Bundle du depot - plateforme multi-PLMN Osmocom / Docker",
    exclude:
      "subprojects|build|pc-bios|node_modules|\\.git|\\.pytest_cache" +
      "|calypso-full|rsconnect|\\.iso$",
  });
}

/* --------------------------------------------------- 2. render : tests (qemu) */

// `tests/test_results.qmd` du fork qemu est REGENERE a chaque session pytest
// (`conftest.py::pytest_sessionfinish`) : ce qu'on publie est l'instantane du
// dernier run, pas un document maintenu a la main. On horodate donc la page
// avec le mtime du fichier source, sinon rien ne dit de quand date le rapport.
const TEST_ASSETS = [
  ["test_results.qmd", "le rapport source (Quarto)"],
  ["log_timeline.csv", "la timeline des evenements"],
  ["pipeline.mmd", "le pipeline GSM (Mermaid)"],
  ["detail.mmd", "le detail par test (Mermaid)"],
  ["full.mmd", "le graphe complet (Mermaid)"],
];

function buildTests(s) {
  const report = join(s.src, "test_results.qmd");
  if (!existsSync(report)) {
    warn(`test_results.qmd introuvable dans ${s.src} — lancer pytest d'abord`);
    return false;
  }
  if (!have("quarto")) { warn("quarto absent — /tests non reconstruit"); return false; }

  const work = join(DOCS, "tests-site");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const stamp = statSync(report).mtime.toISOString().replace("T", " ").slice(0, 16);
  log(`  instantane du ${stamp} (mtime de test_results.qmd)`);

  // `date: today` daterait la page du jour du rendu, pas du run de test.
  const qmd = readFileSync(report, "utf8")
    .replace(/^date:\s*today\s*$/m, `date: "${stamp}"`)
    .replace(/^(\s*)embed-resources:\s*true\s*$/m, "$1embed-resources: false");
  writeFileSync(join(work, "index.qmd"), qmd);

  for (const [f] of TEST_ASSETS) {
    const p = join(s.src, f);
    if (existsSync(p)) cpSync(p, join(work, f));
  }

  log("  quarto render (rapport de test)…");
  sh("quarto", ["render", "index.qmd", "--to", "html"], { cwd: work, stdio: "inherit" });
  if (!existsSync(join(work, "index.html"))) return false;

  rmSync(s.out, { recursive: true, force: true });
  mkdirSync(s.out, { recursive: true });
  for (const abs of walk(work)) {
    const rel = relative(work, abs);
    if (rel === "index.qmd" || rel.startsWith(".quarto")) continue;
    const dst = join(s.out, rel);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(abs, dst);
  }
  appendTestSources(join(s.out, "index.html"), stamp);
  return true;
}

// Le rapport ne dit pas d'ou il sort : on ajoute en pied de page le lien vers
// les fichiers bruts, publies a cote.
function appendTestSources(page, stamp) {
  if (!existsSync(page)) return;
  const rows = TEST_ASSETS
    .filter(([f]) => existsSync(join(dirname(page), f)))
    .map(([f, what]) => `    <li><a href="${f}"><code>${f}</code></a> &mdash; ${what}</li>`)
    .join("\n");
  const block = `
<hr>
<section id="pl4y-sources">
  <h2>Sources de l'instantane</h2>
  <p>Rapport genere par <code>tests/conftest.py::pytest_sessionfinish</code> du fork
     <a href="https://github.com/bbaranoff/qemu" target="_blank" rel="noopener">bbaranoff/qemu</a>,
     instantane du <strong>${stamp}</strong>. Fichiers bruts servis ici :</p>
  <ul>
${rows}
  </ul>
</section>
`;
  const html = readFileSync(page, "utf8");
  if (html.includes('id="pl4y-sources"')) return;
  writeFileSync(page, html.replace(/<\/body>/i, `${block}</body>`));
}

// Le bundler emet une page par rubrique meme quand le depot n'a aucun fichier
// du type correspondant : osmo_egprs n'a ni `.c`, ni `.h`, ni `test_*.py`, donc
// "2 - Tests", "3 - Headers" et "4 - Sources" sortiraient vides dans la barre
// laterale. On supprime ces pages et leurs entrees dans _quarto.yml.
function pruneEmptyPages(work) {
  const yml = join(work, "_quarto.yml");
  if (!existsSync(yml)) return [];

  const empty = readdirSync(work)
    .filter((f) => /^sec\d+-\d+\.qmd$/.test(f))
    .filter((f) => !/^## /m.test(readFileSync(join(work, f), "utf8")));
  if (!empty.length) return [];
  for (const f of empty) rmSync(join(work, f));

  const dropped = new Set(empty);
  const lines = readFileSync(yml, "utf8").split("\n");
  const out = [];
  const titles = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const href = l.match(/^ +- href: (sec\d+-\d+\.qmd)\s*$/);
    if (href && dropped.has(href[1])) { i++; continue; } // + la ligne `text:`
    const sec = l.match(/^ +- section: "(.+)"\s*$/);
    if (sec) {
      // La rubrique ne survit que si au moins un `- href:` la suit avant la
      // rubrique suivante ou la fin du bloc sidebar.
      let keep = false;
      for (let j = i + 2; j < lines.length; j++) {
        if (/^ +- section: /.test(lines[j]) || /^\S/.test(lines[j])) break;
        const h = lines[j].match(/^ +- href: (sec\d+-\d+\.qmd)\s*$/);
        if (h && !dropped.has(h[1])) { keep = true; break; }
      }
      if (!keep) { titles.push(sec[1]); i++; continue; } // + la ligne `contents:`
    }
    out.push(l);
  }
  writeFileSync(yml, out.join("\n"));
  return titles;
}

// Le _quarto.yml genere vise le theme "sketchy" et execute les blocs de code :
// on passe sur un theme neutre (le skin pl4y fait le reste) et on coupe
// l'execution, qui exigerait Jupyter et casse le rendu.
function patchQuartoConfig(p) {
  if (!existsSync(p)) return;
  let y = readFileSync(p, "utf8");
  y = y.replace(/^ {4}theme: \[sketchy\]\n {4}css: sketchy\.css\n/m, "    theme: [cosmo]\n");
  if (!/^execute:/m.test(y)) y = y.replace(/^format:/m, "execute:\n  enabled: false\n  freeze: false\n\nformat:");
  writeFileSync(p, y);
}

/* ----------------------------------------------------------- 2. render : sdr */

function buildSdr(s) {
  const build = join(DOCS, "sdr-build");
  if (FORCE || !existsSync(join(build, "index.html"))) {
    const sphinx = existsSync(join(VENV, "bin/sphinx-build"))
      ? join(VENV, "bin/sphinx-build")
      : have("sphinx-build") ? "sphinx-build" : null;
    if (!sphinx) {
      warn(`sphinx-build introuvable (essaye : ${VENV}/bin/pip install -r ${s.src}/requirements.txt)`);
      return existsSync(build);
    }
    log("  sphinx-build…");
    sh(sphinx, ["-q", "-b", "html", join(s.src, "source"), build], { stdio: "inherit" });
  }
  if (!existsSync(build)) return false;
  copyTree(build, s.out);
  return true;
}

/* ----------------------------------------------------- 2. render : bbaranoff */

// Jekyll n'est pas installable ici (ni ruby ni bundler) : on rend le markdown
// avec pandoc dans le template pl4y, ce qui donne le meme rendu que le reste
// du site plutot que le theme read-the-docs d'origine.
function buildBbaranoff(s) {
  if (!have("pandoc")) { warn("pandoc absent — /bbaranoff non construit"); return false; }
  const tpl = join(DOCS, "theme", "pandoc-pl4y.html");
  const files = walk(s.src).map((f) => relative(s.src, f)).filter((r) => !isNoise(r));

  const mdFiles = files.filter((r) => extname(r).toLowerCase() === ".md");
  const htmlFiles = files.filter((r) => /\.html?$/i.test(r));
  const assets = files.filter((r) => !/\.(md|html?)$/i.test(r));

  // Doublon Jekyll : page.md et page.html cote a cote decrivent la meme page.
  // Le .md est la source, le .html le rendu d'un ancien build -> on garde le .md.
  const mdStems = new Set(mdFiles.map((r) => r.replace(/\.md$/i, "")));
  const keptHtml = htmlFiles.filter((r) => !mdStems.has(r.replace(/\.html?$/i, "")));

  mkdirSync(s.out, { recursive: true });
  let n = 0;
  for (const rel of mdFiles) {
    const src = join(s.src, rel);
    const dst = join(s.out, rel.replace(/\.md$/i, ".html"));
    mkdirSync(dirname(dst), { recursive: true });
    // Le titre de la page vient du premier H1 du fichier ; on le retire alors du
    // corps, sinon le template et le markdown l'affichent tous les deux.
    const { title, body } = splitTitle(
      readFileSync(src, "utf8"),
      basename(rel, extname(rel)).replace(/[-_]/g, " "),
    );
    sh("pandoc", [
      "-f", "markdown+smart+pipe_tables+backtick_code_blocks+raw_html",
      "-t", "html5", "--standalone", "--toc", "--toc-depth=3",
      "--template", tpl, "--metadata", `title=${title}`,
      "--resource-path", dirname(src),
      "-o", dst,
    ], { input: body });
    n++;
  }
  for (const rel of keptHtml) {
    const dst = join(s.out, rel);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(s.src, rel), dst);
  }
  for (const rel of assets) {
    const src = join(s.src, rel);
    if (statSync(src).size > MAX_ASSET) { warn(`ecarte (>20 Mo) : ${rel}`); continue; }
    const dst = join(s.out, rel);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
  }
  // index.md -> index.html existe deja ; les liens Jekyll pointent vers ".md"
  rewriteMdLinks(s.out);
  const nav = sectionNav(s.out, "bbaranoff.github.io");
  log(`  ${n} pages markdown rendues, ${keptHtml.length} html conserves, ${assets.length} medias`);
  log(`  sommaire de section injecte dans ${nav.injected}/${nav.pages} pages` +
      ` (${nav.groups} rubriques)`);
  return true;
}

/* ------------------------------------------------- 2b. sommaire de section --- */

// Le depot Jekyll porte sa navigation dans `_includes/`, ecarte comme vendoring
// (et de toute facon jamais joue, faute de ruby). Resultat : on atterrit sur la
// page de garde — le CV — qui ne pointe vers AUCUNE des trente autres pages, et
// la section est un cul-de-sac. On reconstruit donc le sommaire depuis l'arbre
// rendu, et on l'injecte en haut de chaque page.
const NAV_MARK = "<!-- pl4y-sectnav v1 -->";

// Rubriques connues : ordre d'affichage + libelle. Un dossier absent de cette
// table apparait quand meme, apres, sous son propre nom.
const NAV_GROUPS = [
  ["", "Accueil"], ["projects", "Projets"], ["cours", "Cours"],
  ["ctf", "CTF"], ["games", "Jeux"], ["infos", "Infos"],
];

// Ce qui n'est pas une page de contenu : ressources de decks reveal.js,
// vendoring Quarto, et la vue orateur que reveal genere pour chaque deck.
const NAV_SKIP = /(^|\/)([^/]+_files|site_libs|assets|_static)(\/|$)|speaker-view\.html$/i;

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", mdash: "—" };
const unent = (s) => s.replace(/&(#?\w+);/g, (m, k) => (k in ENT ? ENT[k] : m));

// Le titre vient du <title> pandoc, qui recopie le H1 du markdown SANS le
// rendre : un `# **ADSB**` arrive ici tel quel. On enleve donc les marqueurs
// d'emphase, sinon le sommaire affiche les asterisques.
const demark = (s) => s.replace(/\*\*?(.+?)\*\*?/g, "$1").replace(/`/g, "").trim();

function pageTitle(html, fallback) {
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (t) {
    const s = demark(unent(t[1]).replace(/\s*[—–-]\s*pl4y\.store\s*$/i, ""));
    if (s && s.toLowerCase() !== "pl4y.store") return s;
  }
  const h = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h) {
    const s = demark(unent(h[1].replace(/<[^>]+>/g, "")));
    if (s) return s;
  }
  return fallback;
}

// Un `index.html` sans titre exploitable herite du nom de son dossier : sinon
// tout un repertoire s'appelle "index" dans le sommaire.
function navTitle(root, rel) {
  const html = readFileSync(join(root, rel), "utf8");
  const stem = basename(rel, extname(rel));
  let fallback = stem.replace(/[-_]/g, " ");
  if (/^index$/i.test(stem) && rel.includes("/")) {
    const dir = dirname(rel).split("/").pop();
    fallback = /^[0-9a-f]{16,}$/i.test(dir) ? `archive ${dir.slice(0, 8)}…` : dir.replace(/[-_]/g, " ");
  }
  const t = pageTitle(html, fallback);
  return /^index$/i.test(t) ? fallback : t;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sectionNav(root, label) {
  const pages = walk(root)
    .map((p) => relative(root, p).split(sep).join("/"))
    .filter((r) => /\.html?$/i.test(r) && !NAV_SKIP.test(r))
    .sort();

  // Regroupement par dossier de premier niveau, index.html en tete de rubrique.
  const groups = new Map();
  const titles = new Map();
  for (const rel of pages) {
    const dir = rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : "";
    titles.set(rel, navTitle(root, rel));
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(rel);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ia = /(^|\/)index\.html?$/i.test(a) ? 0 : 1;
      const ib = /(^|\/)index\.html?$/i.test(b) ? 0 : 1;
      return ia - ib || a.localeCompare(b, "fr");
    });
  }

  const known = new Set(NAV_GROUPS.map(([k]) => k));
  const order = [
    ...NAV_GROUPS.filter(([k]) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !known.has(k)).sort()
      .map((k) => [k, k.replace(/[-_]/g, " ")]),
  ];

  let injected = 0;
  for (const rel of pages) {
    const abs = join(root, rel);
    let html = readFileSync(abs, "utf8");
    if (html.includes(NAV_MARK)) continue;
    const here = rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : "";
    const from = dirname(abs);

    const blocks = order.map(([dir, title]) => {
      const items = groups.get(dir).map((r) => {
        const href = relative(from, join(root, r)).split(sep).join("/") || basename(r);
        const cur = r === rel ? ' aria-current="page"' : "";
        return `      <li><a href="${href}"${cur}>${esc(titles.get(r))}</a></li>`;
      }).join("\n");
      // La rubrique de la page courante est depliee, les autres sont fermees :
      // sur la page de garde, tout est accessible sans noyer le CV.
      const open = dir === here ? " open" : "";
      return `    <details class="pl4y-sect-grp"${open}>
      <summary>${esc(title)} <span class="n">${groups.get(dir).length}</span></summary>
      <ul>
${items}
      </ul>
    </details>`;
    }).join("\n");

    const nav = `${NAV_MARK}
<nav class="pl4y-sect" aria-label="Sommaire de la section">
  <div class="pl4y-sect-head">${esc(label)}</div>
${blocks}
</nav>
`;
    // Dans le gabarit pandoc, le contenu vit dans .pl4y-doc : le sommaire y
    // entre pour heriter de la largeur de page. Les HTML repris tels quels
    // (decks reveal.js, pages CTF) n'ont pas ce conteneur -> juste apres <body>.
    if (/<div class="pl4y-doc">/.test(html)) {
      html = html.replace(/<div class="pl4y-doc">/, (m) => `${m}\n${nav}`);
    } else if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${nav}`);
    } else {
      html = nav + html;
    }
    writeFileSync(abs, html);
    injected++;
  }
  return { pages: pages.length, injected, groups: order.length };
}

// Detache le titre du corps : si le fichier commence par un H1 (eventuellement
// precede d'un front-matter Jekyll), il devient le titre de la page et disparait
// du markdown rendu.
function splitTitle(raw, fallback) {
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const m = body.match(/^\s*#\s+(.+?)\s*$/m);
  if (m && body.slice(0, body.indexOf(m[0])).trim() === "") {
    body = body.slice(body.indexOf(m[0]) + m[0].length).replace(/^\r?\n+/, "");
    return { title: m[1].trim(), body };
  }
  return { title: fallback, body };
}

// Les liens internes du depot Jekyll pointent vers des .md : on les recale sur
// les .html generes (sinon chaque lien telecharge la source au lieu d'ouvrir la page).
function rewriteMdLinks(root) {
  for (const f of walk(root).filter((p) => /\.html?$/i.test(p))) {
    const before = readFileSync(f, "utf8");
    const after = before.replace(/(href="(?!https?:)[^"]+)\.md(["#?])/g, "$1.html$2");
    if (after !== before) writeFileSync(f, after);
  }
}

/* ------------------------------------------------------------------ helpers */

function copyTree(from, to) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  for (const abs of walk(from)) {
    const rel = relative(from, abs);
    if (isNoise(rel)) continue;
    if (statSync(abs).size > MAX_ASSET) { warn(`ecarte (>20 Mo) : ${rel}`); continue; }
    const dst = join(to, rel);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(abs, dst);
  }
}

/* ------------------------------------------------------------- 3. dedupe --- */

// Supprime les fichiers octet-a-octet identiques a un autre — mais seulement
// s'ils ne sont reference par aucune page. Deux copies de la meme image servies
// sous deux URL (en/ et fr/ chez Sphinx) restent toutes les deux : les effacer
// casserait un <img>. Les pages HTML ne sont jamais supprimees, un doublon de
// page etant une URL legitime.
function dedupe() {
  const referenced = collectReferences();
  const seen = new Map();
  let removed = 0, kept = 0, bytes = 0;
  for (const abs of walk(PUBLIC)) {
    const rel = relative(PUBLIC, abs);
    if (/\.html?$/i.test(rel)) continue;
    const st = statSync(abs);
    if (st.size < 4096) continue; // en dessous, le gain ne vaut pas le risque
    const key = createHash("sha256").update(readFileSync(abs)).digest("hex");
    if (!seen.has(key)) { seen.set(key, rel); continue; }
    if (referenced.has(rel)) { kept++; continue; }
    rmSync(abs); removed++; bytes += st.size;
  }
  log(`  ${removed} doublons orphelins supprimes (${(bytes / 1048576).toFixed(1)} Mo)` +
      `${kept ? `, ${kept} doublons conserves car references` : ""}`);
}

// Chemins (relatifs a public/) cites par un src=/href= dans une page generee.
function collectReferences() {
  const set = new Set();
  for (const f of walk(PUBLIC).filter((p) => /\.html?$/i.test(p))) {
    const dir = relative(PUBLIC, dirname(f));
    const html = readFileSync(f, "utf8");
    for (const m of html.matchAll(/(?:src|href)="([^"#?]+)/g)) {
      const u = m[1];
      if (/^(https?:|data:|mailto:|#)/i.test(u)) continue;
      const p = u.startsWith("/")
        ? u.slice(1)
        : join(dir, u).split(sep).join("/");
      set.add(p.replace(/^\.\//, ""));
    }
  }
  return set;
}

/* -------------------------------------------------------------- 5. index --- */

function writeHub(built) {
  // Une passe ciblee (`node docs/unify.mjs tests`) ne doit pas faire disparaitre
  // du hub les sections deja publiees : on prend celles construites a l'instant
  // PLUS celles qui ont deja un rendu dans public/.
  const shown = Object.entries(SOURCES)
    .filter(([k, s]) => built.includes(k) || existsSync(join(s.out, "index.html")))
    .map(([k]) => k);

  const cards = Object.entries(SOURCES)
    .filter(([k]) => shown.includes(k))
    .map(([k, s]) => {
      const n = walk(s.out).filter((p) => /\.html?$/i.test(p)).length;
      return `      <a class="hub-card" href="/${k}/">
        <h2>${s.title}</h2>
        <p>${s.blurb}</p>
        <span class="meta">${n} page${n > 1 ? "s" : ""} &middot; /${k}/</span>
      </a>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pl4y.store &mdash; documentation</title>
<style>
  .hub { max-width:960px; margin:0 auto; padding:2.4rem 1rem 3rem; }
  .hub-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(19rem,1fr)); }
  .hub-card { display:block; background:var(--panel); border:1px solid var(--border);
    border-radius:16px; padding:1.2rem 1.35rem; text-decoration:none; color:var(--fg);
    box-shadow:var(--shadow); transition:box-shadow .2s ease, transform .2s ease; }
  .hub-card:hover { box-shadow:var(--shadow-lg); transform:translateY(-2px); color:var(--fg); }
  .hub-card h2 { margin:0 0 .5rem; border:0; padding:0; font-size:1.1rem; }
  .hub-card p { color:var(--muted); font-size:.92rem; margin:0 0 .7rem; }
  .hub-card .meta { color:var(--muted); font-size:.78rem; font-family:var(--mono); }
</style>
</head>
<body>
  <div class="hub">
    <h1>Documentation</h1>
    <p class="subtitle" style="color:var(--muted);margin:0 0 1.8rem">
      Les corpus servis par pl4y.store, unifies sous le meme rendu.
    </p>
    <div class="hub-grid">
${cards}
    </div>
  </div>
</body>
</html>
`;
  mkdirSync(join(PUBLIC, "docs"), { recursive: true });
  writeFileSync(join(PUBLIC, "docs", "index.html"), html);
}

/* ---------------------------------------------------------------- pipeline - */

const targets = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const wanted = targets.length ? targets : Object.keys(SOURCES);

step("1. collect");
const runnable = [];
for (const k of wanted) {
  const s = SOURCES[k];
  if (!s) { warn(`cible inconnue : ${k}`); continue; }
  if (!existsSync(s.src)) { warn(`source absente : ${s.src} — ${k} saute`); continue; }
  log(`  ${k.padEnd(10)} ${s.src}`);
  runnable.push(k);
}

step("2. render");
const built = [];
for (const k of runnable) {
  log(`  [${k}]`);
  try {
    if (SOURCES[k].build(SOURCES[k])) built.push(k);
    else warn(`${k} : rien de construit`);
  } catch (e) {
    warn(`${k} a echoue : ${e.message.split("\n")[0]}`);
  }
}

step("3. dedupe");
dedupe();

step("4. skin");
for (const k of built) {
  const r = skin(SOURCES[k].out);
  log(`  ${k.padEnd(10)} ${r.skinned}/${r.files} pages`);
}

step("5. index");
writeHub(built);
skin(join(PUBLIC, "docs"));

const total = walk(PUBLIC);
const size = total.reduce((a, f) => a + statSync(f).size, 0);
log(
  `\n\x1b[1m✓ public/ : ${total.length} fichiers, ${(size / 1048576).toFixed(1)} Mo` +
  ` — sections : ${built.join(", ") || "aucune"}\x1b[0m`,
);
