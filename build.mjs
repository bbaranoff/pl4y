#!/usr/bin/env node
// Regenere src/worker.js a partir de la source de verite (setup_osmo_egprs.sh)
// et du template worker.template.js. Aucune dependance externe (builtins Node).
//
// Lance automatiquement par `wrangler deploy` via la section [build] de
// wrangler.toml — donc en local, en CI GitHub Actions et sur Cloudflare
// Workers Builds, le base64 est toujours a jour.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SCRIPT = "setup_osmo_egprs.sh";
const TEMPLATE = "worker.template.js";
const OUT = "src/worker.js";

const b64 = readFileSync(SCRIPT).toString("base64");
const tpl = readFileSync(TEMPLATE, "utf8");

if (!tpl.includes("__SCRIPT_B64__")) {
  console.error(`[build] ERREUR: placeholder __SCRIPT_B64__ introuvable dans ${TEMPLATE}`);
  process.exit(1);
}

mkdirSync("src", { recursive: true });
writeFileSync(OUT, tpl.replace("__SCRIPT_B64__", b64));

console.log(`[build] ${OUT} genere — ${b64.length} octets base64 depuis ${SCRIPT}`);
