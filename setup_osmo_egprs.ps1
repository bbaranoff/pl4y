# setup_osmo_egprs.ps1
# Installeur Windows 11 pour osmo_egprs.
#
# Fait, dans l'ordre :
#   1. (re)lance PowerShell en administrateur si besoin ;
#   2. installe WSL 2 + une distribution Ubuntu ;
#   3. cree l'utilisateur Ubuntu au premier demarrage si necessaire ;
#   4. lance le vrai installeur bash dans Ubuntu avec le mode choisi :
#        - BUILD     : construction locale de l'image
#        - BUILD-ISO : construction d'une ISO bootable (build-iso.sh)
#        - DOWNLOAD  : recuperation de l'image pre-construite (rapide)
#        - START     : lance seulement start.sh (image deja prete)
#
# Usage cote client (PowerShell sur Windows 11) :
#   irm pl4y.store | iex
#   iwr -useb pl4y.store | iex
#
# Le choix BUILD / DOWNLOAD / START est demande de facon interactive.
# Surcharge possible sans menu via la variable d'environnement OSMO_MODE :
#   $env:OSMO_MODE = "download"; irm pl4y.store | iex

$ErrorActionPreference = "Stop"

# Distribution WSL utilisee (doit exposer apt : Ubuntu).
$WSL_DISTRO = if ($env:OSMO_WSL_DISTRO) { $env:OSMO_WSL_DISTRO } else { "Ubuntu" }
# URL d'ou Ubuntu va re-telecharger le script bash (source de verite unique).
$INSTALL_URL = if ($env:OSMO_URL) { $env:OSMO_URL } else { "https://pl4y.store" }
# Dashboard osmo-egprs-web : ecoute sur :8080 dans le conteneur osmo-operator-1
# (= 172.20.0.11). On relaie ce service vers localhost:8080 cote Windows.
$DASH_PORT   = if ($env:OSMO_DASH_PORT)   { $env:OSMO_DASH_PORT }   else { "8080" }
$DASH_TARGET = if ($env:OSMO_DASH_TARGET) { $env:OSMO_DASH_TARGET } else { "172.20.0.11:8080" }

# ---------------------------------------------------------------------------
# Helpers d'affichage (couleurs facon installeur bash : [*], [+], [!], [x]).
# ---------------------------------------------------------------------------
function Info($m) { Write-Host "[*] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[+] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[!] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[x] $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------------------
# Verifie qu'on est bien sur Windows 10/11 (WSL 2 requis -> 11 recommande).
# ---------------------------------------------------------------------------
function Assert-Windows {
    if (-not [System.Environment]::OSVersion.Platform.ToString().StartsWith("Win")) {
        Fail "Ce script PowerShell est prevu pour Windows 11. Sous Linux : bash <(wget -qO- pl4y.store)"
    }
    $build = [int][System.Environment]::OSVersion.Version.Build
    if ($build -lt 19041) {
        Fail "Windows trop ancien (build $build). WSL 2 demande Windows 10 2004+ / Windows 11."
    }
}

# ---------------------------------------------------------------------------
# Test : la session courante est-elle administrateur ?
# ---------------------------------------------------------------------------
function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ---------------------------------------------------------------------------
# Elevation : si on n'est pas admin, on ouvre un PowerShell administrateur et on
# y relance simplement `irm pl4y.store | iex`.
# ---------------------------------------------------------------------------
function Assert-Admin {
    if (Test-Admin) { Ok "Privileges administrateur : OK."; return }

    Warn "Droits administrateur requis (installation WSL / reseau / Docker)."
    Info "Ouverture d'un PowerShell administrateur — accepte l'invite UAC..."

    $psArgs = @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm $INSTALL_URL | iex")
    try {
        Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $psArgs | Out-Null
    } catch {
        Warn "Elevation impossible (invite UAC refusee ou annulee)."
        Warn "Ouvre toi-meme un PowerShell Administrateur (clic droit > Executer en tant qu'administrateur), puis relance :"
        Fail "    irm $INSTALL_URL | iex"
    }
    Ok "PowerShell administrateur ouvert : l'installation continue LA-BAS."
    Info "Tu peux fermer CETTE fenetre."
    exit 0
}

# ---------------------------------------------------------------------------
# Installe WSL + Ubuntu. Sur Windows 11, `wsl --install -d Ubuntu` active les
# fonctionnalites necessaires et telecharge la distribution.
# Renvoie $true si un redemarrage est requis avant de continuer.
# ---------------------------------------------------------------------------
function Test-WslReady {
    # WSL pret si la commande existe ET qu'au moins une distro est installee.
    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { return $false }
    $distros = (& wsl.exe --list --quiet) 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }
    # Nettoie les caracteres nuls (sortie UTF-16 de wsl.exe).
    $clean = ($distros -join "`n") -replace "`0", ""
    return ($clean -match $WSL_DISTRO)
}

