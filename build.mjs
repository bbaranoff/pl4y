#!/usr/bin/env node
// Regenere src/worker.js a partir de la source de verite (setup_osmo_egprs.sh)
// et du template worker.template.js. Aucune dependance externe (builtins Node).
//
// Lance automatiquement par `wrangler deploy` via la section [build] de
// wrangler.toml — donc en local, en CI GitHub Actions et sur Cloudflare
// Workers Builds, le base64 est toujours a jour.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SCRIPT = "setup_osmo_egprs.sh";
const PS_SCRIPT = "setup_osmo_egprs.ps1";
const MOTO_JPG = "assets/motorola_c123.jpg";
const DEMO_JPG = "assets/screencast_demo.jpg";
const ISO_GIF = "assets/demo_iso.gif";
const LAUNCH_GIF = "assets/demo_launch.gif";
const CONSOLE_GIF = "assets/demo_console.gif";
const TEMPLATE = "worker.template.js";
const OUT = "src/worker.js";

const b64 = readFileSync(SCRIPT).toString("base64");
const psB64 = readFileSync(PS_SCRIPT).toString("base64");
const motoB64 = readFileSync(MOTO_JPG).toString("base64");
const demoB64 = readFileSync(DEMO_JPG).toString("base64");
const isoGifB64 = readFileSync(ISO_GIF).toString("base64");
const launchGifB64 = readFileSync(LAUNCH_GIF).toString("base64");
const consoleGifB64 = readFileSync(CONSOLE_GIF).toString("base64");
const tpl = readFileSync(TEMPLATE, "utf8");

for (const ph of [
  "__SCRIPT_B64__",
  "__PS_SCRIPT_B64__",
  "__MOTO_JPG_B64__",
  "__DEMO_JPG_B64__",
  "__ISO_GIF_B64__",
  "__LAUNCH_GIF_B64__",
  "__CONSOLE_GIF_B64__",
]) {
  if (!tpl.includes(ph)) {
    console.error(`[build] ERREUR: placeholder ${ph} introuvable dans ${TEMPLATE}`);
    process.exit(1);
  }
}

mkdirSync("src", { recursive: true });
writeFileSync(
  OUT,
  tpl
    .replace("__SCRIPT_B64__", b64)
    .replace("__PS_SCRIPT_B64__", psB64)
    .replace("__MOTO_JPG_B64__", motoB64)
    .replace("__DEMO_JPG_B64__", demoB64)
    .replace("__ISO_GIF_B64__", isoGifB64)
    .replace("__LAUNCH_GIF_B64__", launchGifB64)
    .replace("__CONSOLE_GIF_B64__", consoleGifB64),
);

console.log(
  `[build] ${OUT} genere — bash ${b64.length} o / powershell ${psB64.length} o / photo C123 ${motoB64.length} o / capture demo ${demoB64.length} o / gifs iso ${isoGifB64.length} launch ${launchGifB64.length} console ${consoleGifB64.length} o base64`,
);
