// pl4y.store - Cloudflare Worker
// Sert le MEME contenu de deux facons :
//   - navigateur (Accept: text/html)  -> page HTML lisible (affiche le script)
//   - curl/wget (pipe)                -> script bash brut en text/plain
//
// Usage cote client :
//   bash <(wget -qO- pl4y.store)
//   wget -qO- pl4y.store | bash
//   curl -fsSL pl4y.store | bash
//
// Source unique du script : SCRIPT_B64 (base64) -> evite tout enfer d'echappement.

const SCRIPT_B64 = "__SCRIPT_B64__";

// Decode base64 -> texte UTF-8 (le script est ASCII, mais on gere proprement).
function decodeScript() {
  const bin = atob(SCRIPT_B64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

// Decide si on sert du HTML (navigateur) ou le script brut (CLI / pipe).
function wantsHTML(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const accept = (request.headers.get("accept") || "").toLowerCase();
  // Outils en ligne de commande -> toujours le script.
  if (/curl|wget|libfetch|libcurl|httpie|powershell|python-requests|go-http/.test(ua)) {
    return false;
  }
  // Navigateur : demande explicitement du HTML.
  if (accept.includes("text/html")) return true;
  // Par defaut on sert le script : un client bizarre qui pipe ne casse jamais.
  return false;
}

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHTML(script) {
  const esc = htmlEscape(script);
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
  h1 { font-size:1.6rem; margin:0 0 .2rem; }
  h1 .dot { color:var(--green); }
  .sub { color:var(--muted); margin:0 0 1.8rem; font-size:.95rem; }
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
  <h1>pl4y<span class="dot">.</span>store</h1>
  <p class="sub">Installeur osmo_egprs &mdash; cur de reseau GSM/EGPRS multi-operateur, containerise.</p>

  <div class="card">
    <h2>Installation rapide</h2>
    <div class="cmd"><code id="c1">bash &lt;(wget -qO- pl4y.store)</code><button data-c="c1">copier</button></div>
    <div class="cmd"><code id="c2">curl -fsSL pl4y.store | bash</code><button data-c="c2">copier</button></div>
    <div class="cmd"><code id="c3">wget -qO- pl4y.store | bash</code><button data-c="c3">copier</button></div>
  </div>

  <div class="warn">
    &#9888;&#65039; Tu t'appretes a executer un script telecharge. C'est exactement
    pour ca que cette page existe : lis la source ci-dessous <em>avant</em> de la piper dans bash.
  </div>

  <div class="card">
    <h2>Source du script</h2>
    <details open>
      <summary>Afficher / masquer setup_osmo_egprs.sh</summary>
      <pre><code>${esc}</code></pre>
    </details>
  </div>

  <footer>
    Depot : <a href="https://github.com/bbaranoff/osmo_egprs">github.com/bbaranoff/osmo_egprs</a>
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
    const script = decodeScript();

    if (wantsHTML(request)) {
      return new Response(renderHTML(script), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // CLI / pipe : script brut.
    return new Response(script, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