# Active les fonctionnalites Windows requises via DISM (idempotent). `wsl
# --install` le fait en general seul, mais pas sur les Windows plus anciens ni
# sur certaines images d'entreprise. DISM renvoie 3010 si un redemarrage est
# necessaire pour finaliser -> on pose alors $script:NeedReboot.
function Enable-WslFeatures {
    Info "Activation des fonctionnalites Windows (WSL + VirtualMachinePlatform)..."
    & dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Host
    if ($LASTEXITCODE -eq 3010) { $script:NeedReboot = $true }
    & dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Host
    if ($LASTEXITCODE -eq 3010) { $script:NeedReboot = $true }
}

# Verifie que la VM WSL2 DEMARRE reellement (pas juste que la distro est listee).
# Echoue avec HCS_E_SERVICE_NOT_AVAILABLE si VirtualMachinePlatform n'est pas
# active/finalisee ou si la virtualisation est desactivee dans le BIOS/UEFI.
function Test-WslVmUsable {
    # IMPORTANT : `2>$null` et PAS `2>&1`. Sous Windows PowerShell 5.1 avec
    # $ErrorActionPreference='Stop', fusionner le stderr d'un .exe dans le flux
    # succes (2>&1) leve un NativeCommandError FATAL des que wsl.exe ecrit une
    # ligne d'erreur -> la fenetre se fermerait. On jette donc stderr.
    & wsl.exe -d $WSL_DISTRO -- true 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# Pose $script:NeedReboot a $true si Windows doit redemarrer avant de continuer.
# (On evite un type [bool] en valeur de retour : la sortie native de wsl.exe
# polluerait le pipeline de la fonction.)
function Install-Wsl {
    $script:NeedReboot = $false

    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
        Fail "wsl.exe introuvable. Active la 'Plateforme de machine virtuelle' puis relance."
    }

    if (Test-WslReady) {
        # WSL + distro presents : verifier que la VM peut REELLEMENT demarrer.
        # Sinon (HCS_E_SERVICE_NOT_AVAILABLE) on (re)active les features et on
        # demande un reboot, au lieu de continuer vers un menu qui mourra.
        if (Test-WslVmUsable) {
            Ok "WSL + $WSL_DISTRO deja installes."
            return
        }
        Warn "WSL est present mais la VM ne demarre pas (fonctionnalite requise manquante)."
        Enable-WslFeatures
        Warn "VirtualMachinePlatform vient d'etre (re)active : un REDEMARRAGE est requis."
        Warn "Si l'erreur persiste apres reboot, active la virtualisation (VT-x / AMD-V / SVM) dans le BIOS/UEFI."
        Warn "Puis relance : irm $INSTALL_URL | iex"
        $script:NeedReboot = $true
        return
    }

    # Pas encore installe : on active les features puis on installe.
    Enable-WslFeatures

    Info "Installation de WSL 2 + $WSL_DISTRO (cela peut prendre quelques minutes)..."
    # --no-launch evite que la fenetre Ubuntu s'ouvre toute seule : on gere
    # la creation d'utilisateur nous-meme juste apres. Out-Host : la sortie de
    # wsl.exe s'affiche sans polluer la valeur de retour de la fonction.
    & wsl.exe --install -d $WSL_DISTRO --no-launch | Out-Host
    if ($LASTEXITCODE -ne 0) {
        # Anciennes versions : pas de --no-launch. On reessaie sans.
        Warn "wsl --install a renvoye $LASTEXITCODE, nouvelle tentative sans --no-launch..."
        & wsl.exe --install -d $WSL_DISTRO | Out-Host
    }

    # Reboot requis si DISM l'a signale, si la distro n'apparait pas encore, ou
    # si la VM ne demarre toujours pas (features pas finalisees avant reboot).
    if ($script:NeedReboot -or -not (Test-WslReady) -or -not (Test-WslVmUsable)) {
        Warn "WSL/Ubuntu vient d'etre active : un REDEMARRAGE est requis."
        Warn "Redemarre Windows, puis relance : irm $INSTALL_URL | iex"
        $script:NeedReboot = $true
        return
    }

    Ok "WSL + $WSL_DISTRO installes."
}

