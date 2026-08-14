#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * unify.mjs — workflow d'unification du contenu servi par pl4y.store
 *
 * Prend les trois depots sources, les rend chacun avec sa chaine native, puis
 * unifie le resultat dans un seul arbre statique `public/` : meme skin, meme
 * navigation, meme bascule de theme, sans doublon.
 *
 *   /calypso/    <- ~/qemu-calypso          (Quarto, bundle du depot)
 *   /sdr/        <- ~/software-defined-radio (Sphinx / MyST / RTD)
 *   /bbaranoff/  <- ~/bbaranoff.github.io    (Jekyll -> pandoc)
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
};

/* ------------------------------------------------------- 2. render : calypso */

function buildCalypso(s) {
  const work = join(DOCS, "calypso-site");
  const site = join(work, "_site");

  if (FORCE || !existsSync(join(work, "_quarto.yml"))) {
    if (!existsSync(join(s.src, "full-qmd.sh"))) {
      warn(`full-qmd.sh introuvable dans ${s.src} — etape sautee`);
      return false;
    }
    log("  generation du bundle Quarto (full-qmd.sh, mode site)…");
    sh("./full-qmd.sh", [], {
      cwd: s.src,
      env: { ...process.env, MODE: "site", OUTDIR: work, SPLIT_KB: "350" },
    });
    patchQuartoConfig(join(work, "_quarto.yml"));
  }

  if (FORCE || !existsSync(site)) {
    if (!have("quarto")) { warn("quarto absent — /calypso non reconstruit"); return existsSync(site); }
    log("  quarto render (peut prendre quelques minutes)…");
    sh("quarto", ["render"], { cwd: work, stdio: "inherit" });
  }
  if (!existsSync(site)) return false;

  copyTree(site, s.out);
  // Les fichiers sources demandes explicitement, servis a cote du rendu.
  for (const f of ["sketchy.css", "sk-filter.html"]) {
    const p = join(DOCS, "calypso", f);
    if (existsSync(p)) cpSync(p, join(s.out, f));
  }
  return true;
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
  log(`  ${n} pages markdown rendues, ${keptHtml.length} html conserves, ${assets.length} medias`);
  return true;
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
  const cards = Object.entries(SOURCES)
    .filter(([k]) => built.includes(k))
    .map(([k, s]) => {
      const n = walk(s.out).filter((p) => /\.html?$/i.test(p)).length;
      return `      <a class="hub-card" href="/${k}/">
        <h2>${s.title}</h2>
        <p>${s.blurb}</p>
        <span class="meta">${n} pages &middot; /${k}/</span>
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
      Les trois corpus servis par pl4y.store, unifies sous le meme rendu.
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
