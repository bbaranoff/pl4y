#!/usr/bin/env node
// skin.mjs — applique le skin pl4y a un arbre de HTML deja genere.
//
// Injecte dans chaque page :
//   - <head>  : le script de theme (anti-flash) + <link> vers pl4y-doc.css
//   - <body>  : la barre de navigation pl4y + la bascule clair/sombre
//
// Le CSS est copie a la racine de l'arbre et reference en chemin relatif, donc
// l'arbre reste servable tel quel par Workers Static Assets.
//
// Usage : node docs/skin.mjs <dir> [--title-prefix "..."]

import { readdirSync, readFileSync, writeFileSync, statSync, copyFileSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";

const THEME_DIR = new URL("./theme/", import.meta.url).pathname;
const CSS_NAME = "pl4y-doc.css";
const MARKER = "<!-- pl4y-skin v1 -->";

const HEAD = readFileSync(join(THEME_DIR, "pl4y-head.html"), "utf8");
const BAR = readFileSync(join(THEME_DIR, "pl4y-bar.html"), "utf8");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && /\.html?$/i.test(e.name)) out.push(p);
  }
  return out;
}

export function skin(root) {
  copyFileSync(join(THEME_DIR, CSS_NAME), join(root, CSS_NAME));
  const files = walk(root);
  let n = 0;
  for (const f of files) {
    let html = readFileSync(f, "utf8");
    if (html.includes(MARKER)) continue; // deja skinne
    const rel = relative(dirname(f), root).split(sep).join("/");
    const href = (rel ? rel + "/" : "") + CSS_NAME;
    const inject = `\n${MARKER}\n${HEAD}<link rel="stylesheet" href="${href}">\n`;

    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, inject + "</head>");
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, (m) => `${m}\n<head>${inject}</head>`);
    } else {
      html = inject + html;
    }

    if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${BAR}`);
    } else {
      html = BAR + html;
    }

    writeFileSync(f, html);
    n++;
  }
  return { files: files.length, skinned: n };
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).pop());
if (invokedDirectly || process.argv[1]?.endsWith("skin.mjs")) {
  const root = process.argv[2];
  if (!root || !statSync(root).isDirectory()) {
    console.error("usage: node docs/skin.mjs <dir>");
    process.exit(1);
  }
  const r = skin(root);
  console.log(`[skin] ${root} — ${r.skinned}/${r.files} pages skinnees`);
}