# ---------------------------------------------------------------------------
# Premier demarrage Ubuntu : cree le compte utilisateur si la distro n'en a
# pas encore (sinon le bash echoue car pas de sudo configure).
# ---------------------------------------------------------------------------
function Initialize-Ubuntu {
    Info "Verification de l'utilisateur Ubuntu..."
    # `whoami` renvoie root tant qu'aucun utilisateur n'a ete cree.
    $who = (& wsl.exe -d $WSL_DISTRO -- whoami) 2>$null
    if ($LASTEXITCODE -ne 0) {
        # La VM n'a pas demarre : ne pas prendre le message d'erreur pour un
        # nom d'utilisateur et ne pas continuer vers un menu qui echouera.
        Fail "Impossible de demarrer $WSL_DISTRO (la VM WSL2 ne repond pas). Redemarre Windows, verifie la virtualisation (BIOS/UEFI), puis relance : irm $INSTALL_URL | iex"
    }
    $who = ($who -replace "`0", "").Trim()
    if ($who -and $who -ne "root") {
        Ok "Utilisateur Ubuntu : $who"
        return
    }

    Warn "Aucun utilisateur Ubuntu configure."
    Info  "La fenetre Ubuntu va s'ouvrir : choisis un nom d'utilisateur et un mot de passe."
    Info  "Une fois le compte cree, ferme la fenetre Ubuntu pour continuer ici."
    # Lance l'installeur de la distro (cree le user) en mode interactif bloquant.
    Start-Process -FilePath "wsl.exe" -ArgumentList @("-d", $WSL_DISTRO) -Wait
    Ok "Configuration Ubuntu terminee."
}

# ---------------------------------------------------------------------------
# Menu BUILD / DOWNLOAD / START (miroir du menu bash).
# ---------------------------------------------------------------------------
function Get-Mode {
    if ($env:OSMO_MODE) {
        $m = $env:OSMO_MODE.ToLower()
        if ($m -in @("build", "build-iso", "download", "start")) { return $m }
        Warn "OSMO_MODE='$($env:OSMO_MODE)' invalide, on passe au menu."
    }
    Write-Host ""
    Write-Host "=== osmo_egprs : choisis une methode ===" -ForegroundColor Cyan
    Write-Host "  1) BUILD     - construire l'image localement (long, --no-cache)"
    Write-Host "  2) BUILD-ISO - NE FONCTIONNE PAS sous Windows (hote Linux requis)" -ForegroundColor Red
    Write-Host "  3) DOWNLOAD  - telecharger l'image pre-construite (rapide)"
    Write-Host "  4) START     - lancer seulement start.sh (image deja prete)"
    Write-Host "  q) Quitter"
    Write-Host ""
    while ($true) {
        switch (Read-Host "Ton choix [1/2/3/4/q]") {
            "1" { return "build" }
            "2" { return "build-iso" }
            "3" { return "download" }
            "4" { return "start" }
            "q" { Info "Abandon."; exit 0 }
            "Q" { Info "Abandon."; exit 0 }
            default { Warn "Choix invalide." }
        }
    }
}

# ---------------------------------------------------------------------------
# Lance le vrai installeur bash DANS Ubuntu, avec le mode choisi.
# On re-telecharge depuis $INSTALL_URL : source de verite unique.
# ---------------------------------------------------------------------------
function Invoke-Installer($mode) {
    Info "Lancement de l'installeur osmo_egprs dans $WSL_DISTRO (mode: $mode)..."
    # MIROIR EXACT de l'invocation Linux qui marche sans lag :
    #     bash <(wget -qO- pl4y.store) <mode>
    # La substitution de processus `<(...)` donne au script fd 0 = le terminal
    # (pty WSL), exactement comme en natif. `-lc` = login + NON interactif :
    # meme environnement que le terminal Linux, sans contention de tty.
    $bash = "bash <(wget -qO- '$INSTALL_URL') $mode"

    # POURQUOI une fenetre console DEDIEE (Start-Process SANS -NoNewWindow) et
    # pas un `& wsl.exe ...` inline dans la console courante :
    #   start.sh finit par des TUI whiptail (menu quick/normal du conteneur QEMU)
    #   et l'installeur appelle `sudo` : tous deux LISENT les touches sur un pty
    #   reel. Or une console HERITEE — d'une elevation `Start-Process -Verb RunAs`
    #   ou d'un hote sans vraie console (PowerShell ISE, terminal VS Code) — n'a
    #   pas toujours de pty exploitable : whiptail s'affiche puis se fige ("figé")
    #   et sudo attend une saisie invisible. Une fenetre console NEUVE a, elle,
    #   toujours un pty propre -> meme comportement que `bash <(wget ...)` natif.
    #   C'est exactement le pattern deja fiable de Initialize-Ubuntu.
    # -Wait + -PassThru : on attend la fermeture de la fenetre du lab (start.sh
    #   occupe le terminal avec QEMU) et on recupere le code de sortie. Le relais
    #   dashboard tourne deja en tache de fond -> localhost reste joignable.
    Ok "Le lab s'ouvre dans une fenetre Ubuntu dediee — suis-le la-bas (ferme-la pour revenir ici)."
    $p = Start-Process -FilePath "wsl.exe" `
        -ArgumentList @("-d", $WSL_DISTRO, "--", "bash", "-lc", $bash) `
        -Wait -PassThru
    if ($p.ExitCode -ne 0) {
        Fail "L'installeur bash a echoue (code $($p.ExitCode)) dans $WSL_DISTRO."
    }
    Ok "Termine."
}

