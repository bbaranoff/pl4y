// pl4y.store - Cloudflare Worker
// Sert le MEME contenu de trois facons a la meme URL :
//   - navigateur (Accept: text/html)  -> page HTML lisible (affiche les scripts)
//   - curl/wget (pipe)                -> script bash brut en text/plain
//   - PowerShell (irm/iwr)            -> script PowerShell brut en text/plain
//
// Usage cote client :
//   bash <(wget -qO- pl4y.store)     # Linux / WSL
//   wget -qO- pl4y.store | bash
//   curl -fsSL pl4y.store | bash
//   irm pl4y.store | iex             # Windows 11 (installe WSL + Ubuntu)
//
// Sources uniques : SCRIPT_B64 (bash) et PS_SCRIPT_B64 (PowerShell), en base64
// -> evite tout enfer d'echappement.

const SCRIPT_B64 = "__SCRIPT_B64__";
const PS_SCRIPT_B64 = "__PS_SCRIPT_B64__";

// GIFs (extraits du screencast d'install) servis via /m/*.gif.
const ISO_GIF_B64 = "__ISO_GIF_B64__";
const LAUNCH_GIF_B64 = "__LAUNCH_GIF_B64__";
const CONSOLE_GIF_B64 = "__CONSOLE_GIF_B64__";
const MEDIA = {
  "/m/iso.gif": ISO_GIF_B64,
  "/m/launch.gif": LAUNCH_GIF_B64,
  "/m/console.gif": CONSOLE_GIF_B64,
};

// Decode base64 -> texte UTF-8 (les scripts sont ASCII, mais on gere proprement).
function decodeB64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

