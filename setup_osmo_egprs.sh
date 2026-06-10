#!/usr/bin/env bash
#
# setup_osmo_egprs.sh
# Installe les dépendances puis laisse choisir entre :
#   - BUILD     : construction locale de l'image (./build.sh --no-cache)
#   - BUILD-ISO : construction d'une ISO bootable (./build-iso.sh)
#   - DOWNLOAD  : récupération de l'image pré-construite sur Docker Hub
#   - START     : lance directement ./start.sh (ni build ni download)
#
# Conçu pour fonctionner aussi via :
#   bash <(wget -qO- pl4y.store)
#   wget -qO- pl4y.store | bash
#   curl -fsSL pl4y.store | bash
# (pas besoin de lancer le tout en root : sudo est utilise par commande)
#
# Usage :
#   ./setup_osmo_egprs.sh             # menu interactif
#   ./setup_osmo_egprs.sh build       # force le build
#   ./setup_osmo_egprs.sh build-iso   # force la construction de l'ISO
#   ./setup_osmo_egprs.sh download    # force le download
#   ./setup_osmo_egprs.sh start       # lance seulement start.sh
#   ./setup_osmo_egprs.sh --no-deps   # saute l'installation des paquets

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_URL="https://github.com/bbaranoff/osmo_egprs"
REPO_DIR="${OSMO_DIR:-$HOME/osmo_egprs}"
DOCKER_IMAGE="bastienbaranoff/free-bb"
DOCKER_TAG="osmocom-nitb"

# Fichier de conf Linphone dont on veut desactiver les ports d'ecoute SIP.
# Surchargeable : LINPHONE_RC=/chemin/linphonerc ./setup_osmo_egprs.sh
LINPHONE_RC="${LINPHONE_RC:-$HOME/.config/linphone/linphonerc}"

PACKAGES=(
    docker.io iproute2 iptables kmod coreutils procps sudo tmux
    wireshark xterm linphone* pulseaudio pulseaudio-utils
    netcat-openbsd telnet git gawk sed wget
)

# ---------------------------------------------------------------------------
# Couleurs / helpers
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    C_BLUE="\033[1;34m"; C_GREEN="\033[1;32m"; C_YEL="\033[1;33m"
    C_RED="\033[1;31m"; C_RST="\033[0m"
else
    C_BLUE=""; C_GREEN=""; C_YEL=""; C_RED=""; C_RST=""
fi

info()  { echo -e "${C_BLUE}[*]${C_RST} $*"; }
ok()    { echo -e "${C_GREEN}[+]${C_RST} $*"; }
warn()  { echo -e "${C_YEL}[!]${C_RST} $*"; }
err()   { echo -e "${C_RED}[x]${C_RST} $*" >&2; }
die()   { err "$*"; exit 1; }

# Affiche une erreur claire si le script s'arrete en cours de route.
trap 'err "Echec ligne $LINENO (commande : $BASH_COMMAND)"' ERR

# ---------------------------------------------------------------------------
# Elevation de privileges : sudo par commande, pas de re-exec du script.
# -> evite le bug /dev/fd/63 avec sudo bash <(wget ...)
# ---------------------------------------------------------------------------
SUDO=""
SUDO_KEEPALIVE_PID=""
setup_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        SUDO=""
        return
    fi
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
        info "Pas root : les commandes privilegiees passeront par sudo."
        # On demande le mot de passe une bonne fois maintenant (et pas au milieu).
        $SUDO -v || die "sudo a echoue (mot de passe / droits)."
        # Garde le ticket sudo en vie tant que le script tourne.
        ( while true; do sleep 50; $SUDO -n true 2>/dev/null || exit; done ) &
        SUDO_KEEPALIVE_PID=$!
        trap '[ -n "${SUDO_KEEPALIVE_PID:-}" ] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true' EXIT
    else
        die "Ni root ni sudo disponible. Installe sudo ou relance en root."
    fi
}