# ---------------------------------------------------------------------------
# Relais TCP : localhost:8080 (Windows) -> 172.20.0.11:8080 (dashboard
# osmo-egprs-web dans le conteneur osmo-operator-1).
#
# Pourquoi un relais socat DANS la VM plutot qu'un port-forward iptables/route ?
#   - WSL2 relaie deja `localhost` host<->VM automatiquement ;
#   - socat fait le dernier saut VM->conteneur ;
#   - ce chemin part de l'OUTPUT de la VM (celui qui marche toujours, le meme
#     que `wsl ping 172.20.0.11`), donc robuste et il survit aux reboots WSL,
#     contrairement au forwarding qui dependait de la route + DOCKER-USER.
#
# Resultat : http://localhost:8080 depuis le navigateur Windows tombe sur le
# dashboard. socat est lance detache (fenetre cachee) et tourne en tache de
# fond ; il continue de tourner pendant que start.sh prend la main sur QEMU.
# ---------------------------------------------------------------------------
function Start-DashboardForward {
    Info "Mise en place du relais dashboard (localhost:$DASH_PORT -> $DASH_TARGET)..."

    # 1) socat present dans la VM ? Sinon on l'installe (idempotent).
    & wsl.exe -d $WSL_DISTRO -u root -- bash -c "command -v socat >/dev/null 2>&1" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Info "Installation de socat dans $WSL_DISTRO..."
        & wsl.exe -d $WSL_DISTRO -u root -- bash -c "apt-get update -qq && apt-get install -y socat" 2>$null | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Warn "Echec de l'installation de socat : dashboard joignable directement via http://$DASH_TARGET"
            return
        }
    }

    # 2) Tue un eventuel ancien relais sur ce port (evite 'Address already in
    #    use' si on relance le script), puis lance socat en foreground dans une
    #    fenetre WSL cachee. `fork` => socat reste a l'ecoute meme si le
    #    conteneur n'est pas encore up : la connexion echoue tant que le stack
    #    n'est pas demarre, puis passe des que start.sh a tout lance.
    $relay = "pkill -f 'socat TCP-LISTEN:$DASH_PORT' 2>/dev/null; " +
             "exec socat TCP-LISTEN:$DASH_PORT,fork,reuseaddr TCP:$DASH_TARGET"
    Start-Process -FilePath "wsl.exe" `
        -ArgumentList @("-d", $WSL_DISTRO, "-u", "root", "--", "bash", "-c", $relay) `
        -WindowStyle Hidden
    Ok "Dashboard sur http://localhost:$DASH_PORT (relais socat actif dans $WSL_DISTRO)."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "pl4y.store - installeur osmo_egprs pour Windows 11 (WSL + Ubuntu)" -ForegroundColor Green
Write-Host ""

Assert-Windows
Assert-Admin

Install-Wsl
if ($script:NeedReboot) { exit 0 }

Initialize-Ubuntu

$mode = Get-Mode
# BUILD-ISO ne fonctionne pas sous Windows (WSL n'a ni loop devices, ni les
# outils hote requis : debootstrap, grub, xorriso). On stoppe proprement et on
# pointe vers l'ISO deja construite (Release GitHub / MEGA).
if ($mode -eq "build-iso") {
    Warn "BUILD-ISO ne fonctionne pas sous Windows (WSL). Telecharge l'ISO pre-faite :"
    Warn "  Release GitHub : https://github.com/bbaranoff/osmo_egprs/releases/tag/main"
    Warn "  MEGA           : https://mega.nz/file/zKBHgaKZ#pMhvkpsjhBPMCTpY-WFcajKhHkYqOLZ53dQCirfEFJU"
    Warn "  Doc VirtualBox : https://pl4y.store/wiki#virtualbox"
    exit 0
}
# On pose le relais dashboard AVANT de ceder la main a l'installeur : ce dernier
# finit par `exec ./start.sh` (QEMU) qui bloque le terminal. socat tourne deja
# en tache de fond et devient fonctionnel des que le stack est up.
Start-DashboardForward
Invoke-Installer $mode