// Decode base64 -> octets bruts (pour servir les GIFs binaires).
function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Decide quoi servir : "html" (navigateur), "ps" (PowerShell) ou "bash" (CLI).
function pickKind(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const accept = (request.headers.get("accept") || "").toLowerCase();
  // PowerShell (irm/iwr) -> script PowerShell, AVANT le test HTML car son
  // User-Agent contient "Mozilla/5.0 ... WindowsPowerShell|PowerShell".
  if (/powershell/.test(ua)) return "ps";
  // Autres outils en ligne de commande -> script bash.
  if (/curl|wget|libfetch|libcurl|httpie|python-requests|go-http/.test(ua)) {
    return "bash";
  }
  // Navigateur : demande explicitement du HTML.
  if (accept.includes("text/html")) return "html";
  // Par defaut on sert le bash : un client bizarre qui pipe ne casse jamais.
  return "bash";
}

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderPage(script, psScript) {
  const esc = htmlEscape(script);
  const psEsc = htmlEscape(psScript);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pl4y.store &mdash; installeur osmo_egprs + wiki</title>
<style>
  :root {
    --bg:#0d1117; --panel:#161b22; --border:#30363d;
    --fg:#e6edf3; --muted:#8b949e; --accent:#58a6ff;
    --green:#3fb950; --yellow:#d29922; --red:#f85149;
    --code-bg:#010409; --code-fg:#c9d1d9; --btn-bg:#30363d; --btn-hover:#3d444d;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  :root[data-theme="light"] {
    --bg:#ffffff; --panel:#f6f8fa; --border:#d0d7de;
    --fg:#1f2328; --muted:#59636e; --accent:#0969da;
    --green:#1a7f37; --yellow:#9a6700; --red:#cf222e;
    --code-bg:#f6f8fa; --code-fg:#1f2328; --btn-bg:#eaeef2; --btn-hover:#d0d7de;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--bg); color:var(--fg);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    line-height:1.6; padding:2rem 1rem;
  }
  .wrap { max-width:920px; margin:0 auto; }
  .top { display:flex; align-items:baseline; justify-content:space-between;
         gap:1rem; flex-wrap:wrap; margin-bottom:.4rem; }
  h1 { font-size:1.7rem; margin:0; }
  h1 .dot { color:var(--green); }
  .home { font-size:.9rem; }
  .lead { color:var(--muted); margin:.2rem 0 1.6rem; }
  h2 { font-size:1.25rem; margin:2.2rem 0 .6rem; padding-top:.6rem;
       border-top:1px solid var(--border); scroll-margin-top:1rem; }
  h3 { font-size:1.02rem; margin:1.4rem 0 .4rem; color:var(--accent); }
  a { color:var(--accent); }
  p, li { color:var(--fg); }
  code {
    font-family:var(--mono); font-size:.86em; background:var(--code-bg);
    border:1px solid var(--border); border-radius:4px; padding:.05rem .35rem;
    color:var(--code-fg);
  }
  pre {
    background:var(--code-bg); border:1px solid var(--border); border-radius:8px;
    padding:1rem; overflow-x:auto; font-family:var(--mono); font-size:.82rem;
    line-height:1.5; color:var(--code-fg);
  }
  pre code { background:none; border:0; padding:0; }
  .toc {
    background:var(--panel); border:1px solid var(--border);
    border-radius:10px; padding:1rem 1.2rem 1rem 2.2rem; margin:0 0 1.4rem;
  }
  .toc h2 { border:0; margin:0 0 .4rem -.7rem; font-size:.8rem;
            text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
            padding:0; }
  .toc li { margin:.15rem 0; }
  table {
    border-collapse:collapse; width:100%; margin:.8rem 0; font-size:.9rem;
    display:block; overflow-x:auto;
  }
  th, td { border:1px solid var(--border); padding:.45rem .7rem; text-align:left; }
  th { background:var(--panel); color:var(--fg); }
  td code { white-space:nowrap; }
  .note {
    border-left:3px solid var(--accent); background:rgba(88,166,255,.08);
    padding:.7rem 1rem; border-radius:0 7px 7px 0; margin:1rem 0;
  }
  .warn {
    border-left:3px solid var(--yellow); background:rgba(210,153,34,.08);
    padding:.7rem 1rem; border-radius:0 7px 7px 0; color:#e9d8a6; margin:1rem 0;
  }
  .ascii { font-size:.78rem; }
  .shot { width:100%; height:auto; display:block; border-radius:8px;
          border:1px solid var(--border); background:var(--code-bg); }
  figure.shot-fig { margin:1rem 0 0; }
  figure.shot-fig figcaption { color:var(--muted); font-size:.85rem; margin-top:.5rem; }
  .dl-box { background:var(--panel); border:1px solid var(--border);
            border-radius:10px; padding:1rem 1.2rem; margin:0 0 1.4rem;
            display:flex; flex-wrap:wrap; gap:.7rem; align-items:center; }
  .dl-box .dl-label { color:var(--muted); font-size:.8rem; text-transform:uppercase;
            letter-spacing:.08em; width:100%; margin-bottom:.2rem; }
  .dl-btn { display:inline-flex; align-items:center; gap:.5rem; background:var(--green);
            color:#03210e; font-weight:600; text-decoration:none; padding:.55rem .9rem;
            border-radius:7px; font-size:.92rem; }
  .dl-btn:hover { filter:brightness(1.08); }
  .dl-btn.alt { background:var(--accent); color:#04121f; }
  .dl-box .hint { width:100%; color:var(--muted); font-size:.82rem; margin:.2rem 0 0; }
  footer { color:var(--muted); font-size:.82rem; margin-top:2.4rem;
           border-top:1px solid var(--border); padding-top:1rem; }
  .theme-toggle {
    position:fixed; top:1rem; right:1rem; z-index:10;
    background:var(--panel); color:var(--fg); border:1px solid var(--border);
    border-radius:999px; padding:.4rem .7rem; font-size:.85rem; cursor:pointer;
    font-family:inherit; line-height:1;
  }
  .theme-toggle:hover { background:var(--btn-hover); }
  /* --- accueil (fusion home + wiki) --- */
  .brand { display:flex; align-items:center; gap:.6rem; margin:0 0 .2rem; }
  .brand .phone { flex:none; width:34px; height:34px; color:var(--accent); }
  .sub { color:var(--muted); margin:0 0 1.8rem; font-size:.95rem; }
  .moto { display:flex; gap:1rem; align-items:center; flex-wrap:nowrap; }
  .moto img { flex:none; width:160px; height:auto; aspect-ratio:500 / 667;
    object-fit:contain; margin-left:1.5rem; border-radius:8px;
    border:1px solid var(--border); background:var(--code-bg); display:block; }
  .moto .cap { color:var(--muted); font-size:.9rem; }
  .moto .cap strong { color:var(--fg); }
  .card { background:var(--panel); border:1px solid var(--border);
    border-radius:10px; padding:1rem 1.2rem; margin-bottom:1.2rem; }
  .card h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.08em;
    color:var(--muted); margin:0 0 .7rem; border:0; padding:0; }
  .cmd { display:flex; align-items:center; gap:.6rem; background:var(--code-bg);
    border:1px solid var(--border); border-radius:7px; padding:.6rem .8rem;
    margin:.4rem 0; font-family:var(--mono); font-size:.9rem; overflow-x:auto; }
  .cmd code { color:var(--green); white-space:pre; flex:1; border:0; background:none; padding:0; }
  .cmd button { flex:none; background:var(--btn-bg); color:var(--fg); border:0;
    border-radius:5px; padding:.3rem .6rem; font-size:.78rem; cursor:pointer; font-family:inherit; }
  .cmd button:hover { background:var(--btn-hover); }
  .cmd button.ok { background:var(--green); color:#03210e; }
  details { margin-top:.4rem; }
  summary { cursor:pointer; color:var(--accent); font-size:.92rem; user-select:none; }
  details pre { max-height:70vh; }
</style>
<script>
  (function () {
    try {
      var t = localStorage.getItem("pl4y-theme") || "dark";
      document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  })();
</script>
</head>
<body>
<button class="theme-toggle" type="button" aria-label="Basculer le theme clair / sombre">&#127769; Theme</button>
<div class="wrap" id="top">  <div class="brand">
    <svg class="phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
         stroke-linecap="round" stroke-linejoin="round" aria-label="Telephone 2G" role="img">
      <!-- antenne -->
      <line x1="17" y1="2.5" x2="17" y2="6"/>
      <!-- corps candybar -->
      <rect x="6" y="4" width="12" height="18" rx="2"/>
      <!-- ecran -->
      <rect x="8" y="6" width="8" height="5" rx=".5"/>
      <!-- barres de reseau 2G -->
      <line x1="9.5" y1="9.5" x2="9.5" y2="8.5"/>
      <line x1="11.5" y1="9.5" x2="11.5" y2="7.7"/>
      <line x1="13.5" y1="9.5" x2="13.5" y2="6.9"/>
      <!-- clavier -->
      <circle cx="9.5" cy="14" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="14" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="14" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="9.5" cy="16.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="16.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="9.5" cy="19" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="19" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="19" r=".6" fill="currentColor" stroke="none"/>
    </svg>
    <h1>pl4y<span class="dot">.</span>store</h1>
  </div>
  <p class="sub">Installeur osmo_egprs &mdash; cur de reseau GSM/EGPRS multi-operateur, containerise.
     &mdash; <a href="#wiki">&#128214; Wiki QEMU / osmo_egprs / EGPRS</a></p>

  <div class="card">
    <h2>Materiel de reference</h2>
    <div class="moto">
      <img src="data:image/jpeg;base64,__MOTO_JPG_B64__"
           alt="Motorola C123 (chipset TI Calypso) sous OsmocomBB, scan DCS a l'ecran"
           loading="lazy" width="500" height="667">
      <p class="cap">
        <strong>Motorola C123</strong> &mdash; combine GSM 2G a chipset TI Calypso,
        la reference historique pour <a href="https://osmocom.org" target="_blank" rel="noopener">OsmocomBB</a>
        et l'experimentation reseau. Ici en plein scan de spectre.
      </p>
    </div>
  </div>

  <div class="card">
    <h2>Linux / WSL (bash)</h2>
    <div class="cmd"><code id="c1">bash &lt;(wget -qO- pl4y.store)</code><button data-c="c1">copier</button></div>
    <div class="cmd"><code id="c2">curl -fsSL pl4y.store | bash</code><button data-c="c2">copier</button></div>
    <div class="cmd"><code id="c3">wget -qO- pl4y.store | bash</code><button data-c="c3">copier</button></div>
  </div>

  <div class="card">
    <h2>Windows 11 (PowerShell &mdash; installe WSL + Ubuntu)</h2>
    <div class="cmd"><code id="p1">irm pl4y.store | iex</code><button data-c="p1">copier</button></div>
    <div class="cmd"><code id="p2">iwr -useb pl4y.store | iex</code><button data-c="p2">copier</button></div>
    <p class="sub" style="margin:.6rem 0 0">
      Ouvre <strong>PowerShell</strong> et colle la commande : elle installe WSL 2 + Ubuntu,
      cree ton utilisateur, puis te laisse choisir <strong>build</strong>,
      <strong>build-iso</strong> <em>(Linux only, pas Windows)</em>, <strong>download</strong> ou <strong>start</strong>.
      Pour sauter le menu :
      <code>$env:OSMO_MODE="download"; irm pl4y.store | iex</code>
    </p>
  </div>

  <div class="warn">
    &#9888;&#65039; Tu t'appretes a executer un script telecharge. C'est exactement
    pour ca que cette page existe : lis la source ci-dessous <em>avant</em> de la piper dans bash ou PowerShell.
  </div>

  <div class="card">
    <h2>Source du script bash</h2>
    <details open>
      <summary>Afficher / masquer setup_osmo_egprs.sh</summary>
      <pre><code>${esc}</code></pre>
    </details>
  </div>

  <div class="card">
    <h2>Source du script PowerShell</h2>
    <details>
      <summary>Afficher / masquer setup_osmo_egprs.ps1</summary>
      <pre><code>${psEsc}</code></pre>
    </details>
  </div>


  <h2 id="wiki">Wiki &mdash; documentation technique</h2>
  <p class="lead">
    Documentation technique de la plateforme <strong>osmo_egprs</strong> : un cur de
    reseau GSM/EGPRS multi-operateur entierement containerise, avec emulation
    optionnelle du baseband <strong>TI Calypso</strong> (Motorola C123) via le fork
    <strong>bbaranoff/qemu</strong> et le firmware <strong>OsmocomBB</strong> non modifie.
  </p>

  <div class="dl-box" id="telechargements">
    <span class="dl-label">&#11015; Telechargements &mdash; image ISO bootable</span>
    <a class="dl-btn" href="https://github.com/bbaranoff/osmo_egprs/releases/tag/main" target="_blank" rel="noopener">&#128230; Release GitHub (ISO en parties)</a>
    <a class="dl-btn alt" href="https://mega.nz/file/zKBHgaKZ#pMhvkpsjhBPMCTpY-WFcajKhHkYqOLZ53dQCirfEFJU" target="_blank" rel="noopener">&#9729;&#65039; MEGA (ISO complete, 1 fichier)</a>
    <a class="dl-btn" href="http://127.0.0.1:8000/" target="_blank" rel="noopener">&#127760; Serveur local (http://127.0.0.1:8000/)</a>
    <a class="dl-btn" href="https://github.com/bbaranoff/osmo_egprs/releases/tag/test" target="_blank" rel="noopener">&#128295; Release GitHub testing (ISO en parties)</a>
    <a class="dl-btn alt" href="https://mega.nz/file/We5RyaAD#6altKUvrl9rHOSUjYBaV2dBRTeBrLiSS3WJWGxAoLtU" target="_blank" rel="noopener">&#9729;&#65039; MEGA testing (ISO complete, 1 fichier)</a>
    <p class="hint">L'ISO depasse la limite GitHub de 2 Go par fichier : la Release la fournit
       <strong>decoupee en parties</strong> (<code>osmo_egprs.iso.part-00/01</code>, a reassembler +
       verifier <code>osmo_egprs.iso.sha256</code>). Le miroir <strong>MEGA</strong> la fournit en un seul fichier.</p>
  </div>

  <nav class="toc">
    <h2>Sommaire</h2>
    <ol>
      <li><a href="#presentation">Presentation</a></li>
      <li><a href="#demarrage">Demarrage rapide (pl4y.store)</a></li>
      <li><a href="#telechargements">Telechargements (ISO &amp; MEGA)</a></li>
      <li><a href="#virtualbox">Installation via VirtualBox (ISO)</a></li>
      <li><a href="#bugs">Bugs &amp; limites observes</a></li>
      <li><a href="#architecture">Architecture</a></li>
      <li><a href="#composants">Composants</a></li>
      <li><a href="#qemu">QEMU Calypso (PHY_MODE=qemu)</a></li>
      <li><a href="#egprs">GPRS / EGPRS</a></li>
      <li><a href="#ss7">Plan SS7 &amp; point codes</a></li>
      <li><a href="#reseau">Reseaux Docker &amp; numerotation</a></li>
      <li><a href="#sms">SMS &amp; voix</a></li>
      <li><a href="#vty">VTY, ports &amp; supervision</a></li>
      <li><a href="#debug">Debogage</a></li>
      <li><a href="#materiel">Materiel : Motorola C123</a></li>
      <li><a href="#references">References</a></li>
    </ol>
  </nav>

  <h2 id="presentation">1. Presentation</h2>
  <p>
    <strong>osmo_egprs</strong> simule de 1 a 9 operateurs GSM (PLMN) interconnectes
    par signalisation <strong>SS7/IP (M3UA/SCTP)</strong>, en automatisant une
    configuration habituellement faite a la main pendant des semaines. Chaque
    operateur est une pile Osmocom complete dans un conteneur Docker, et les
    operateurs sont relies entre eux par un <strong>Inter-STP</strong> central.
  </p>
  <p>
    La plateforme sert l'enseignement des telecoms, les tests d'interoperabilite et
    la recherche sur les protocoles SS7. En option (<code>PHY_MODE=qemu</code>) elle
    embarque un baseband Calypso emule executant le <em>vrai</em> firmware OsmocomBB,
    sans materiel radio.
  </p>

  <h2 id="demarrage">2. Demarrage rapide (pl4y.store)</h2>
  <p>L'installeur <code>setup_osmo_egprs.sh</code> installe les dependances, clone
     <code>bbaranoff/osmo_egprs</code> puis lance le mode choisi.</p>
  <figure class="shot-fig">
    <img class="shot"
         src="data:image/jpeg;base64,__DEMO_JPG_B64__"
         alt="Console d'operations osmo_egprs en direct : FFT Calypso DSP (ARFCN 514), GRGSM record, deux VTY OsmocomBB envoyant un SMS"
         loading="lazy" width="1280" height="720">
    <figcaption>
      <strong>Le systeme en fonction</strong> &mdash; lance par <code>start-direct.sh</code>
      (launcher natif, no-docker). De gauche a droite : le spectre <strong>FFT du baseband
      Calypso emule</strong> (<code>dsp_iq.cfile</code>, ARFCN 514, Fs 1.083 MHz) et le
      <code>MOBILE.LOG</code> ; le <strong>GRGSM RECORD</strong> (DL1C / DLLAPD) ; et deux
      sessions <strong>VTY OsmocomBB</strong> (<code>op1/bb1</code> sur <code>4247</code>,
      <code>op1/bb2</code> sur <code>4248</code>) ou un SMS part en ligne de commande :
      <code>sms 1 10002 test</code>. Pilote depuis l'<em>Operations Console</em> web (onglets
      Console / FFT, filtre <code>ul, dl, op=1, sctp, rr, sms</code>, panneau OPERATORS
      &mdash; <code>OP1 DCS1800</code>, 2 BTS / 4 MS).
    </figcaption>
  </figure>
  <h3>Linux / WSL (bash)</h3>
  <pre><code>bash &lt;(wget -qO- pl4y.store)     # menu interactif
curl -fsSL pl4y.store | bash
wget  -qO- pl4y.store | bash</code></pre>
  <h3>Windows 11 (PowerShell &mdash; installe WSL 2 + Ubuntu)</h3>
  <pre><code>irm pl4y.store | iex
iwr -useb pl4y.store | iex</code></pre>
  <h3>Modes disponibles</h3>
  <table>
    <tr><th>Mode</th><th>Effet</th></tr>
    <tr><td><code>build</code></td><td>Construit l'image Docker localement (<code>build.sh --no-cache</code>, ~15-20 min).</td></tr>
    <tr><td><code>build-iso</code></td><td>Construit une ISO bootable (<code>build-iso.sh</code>). <strong>Ne fonctionne pas sous Windows</strong> (hote Linux requis).</td></tr>
    <tr><td><code>download</code></td><td>Recupere l'image pre-construite <code>bastienbaranoff/free-bb</code> (rapide).</td></tr>
    <tr><td><code>start</code></td><td>Lance <code>start.sh</code> sur une image deja prete.</td></tr>
  </table>
  <p>Pour sauter le menu : <code>OSMO_MODE=download</code> (PowerShell :
     <code>$env:OSMO_MODE="download"</code>). Refs git par defaut :
     <code>osmo_egprs</code> sur <code>main</code> (<code>OSMO_REF</code>),
     fork <code>qemu</code> sur <code>checkpoint</code> (<code>QEMU_REF</code>).</p>
  <div class="warn">&#9888;&#65039; Vous executez un script telecharge. Lisez la
     source affichee sur la page d'accueil <em>avant</em> de la piper dans bash ou PowerShell.</div>

  <h2 id="virtualbox">Installation via VirtualBox (ISO)</h2>
  <p>Alternative a l'installeur pl4y.store : l'<strong>ISO bootable</strong> (Linux live) tourne
     dans une VM VirtualBox sans rien installer sur l'hote. Liens :
     <a href="#telechargements">Release GitHub / MEGA</a>.</p>

  <h3>1. Recuperer et reassembler l'ISO</h3>
  <pre><code>cat osmo_egprs.iso.part-* &gt; osmo_egprs.iso
sha256sum -c osmo_egprs.iso.sha256        # -&gt; osmo_egprs.iso: Reussi</code></pre>
  <p>Ou l'ISO en un seul fichier via
     <a href="https://mega.nz/file/zKBHgaKZ#pMhvkpsjhBPMCTpY-WFcajKhHkYqOLZ53dQCirfEFJU" target="_blank" rel="noopener"><strong>MEGA</strong></a>.</p>

  <h3>2. Creer la VM</h3>
  <ul>
    <li>VirtualBox &rarr; <strong>Nouvelle</strong> &rarr; <code>Linux</code> / <code>Ubuntu (64-bit)</code>.</li>
    <li><strong>RAM</strong> : 2048 Mo mini, <strong>3072-4096 Mo conseilles</strong>.</li>
    <li><strong>CPU</strong> : 1 mini, 2+ conseilles. <strong>EFI desactive.</strong></li>
    <li><strong>Stockage</strong> &rarr; controleur optique &rarr; attacher <code>osmo_egprs.iso</code>, booter dessus (live).</li>
  </ul>
  <figure class="shot-fig">
    <img class="shot" src="/m/iso.gif" alt="Verification sha256 de l'ISO et creation de la VM VirtualBox" loading="lazy">
    <figcaption><strong>Etapes 1-2 en video</strong> (&asymp; 0:57 du screencast) &mdash;
      reassemblage des parties, <code>sha256sum -c</code> &rarr; <code>osmo_egprs.iso: Reussi</code>,
      puis creation de la VM (RAM 2048 Mo, 1 CPU, EFI off).</figcaption>
  </figure>

  <h3>3. Redirection des ports (NAT)</h3>
  <p>Carte reseau en <strong>NAT</strong> : <em>Configuration &rarr; Reseau &rarr; Avance &rarr; Redirection de ports</em>
     (IP invite vide = DHCP) :</p>
  <table>
    <tr><th>Nom</th><th>Proto</th><th>Hote IP</th><th>Hote port</th><th>Invite port</th><th>Usage</th></tr>
    <tr><td>console</td><td>TCP</td><td>127.0.0.1</td><td><code>8000</code></td><td><code>8080</code></td><td>Operations Console (Console / FFT)</td></tr>
    <tr><td>ssh</td><td>TCP</td><td>127.0.0.1</td><td><code>2222</code></td><td><code>22</code></td><td>SSH (root / mdp <code>osmo</code>)</td></tr>
  </table>
  <div class="note">Tout passe par l'<em>Operations Console</em> : hote <code>:8000</code> &rarr; invite <code>:8080</code>
     (console sur <code>http://127.0.0.1:8000</code>). Ajuste selon ton run.</div>

  <h3>4. Demarrer le lab</h3>
  <pre><code>loadkeys fr                  # clavier FR (optionnel)
cd /opt/GSM/osmo_egprs
./start-direct.sh            # lance le lab Calypso/QEMU (A5/1)</code></pre>
  <figure class="shot-fig">
    <img class="shot" src="/m/launch.gif" alt="Banniere start-direct.sh : GSM/EGPRS Multi-PLMN Live System, lancement du launcher natif" loading="lazy">
    <figcaption><strong>Lancement en video</strong> (&asymp; 3:57 du screencast) &mdash;
      banniere <code>start-direct.sh</code> (Dashboard :8080, FFT :8081, Wiki pl4y.store,
      <code>ssh root@&lt;vm&gt;</code> mdp <code>osmo</code>, <code>loadkeys fr</code>) puis demarrage du
      <em>Launcher NATIF (no-docker)</em>.</figcaption>
  </figure>

  <h3>5. Ouvrir le navigateur (cote hote)</h3>
  <ul>
    <li>Console d'operations (Console / FFT) : <a href="http://127.0.0.1:8000" target="_blank" rel="noopener"><code>http://127.0.0.1:8000</code></a></li>
    <li>SSH : <code>ssh -p 2222 root@127.0.0.1</code> (mot de passe <code>osmo</code>)</li>
  </ul>
  <figure class="shot-fig">
    <img class="shot" src="/m/console.gif" alt="Operations Console en direct : FFT Calypso, GRGSM record, deux VTY OsmocomBB envoyant un SMS" loading="lazy">
    <figcaption><strong>Le systeme en marche</strong> (&asymp; 5:58 du screencast) &mdash;
      <em>Operations Console</em> sur <code>http://127.0.0.1:8000</code> : FFT du baseband Calypso
      (ARFCN 514, Fs 1.083 MHz), flux <code>GRGSM RECORD</code> qui defile, et deux VTY OsmocomBB
      (<code>4247</code>/<code>4248</code>) ou part un <code>sms 1 10002 test</code>.</figcaption>
  </figure>

  <h2 id="bugs">Bugs &amp; limites observes</h2>
  <p>Constats tires de la capture du 18/06/2026 (a titre indicatif) :</p>
  <ul>
    <li><strong>ISO &gt; 2 Go</strong> : impossible en un fichier sur la Release GitHub &rarr; decoupee en
        <code>.part-00/01</code> (reassemblage <code>cat</code> + <code>sha256sum -c</code> obligatoires). D'ou le miroir MEGA.</li>
    <li><strong>Derive de timing TDMA</strong> : le flux <code>GRGSM RECORD</code> est sature de
        <code>DL1C NOTICE &hellip; We missed N timers (scheduler_trx.c:427)</code> et
        <code>We were N FN faster/slower than TRX, compensating (scheduler_trx.c:595/608)</code>.
        Le scheduler <code>osmo-bts-trx</code> peine a tenir l'horloge TDMA temps reel dans une VM (pas de clock RT)
        &rarr; desyncs possibles, bursts perdus, SMS/LU intermittents.</li>
    <li><strong>Erreur LAPDm ponctuelle</strong> : une ligne <code>DLLAPD ERROR</code> apparait (erreur L2 transitoire sur l'air emule).</li>
    <li><strong>RAM serree</strong> : la VM tourne a <code>2048 Mo</code> pour Osmocom + QEMU Calypso + grgsm + Wireshark + navigateur. Prevoir 3-4 Go.</li>
    <li><strong>build-iso sous Windows</strong> : ne fonctionne pas (loop devices, debootstrap, grub : hote Linux reel requis). Utiliser l'ISO pre-faite.</li>
  </ul>

  <h2 id="architecture">3. Architecture</h2>
  <h3>Un operateur = une pile Osmocom complete</h3>
  <p>Chaque PLMN tourne dans un seul conteneur, les composants dialoguant en
     <code>127.0.0.1</code> (pas de course reseau Docker interne) :</p>
  <ul>
    <li><strong>BTS</strong> &mdash; interface radio (osmo-bts-trx / faketrx / QEMU)</li>
    <li><strong>BSC</strong> &mdash; gestion des canaux (osmo-bsc)</li>
    <li><strong>MSC</strong> &mdash; controle d'appel (osmo-msc)</li>
    <li><strong>HLR</strong> &mdash; base d'abonnes (osmo-hlr, GSUP)</li>
    <li><strong>MGW</strong> &mdash; media gateway RTP via MGCP (osmo-mgw)</li>
    <li><strong>STP</strong> &mdash; hub SS7 local (osmo-stp)</li>
    <li><strong>Asterisk</strong> &mdash; PABX / pontage d'appels via MNCC</li>
  </ul>
  <h3>Interconnexion multi-PLMN</h3>
  <p>Un <strong>Inter-STP</strong> (point code central <code>0.23.0</code>) route le
     SS7/M3UA entre operateurs. Chaque STP operateur se connecte a l'Inter-STP en
     SCTP sur le port <code>2908</code>.</p>
  <pre class="ascii"><code>          +-------------------+
          |   Inter-STP 0.23.0|
          +----+----+----+----+
        SCTP 2908 |    |
        +---------+    +----------+
        |                         |
  +-----+------+           +------+-----+
  | Operateur 1|           | Operateur 2|
  | STP 1.23.2 |           | STP 2.23.2 |
  | MSC 1.23.1 |           | MSC 2.23.1 |
  | BSC 1.23.3 |           | BSC 2.23.3 |
  +------------+           +------------+</code></pre>

  <h2 id="composants">4. Composants</h2>
  <table>
    <tr><th>Brique</th><th>Role</th></tr>
    <tr><td>Pile Osmocom</td><td>BTS/BSC/MSC/HLR/MGW/STP en userspace, sans radio dediee.</td></tr>
    <tr><td>OsmocomBB</td><td>Firmware <code>layer1.highram.elf</code> compile depuis les sources (cross ARM).</td></tr>
    <tr><td>QEMU Calypso</td><td>Fork <code>bbaranoff/qemu</code> emulant le SoC TI Calypso (ARM7TDMI + DSP C54x).</td></tr>
    <tr><td>Docker</td><td>Images multi-stage ; entrypoint <code>run.sh</code> orchestre via tmux.</td></tr>
    <tr><td>Asterisk + Linphone</td><td>Trunks SIP inter-operateurs et softphones locaux (Linphone A/B).</td></tr>
    <tr><td>Scripts Python</td><td><code>bridge.py</code> (relais bursts), <code>sms-interop-relay.py</code>, utilitaires.</td></tr>
  </table>
  <div class="note">Linphone est configure en client <em>sortant uniquement</em> :
     l'installeur met <code>sip_port</code>/<code>sip_tcp_port</code>/<code>sip_tls_port</code>
     a <code>-1</code> dans <code>linphonerc</code> pour ne pas ouvrir de port d'ecoute SIP.</div>

  <h2 id="qemu">5. QEMU Calypso (PHY_MODE=qemu)</h2>
  <p>Le fork <strong>bbaranoff/qemu</strong> emule le baseband <strong>TI Calypso</strong>
     &mdash; le bicur ARM7TDMI + DSP TMS320C54x present dans le OpenMoko Neo, le
     Compal e88 et le Motorola C123. Il execute le <em>vrai</em> firmware OsmocomBB et
     la <em>vraie</em> ROM DSP, et non un stub.</p>
  <ul>
    <li><strong>Cote ARM</strong> : <code>layer1.highram.elf</code> non modifie, identique au binaire flashe sur materiel reel.</li>
    <li><strong>Cote DSP</strong> : ROM TI authentique (Goertzel / DFT pour la detection de frequence).</li>
    <li><strong>Peripheriques</strong> : chaines TPU &rarr; TSP &rarr; IOTA &rarr; BSP (equivalent du travail des correlateurs physiques).</li>
    <li><strong>Pont reseau</strong> : <code>bridge.py</code> relaie les bursts UDP (ports 5700-5702) entre <code>osmo-bts-trx</code> et le baseband simule ; QEMU fournit l'horloge maitre TDMA sur UDP <code>6700</code>.</li>
    <li><strong>Controle</strong> : la socket L1CTL <code>/tmp/osmocom_l2</code> permet a <code>mobile</code> de piloter la couche radio.</li>
  </ul>
  <p>Cela permet de valider que des binaires identiques fonctionnent a l'identique sur
     materiel et en simulation.</p>
  <h3>Lancement</h3>
  <pre><code># Benchmark deterministe (recommande pour le debogage)
CALYPSO_ICOUNT=off CALYPSO_FBSB_SYNTH=1 ./run.sh

# Chemin DSP reel (variance, ~20% de succes)
CALYPSO_ICOUNT=off CALYPSO_FBSB_SYNTH=0 ./run.sh</code></pre>
  <div class="warn">&#9888;&#65039; Etat (mai 2026) : 26 jalons de test stables PASS.
     Le pipeline atteint la demodulation CCCH apres restauration du miroir memoire
     DSP&rarr;ARM (FBSB), mais cale sur l'ordonnancement de tache
     (<code>d_task_d</code> jamais positionne a <code>DSP_TASK_ALLC</code> = 24),
     bloquant la livraison de <code>L1CTL_DATA_IND</code> au mobile. Un seul MS par
     conteneur : utilisez plusieurs conteneurs pour le multi-MS.</div>

  <h2 id="egprs">6. GPRS / EGPRS</h2>
  <p>Le nom <em>osmo_egprs</em> renvoie au volet paquet (E)GPRS du cur de reseau :
     <strong>GPRS</strong> (General Packet Radio Service, 2.5G) et son extension
     <strong>EGPRS</strong> (Enhanced GPRS / EDGE, 2.75G), qui ajoute la modulation
     <strong>8-PSK</strong> et les schemas de codage <strong>MCS-1 a MCS-9</strong>
     pour augmenter le debit paquet sur l'interface radio.</p>
  <p>Cote Osmocom, la commutation de paquets repose sur :</p>
  <ul>
    <li><strong>osmo-pcu</strong> &mdash; Packet Control Unit, gere l'allocation des canaux PDCH cote BTS.</li>
    <li><strong>osmo-sgsn</strong> &mdash; Serving GPRS Support Node (gestion mobilite/session paquet).</li>
    <li><strong>osmo-ggsn</strong> &mdash; Gateway GPRS Support Node (sortie vers IP, APN).</li>
    <li>Encapsulation <strong>GTP</strong> entre SGSN et GGSN, contexte PDP par abonne.</li>
  </ul>
  <div class="note">Le volet baseband emule (QEMU Calypso) se concentre aujourd'hui sur
     les mecanismes GSM de couche 1 (detection FB/SB, demodulation CCCH, flux
     SDCCH/LU). Le plan paquet (E)GPRS s'opere via la pile Osmocom cote reseau.</div>

  <h2 id="ss7">7. Plan SS7 &amp; point codes</h2>
  <p>Point codes ITU 14 bits au format <code>zone.network.node</code> ; tout est
     genere a l'execution en fonction du numero d'operateur <code>N</code> :</p>
  <table>
    <tr><th>Element</th><th>Point code</th><th>Exemple (N=2)</th></tr>
    <tr><td>Inter-STP</td><td><code>0.23.0</code></td><td><code>0.23.0</code></td></tr>
    <tr><td>MSC operateur N</td><td><code>N.23.1</code></td><td><code>2.23.1</code></td></tr>
    <tr><td>STP operateur N</td><td><code>N.23.2</code></td><td><code>2.23.2</code></td></tr>
    <tr><td>BSC operateur N</td><td><code>N.23.3</code></td><td><code>2.23.3</code></td></tr>
  </table>
  <p>Routing contexts (RCTX) : MSC&rarr;STP = <code>N x 100 + 10</code> ; lien
     Inter-STP = <code>N x 100 + 50</code>. <code>start.sh</code> applique ces formules
     par une passe <code>sed</code> sur les templates, puis ajoute les sections
     PJSIP/dialplan/routes SS7 propres a chaque operateur.</p>

  <h2 id="reseau">8. Reseaux Docker &amp; numerotation</h2>
  <h3>Reseaux</h3>
  <table>
    <tr><th>Reseau</th><th>Plage</th><th>Role</th></tr>
    <tr><td>gsm-inter</td><td><code>172.20.0.0/24</code></td><td>Backbone Inter-STP &amp; interconnexion.</td></tr>
    <tr><td>gsm-net-opN</td><td><code>172.20.N.0/24</code></td><td>Reseau prive par operateur (GSMTAP/GPRS).</td></tr>
  </table>
  <p>IP : Inter-STP <code>172.20.0.10</code> ; operateur N sur backbone
     <code>172.20.0.(10+N)</code> ; prive <code>172.20.N.10</code>.</p>
  <h3>Plan de numerotation</h3>
  <table>
    <tr><th>Plage</th><th>Usage</th></tr>
    <tr><td><code>N0001</code>-<code>N9999</code></td><td>Abonnes de l'operateur N.</td></tr>
    <tr><td><code>100</code>, <code>200</code></td><td>Softphones Linphone A / B.</td></tr>
    <tr><td><code>600</code></td><td>Test d'echo.</td></tr>
    <tr><td><code>9XXXXX</code></td><td>Appels inter-operateurs depuis un softphone.</td></tr>
  </table>
  <p>Le premier chiffre (N) identifie l'operateur ; MSC et dialplan distinguent
     automatiquement local et inter-operateur.</p>

  <h2 id="sms">9. SMS &amp; voix</h2>
  <h3>SMS intra-operateur</h3>
  <pre><code>MS -> BTS -> BSC -> MSC -> HLR (GSUP) -> proto-smsc-daemon -> MS</code></pre>
  <h3>SMS inter-operateur</h3>
  <p><code>sms-interop-relay.py</code> surveille les logs MO, parse le TPDU GSM 03.40,
     fait un <em>longest-prefix match</em> dans <code>sms-routing.conf</code>, envoie un
     JSON en TCP:7890 au relais cible, qui interroge le HLR (VTY) pour la
     correspondance MSISDN&rarr;IMSI puis injecte le MT via <code>proto-smsc-sendmt</code>.</p>
  <h3>Voix</h3>
  <p>Intra : MS &harr; BTS &harr; BSC &harr; MSC &harr; MNCC &harr; Asterisk &harr;
     OsmoMGW (RTP/MGCP). Inter : trunks SIP entre instances Asterisk sur le backbone
     <code>172.20.0.x</code>, routage par premier chiffre compose.</p>

  <h2 id="vty">10. VTY, ports &amp; supervision</h2>
  <table>
    <tr><th>Port telnet</th><th>Composant</th></tr>
    <tr><td><code>4239</code></td><td>OsmoSTP</td></tr>
    <tr><td><code>4242</code></td><td>OsmoBSC</td></tr>
    <tr><td><code>4243</code></td><td>OsmoMGW</td></tr>
    <tr><td><code>4254</code></td><td>OsmoMSC</td></tr>
    <tr><td><code>4258</code></td><td>OsmoHLR</td></tr>
  </table>
  <h3>Commandes VTY utiles</h3>
  <pre><code>show cs7 instance 0 asp      # etat ASP (ACTIVE / DOWN)
show cs7 instance 0 route    # table de routage SS7
subscriber msisdn 10001 sms sender msisdn 10002 send Hello</code></pre>
  <p>Fenetres tmux : <strong>0</strong> faketrx (PHY), <strong>1</strong> mobile (MS
     layer23), <strong>2</strong> Asterisk, <strong>3</strong> SMSC + relais.
     Wireshark capture sur le bridge Docker avec le filtre
     <code>sctp or udp port 4729</code> (GSMTAP).</p>

  <h2 id="debug">11. Debogage</h2>
  <h3>Routes SS7 en PROHIB (injoignable)</h3>
  <ol>
    <li>Verifier que le conteneur Inter-STP tourne.</li>
    <li>Verifier que l'ASP vers l'Inter-STP est <code>ACTIVE</code> (pas <code>DOWN</code>).</li>
    <li>Confirmer que l'IP backbone de l'operateur atteint l'Inter-STP (<code>ping 172.20.0.10</code>).</li>
    <li>Redemarrer le conteneur operateur (contournement d'une course Docker).</li>
    <li>Verifier la presence des routes dynamiques locales MSC/BSC.</li>
  </ol>
  <h3>Divers</h3>
  <ul>
    <li>Bip terminal coupe par l'installeur (blacklist <code>pcspkr</code>/<code>snd_pcsp</code>, <code>bell-style none</code>).</li>
    <li>Demon Docker injoignable : <code>sudo systemctl status docker</code>.</li>
    <li>QEMU : pour des runs reproductibles, preferer <code>CALYPSO_FBSB_SYNTH=1</code>.</li>
  </ul>

  <h2 id="materiel">12. Materiel : Motorola C123</h2>
  <p>Le <strong>Motorola C123</strong> (chipset <strong>TI Calypso</strong>) est le
     combine GSM 2G de reference pour <a href="https://osmocom.org" target="_blank" rel="noopener">OsmocomBB</a>
     et l'experimentation reseau. C'est ce baseband qu'emule le fork QEMU, executant le
     meme firmware <code>layer1.highram.elf</code> que sur le telephone physique.</p>

  <h2 id="references">13. References</h2>
  <ul>
    <li><a href="https://science-integration.org/" target="_blank" rel="noopener">science-integration.org</a> &mdash; integration scientifique / contexte du projet</li>
    <li><a href="https://github.com/bbaranoff/osmo_egprs" target="_blank" rel="noopener">github.com/bbaranoff/osmo_egprs</a> &mdash; plateforme multi-PLMN (source de verite)</li>
    <li><a href="https://github.com/bbaranoff/qemu" target="_blank" rel="noopener">github.com/bbaranoff/qemu</a> &mdash; fork QEMU, emulation Calypso</li>
    <li><a href="https://github.com/bbaranoff/pl4y" target="_blank" rel="noopener">github.com/bbaranoff/pl4y</a> &mdash; ce Worker / installeur (pl4y.store)</li>
    <li><a href="https://osmocom.org" target="_blank" rel="noopener">osmocom.org</a> &mdash; projet Osmocom (OsmocomBB, osmo-bsc/msc/hlr/stp&hellip;)</li>
    <li><a href="https://osmocom.org/projects/baseband/wiki" target="_blank" rel="noopener">OsmocomBB wiki</a> &mdash; firmware baseband &amp; Motorola C123</li>
    <li><a href="https://www.qemu.org/" target="_blank" rel="noopener">qemu.org</a> &mdash; emulateur amont</li>
  </ul>

  <footer>
    <a href="#top">&uarr; Haut de page</a> &middot;
    <a href="https://github.com/bbaranoff/osmo_egprs" target="_blank" rel="noopener">osmo_egprs</a> &middot;
    <a href="https://github.com/bbaranoff/qemu" target="_blank" rel="noopener">qemu</a> &middot;
    <a href="https://github.com/bbaranoff/pl4y" target="_blank" rel="noopener">pl4y</a> &middot;
    <a href="https://osmocom.org" target="_blank" rel="noopener">osmocom.org</a> &middot;
    <a href="https://science-integration.org/" target="_blank" rel="noopener">science-integration.org</a>
  </footer>
</div>
<script>
  (function(){
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    function label(){
      var light = document.documentElement.getAttribute("data-theme") === "light";
      btn.innerHTML = light ? "\u2600\ufe0f Clair" : "\ud83c\udf19 Sombre";
    }
    label();
    btn.addEventListener("click", function(){
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pl4y-theme", next); } catch(e){}
      label();
    });
  })();
  document.querySelectorAll(".cmd button").forEach(function(b){
    b.addEventListener("click", function(){
      var t = document.getElementById(b.dataset.c).textContent;
      navigator.clipboard.writeText(t).then(function(){
        var old = b.textContent;
        b.textContent = "copie !"; b.classList.add("ok");
        setTimeout(function(){ b.textContent = old; b.classList.remove("ok"); }, 1200);
      });
    });
  });
</script>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const script = decodeB64(SCRIPT_B64);
    const psScript = decodeB64(PS_SCRIPT_B64);
    const url = new URL(request.url);

    // Medias binaires (GIFs du screencast d'install), servis bruts + caches.
    if (Object.prototype.hasOwnProperty.call(MEDIA, url.pathname)) {
      return new Response(b64ToBytes(MEDIA[url.pathname]), {
        headers: {
          "content-type": "image/gif",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    // Page unique (accueil + wiki fusionnes). /wiki reste une URL valide et
    // renvoie toujours la page ; sinon HTML pour les navigateurs, script brut
    // pour les clients CLI (curl/wget/PowerShell).
    const kind = pickKind(request);
    const wantsPage =
      url.pathname === "/wiki" || url.pathname === "/wiki/" || kind === "html";
    if (wantsPage) {
      return new Response(renderPage(script, psScript), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // CLI / pipe : script brut (bash ou PowerShell).
    return new Response(kind === "ps" ? psScript : script, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