# ---------------------------------------------------------------------------
# Lecture interactive robuste : lit depuis le terminal meme si stdin est un
# pipe (cas wget -qO- | bash). Echoue proprement si aucun tty.
# ---------------------------------------------------------------------------
prompt() {  # prompt "message" -> renvoie la saisie sur stdout
    local _msg="$1" _ans=""
    if [ -r /dev/tty ]; then
        read -rp "$_msg" _ans </dev/tty
    else
        read -rp "$_msg" _ans
    fi
    printf '%s' "$_ans"
}

# ---------------------------------------------------------------------------
# Parsing des arguments
# ---------------------------------------------------------------------------
MODE=""          # build | build-iso | download | start | "" (=> menu)
INSTALL_DEPS=1

for arg in "$@"; do
    case "$arg" in
        build|BUILD)               MODE="build" ;;
        build-iso|BUILD-ISO|iso|ISO) MODE="build-iso" ;;
        download|DOWNLOAD)         MODE="download" ;;
        start|START)               MODE="start" ;;
        --no-deps)          INSTALL_DEPS=0 ;;
        -h|--help)
            grep '^#' "$0" 2>/dev/null | sed 's/^# \{0,1\}//' | sed '1d'
            exit 0
            ;;
        *) die "Argument inconnu : $arg (voir --help)" ;;
    esac
done

# ---------------------------------------------------------------------------
# 1. Installation des dependances
# ---------------------------------------------------------------------------
install_deps() {
    if ! command -v apt-get >/dev/null 2>&1; then
        warn "apt-get introuvable : distribution non-Debian/Ubuntu ?"
        warn "Installe manuellement : ${PACKAGES[*]}"
        return
    fi
    info "Mise a jour des depots (apt update)..."
    $SUDO apt-get update

    info "Installation des paquets..."
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y "${PACKAGES[@]}"
    ok "Dependances installees."

    # Demarrage du service Docker s'il existe.
    if command -v systemctl >/dev/null 2>&1; then
        $SUDO systemctl enable --now docker 2>/dev/null || true
    else
        $SUDO service docker start 2>/dev/null || true
    fi
}

# ---------------------------------------------------------------------------
# Coupe le bip terminal ("bell"). Sous VirtualBox le bip du tab / des fenetres
# xterm vient du PC speaker emule (module pcspkr / snd_pcsp). On le coupe a la
# racine, plus on neutralise readline (tab-completion), xterm et tmux.
# ---------------------------------------------------------------------------
silence_bell() {
    info "Coupure du bip terminal (bell / pcspkr)..."

    # 1) PC speaker : source #1 du bip sous Linux (et dans une VM VirtualBox).
    #    On decharge le module maintenant + blacklist pour les prochains boots.
    $SUDO modprobe -r pcspkr  2>/dev/null || true
    $SUDO modprobe -r snd_pcsp 2>/dev/null || true
    if [ -d /etc/modprobe.d ]; then
        printf 'blacklist pcspkr\nblacklist snd_pcsp\n' \
            | $SUDO tee /etc/modprobe.d/nobeep.conf >/dev/null
    fi

    # 2) Readline (bash, telnet...) : pas de bip a la completion <Tab>.
    if ! grep -qs 'bell-style none' "$HOME/.inputrc" 2>/dev/null; then
        echo 'set bell-style none' >> "$HOME/.inputrc"
    fi

    # 3) xterm : volume du bell a 0 pour les fenetres ouvertes par start.sh.
    if command -v xrdb >/dev/null 2>&1 && [ -n "${DISPLAY:-}" ]; then
        printf 'XTerm*bellVolume: 0\nXTerm*marginBell: false\n' \
            | xrdb -merge 2>/dev/null || true
    fi

    # 4) tmux : aucune action sonore/visuelle sur bell.
    if command -v tmux >/dev/null 2>&1; then
        if ! grep -qs 'bell-action none' "$HOME/.tmux.conf" 2>/dev/null; then
            printf 'set -g bell-action none\nset -g visual-bell off\n' \
                >> "$HOME/.tmux.conf"
        fi
    fi

    ok "Bip coupe (pcspkr/snd_pcsp blacklist, bell-style none, xterm/tmux)."
}

