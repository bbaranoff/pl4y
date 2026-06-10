// pl4y.store - Cloudflare Worker
// Sert le MEME contenu de trois facons a la meme URL :
//   - navigateur (Accept: text/html)  -> page HTML lisible (affiche les scripts)
//   - curl/wget (pipe)                -> script bash brut en text/plain
//   - PowerShell (irm/iwr)            -> script PowerShell brut en text/plain
//
// Usage cote client :
//   bash <(wget -qO- pl4y.store)     # Linux / macOS / WSL
//   wget -qO- pl4y.store | bash
//   curl -fsSL pl4y.store | bash
//   irm pl4y.store | iex             # Windows 11 (installe WSL + Ubuntu)
//
// Sources uniques : SCRIPT_B64 (bash) et PS_SCRIPT_B64 (PowerShell), en base64
// -> evite tout enfer d'echappement.

const SCRIPT_B64 = "__SCRIPT_B64__";
const PS_SCRIPT_B64 = "__PS_SCRIPT_B64__";

// Decode base64 -> texte UTF-8 (les scripts sont ASCII, mais on gere proprement).
function decodeB64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
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

function renderHTML(script, psScript) {
  const esc = htmlEscape(script);
  const psEsc = htmlEscape(psScript);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pl4y.store - osmo_egprs installer</title>
<style>
  :root {
    --bg:#0d1117; --panel:#161b22; --border:#30363d;
    --fg:#e6edf3; --muted:#8b949e; --accent:#58a6ff;
    --green:#3fb950; --yellow:#d29922;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--bg); color:var(--fg);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    line-height:1.5; padding:2rem 1rem;
  }
  .wrap { max-width:920px; margin:0 auto; }
  .brand { display:flex; align-items:center; gap:.6rem; margin:0 0 .2rem; }
  .brand .phone { flex:none; width:34px; height:34px; color:var(--accent); }
  h1 { font-size:1.6rem; margin:0; }
  h1 .dot { color:var(--green); }
  .sub { color:var(--muted); margin:0 0 1.8rem; font-size:.95rem; }
  .moto {
    display:flex; gap:1rem; align-items:center; flex-wrap:wrap;
  }
  .moto img {
    width:160px; max-width:40%; border-radius:8px; border:1px solid var(--border);
    background:#010409; display:block;
  }
  .moto .cap { color:var(--muted); font-size:.9rem; }
  .moto .cap strong { color:var(--fg); }
  .card {
    background:var(--panel); border:1px solid var(--border);
    border-radius:10px; padding:1rem 1.2rem; margin-bottom:1.2rem;
  }
  .card h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.08em;
             color:var(--muted); margin:0 0 .7rem; }
  .cmd {
    display:flex; align-items:center; gap:.6rem; background:#010409;
    border:1px solid var(--border); border-radius:7px;
    padding:.6rem .8rem; margin:.4rem 0; font-family:var(--mono);
    font-size:.9rem; overflow-x:auto;
  }
  .cmd code { color:var(--green); white-space:pre; flex:1; }
  .cmd button {
    flex:none; background:var(--border); color:var(--fg); border:0;
    border-radius:5px; padding:.3rem .6rem; font-size:.78rem;
    cursor:pointer; font-family:inherit;
  }
  .cmd button:hover { background:#3d444d; }
  .cmd button.ok { background:var(--green); color:#03210e; }
  .warn {
    border-left:3px solid var(--yellow); background:rgba(210,153,34,.08);
    padding:.7rem 1rem; border-radius:0 7px 7px 0; color:#e9d8a6;
    font-size:.9rem; margin-bottom:1.2rem;
  }
  details { margin-top:.4rem; }
  summary { cursor:pointer; color:var(--accent); font-size:.92rem; user-select:none; }
  pre {
    background:#010409; border:1px solid var(--border); border-radius:8px;
    padding:1rem; overflow-x:auto; margin-top:.8rem;
    font-family:var(--mono); font-size:.82rem; line-height:1.45;
    color:#c9d1d9; max-height:70vh;
  }
  a { color:var(--accent); }
  footer { color:var(--muted); font-size:.82rem; margin-top:1.5rem; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
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
  <p class="sub">Installeur osmo_egprs &mdash; cur de reseau GSM/EGPRS multi-operateur, containerise.</p>

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
    <h2>Linux / macOS / WSL (bash)</h2>
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
      <strong>build-iso</strong>, <strong>download</strong> ou <strong>start</strong>.
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

  <footer>
    Depot : <a href="https://github.com/bbaranoff/osmo_egprs">github.com/bbaranoff/osmo_egprs</a>
    &middot; <a href="https://osmocom.org" target="_blank" rel="noopener">osmocom.org</a>
  </footer>
</div>
<script>
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
    const kind = pickKind(request);

    if (kind === "html") {
      return new Response(renderHTML(script, psScript), {
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