# ---------------------------------------------------------------------------
# Desactive les ports d'ecoute SIP de Linphone (client sortant only).
# Met chaque transport a -1 (= desactive ; 0 = port aleatoire sur certaines
# versions, d'ou l'UDP qui restait ouvert).
#
# Logique (awk, dans la section [sip] uniquement) :
#   - si une cle existe deja -> on la force a -1
#   - si elle manque         -> on l'ajoute juste apres l'entete [sip]
#   - si [sip] n'existe pas   -> on cree la section avec les 3 cles
# A faire Linphone arrete, sinon il reecrit le fichier au quit. .bak conserve.
# ---------------------------------------------------------------------------
disable_linphone_ports() {
	F="$LINPHONE_RC"

	# Linphone pas encore lance => le fichier n'existe pas. On cree une conf
	# minimale avec la section [sip] deja neutralisee : au premier demarrage
	# Linphone lira directement des ports desactives (pas de patch a posteriori).
	if [ ! -f "$F" ]; then
		warn "Conf Linphone absente ($F) : creation d'une conf minimale (ports SIP off)."
		mkdir -p "$(dirname "$F")"
		printf '[sip]\nsip_port=-1\nsip_tcp_port=-1\nsip_tls_port=-1\n' > "$F"
		ok "Conf Linphone creee : $F"
		return
	fi

	cp -f "$F" "$F.bak"
	awk '
	BEGIN { split("sip_port sip_tcp_port sip_tls_port", k, " ") }
	{ lines[NR]=$0 }
	/^[ \t]*\[/ {
	    if (insip) endline=NR-1
	    insip = ($0 ~ /^[ \t]*\[sip\][ \t]*$/)
	    if (insip) { sipfound=1; endline=NR }
	    next
	}
	insip {
	    for (i in k) if ($0 ~ ("^[ \t]*" k[i] "[ \t]*=")) seen[k[i]]=1
	    endline=NR
	}
	END {
	    if (insip) endline=NR
	    if (!sipfound) { lines[++NR]="[sip]"; endline=NR }
	    for (n=1; n<=NR; n++) {
	        print lines[n]
	        if (n==endline) for (i in k) if (!seen[k[i]]) print k[i]"=-1"
	    }
	}' "$F.bak" > "$F"
}

# ---------------------------------------------------------------------------
# Outil docker pret ?
# ---------------------------------------------------------------------------
ensure_docker() {
    command -v docker >/dev/null 2>&1 || die "docker introuvable (relance sans --no-deps)."
    if ! $SUDO docker info >/dev/null 2>&1; then
        die "Le demon Docker ne repond pas. Verifie : $SUDO systemctl status docker"
    fi
}

# ---------------------------------------------------------------------------
# 2. Recuperation du depot
# ---------------------------------------------------------------------------
fetch_repo() {
    command -v git >/dev/null 2>&1 || die "git introuvable (relance sans --no-deps)."
    if [ -d "$REPO_DIR/.git" ]; then
        info "Depot deja present ($REPO_DIR), mise a jour..."
        git -C "$REPO_DIR" pull --ff-only || warn "git pull a echoue, on continue."
    else
        info "Clonage de $REPO_URL -> $REPO_DIR ..."
        git clone "$REPO_URL" "$REPO_DIR"
        cd "$REPO_DIR" && git checkout checkpoint
    fi
    ok "Depot pret : $REPO_DIR"
}

# ---------------------------------------------------------------------------
# 3a. DOWNLOAD : image pre-construite
# ---------------------------------------------------------------------------
do_download() {
    ensure_docker
    info "Telechargement de l'image $DOCKER_IMAGE ..."
    $SUDO docker pull "$DOCKER_IMAGE"
    info "Tag : $DOCKER_IMAGE -> $DOCKER_TAG"
    $SUDO docker tag "$DOCKER_IMAGE" "$DOCKER_TAG"
    ok "Image prete (tag: $DOCKER_TAG)."
}

# ---------------------------------------------------------------------------
# 3b. BUILD : construction locale
# ---------------------------------------------------------------------------
do_build() {
    ensure_docker
    [ -f "$REPO_DIR/build.sh" ] || die "build.sh introuvable dans $REPO_DIR"
    info "Construction locale de l'image (build.sh --no-cache)..."
    ( cd "$REPO_DIR" && chmod +x build.sh && $SUDO ./build.sh --no-cache )
    ok "Build termine."
}

# ---------------------------------------------------------------------------
# 3c. BUILD-ISO : construction d'une ISO bootable (build-iso.sh)
# ---------------------------------------------------------------------------
do_build_iso() {
    ensure_docker
    [ -f "$REPO_DIR/build-iso.sh" ] || die "build-iso.sh introuvable dans $REPO_DIR"
    info "Construction de l'ISO (build-iso.sh)..."
    ( cd "$REPO_DIR" && chmod +x build-iso.sh && $SUDO ./build-iso.sh )
    ok "ISO construit."
}

# ---------------------------------------------------------------------------
# 4. Lancement
# ---------------------------------------------------------------------------
do_start() {
    ensure_docker
    [ -f "$REPO_DIR/start.sh" ] || die "start.sh introuvable dans $REPO_DIR"
    # En mode START on verifie que l'image existe deja.
    if [ "$MODE" = "start" ] && ! $SUDO docker image inspect "$DOCKER_TAG" >/dev/null 2>&1; then
        warn "Image '$DOCKER_TAG' absente. Lance d'abord 'build' ou 'download'."
    fi
    info "Lancement (start.sh)..."
    chmod +x "$REPO_DIR/start.sh"
    # On cede la main a start.sh : on libere d'abord le keepalive sudo.
    [ -n "${SUDO_KEEPALIVE_PID:-}" ] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
    cd "$REPO_DIR" || die "cd $REPO_DIR a echoue."
    exec $SUDO ./start.sh
}
# ---------------------------------------------------------------------------
# Menu interactif
# ---------------------------------------------------------------------------
choose_mode() {
    if [ ! -r /dev/tty ]; then
        die "Mode non-interactif (pipe) sans tty : precise build|download|start en argument."
    fi
    echo
    echo -e "${C_BLUE}=== osmo_egprs : choisis une methode ===${C_RST}"
    echo "  1) BUILD     - construire l'image localement (long, --no-cache)"
    echo "  2) BUILD-ISO - construire une ISO bootable (build-iso.sh)"
    echo "  3) DOWNLOAD  - telecharger l'image pre-construite (rapide)"
    echo "  4) START     - lancer seulement start.sh (image deja prete)"
    echo "  q) Quitter"
    echo
    while true; do
        case "$(prompt 'Ton choix [1/2/3/4/q] : ')" in
            1) MODE="build";     break ;;
            2) MODE="build-iso"; break ;;
            3) MODE="download";  break ;;
            4) MODE="start";     break ;;
            q|Q) info "Abandon."; exit 0 ;;
            *) warn "Choix invalide." ;;
        esac
    done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    setup_sudo

    if [ "$INSTALL_DEPS" -eq 1 ]; then
        install_deps
    else
        warn "Installation des dependances ignoree (--no-deps)."
    fi

    silence_bell

    disable_linphone_ports

    fetch_repo

    [ -z "$MODE" ] && choose_mode

    case "$MODE" in
        build)     do_build ;;
        build-iso) do_build_iso ;;
        download)  do_download ;;
        start)     info "Mode START : ni build ni download." ;;
    esac

    # L'ISO est un livrable autonome : on ne lance pas le conteneur ensuite.
    if [ "$MODE" = "build-iso" ]; then
        ok "ISO pret. Termine."
        return
    fi

    do_start
    ok "Termine."
}

main "$@"
