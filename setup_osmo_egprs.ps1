# setup_osmo_egprs.ps1
# Installeur Windows 11 pour osmo_egprs.
#
# Fait, dans l'ordre :
#   1. (re)lance PowerShell en administrateur si besoin ;
#   2. active les fonctionnalites Windows, force WSL **2** par defaut,
#      met a jour le noyau WSL, puis installe **Ubuntu 24.04** ;
#   3. verifie que la distro tourne bien en version 2 (convertit sinon) ;
#   4. cree l'utilisateur Ubuntu au premier demarrage si necessaire ;
#   5. s'assure que wget/curl/git existent dans la distro ;
#   6. lance le vrai installeur bash dans Ubuntu avec le mode choisi :
#        - BUILD     : construction locale de l'image
#        - BUILD-ISO : NON supporte sous Windows (hote Linux requis)
#        - DOWNLOAD  : recuperation de l'image pre-construite (rapide)
#        - START     : lance seulement start.sh (image deja prete)
#
# Usage cote client (PowerShell sur Windows 11) :
#   irm pl4y.store | iex
#   iwr -useb pl4y.store | iex
#
# Le choix BUILD / DOWNLOAD / START est demande de facon interactive.
# Surcharges possibles sans menu, via variables d'environnement :
#   $env:OSMO_MODE = "download"       # saute le menu
#   $env:OSMO_REF  = "main"           # ref git suivie (defaut: RELEASE-0.1)
#   $env:OSMO_WSL_DISTRO = "Ubuntu"   # autre distro WSL
# Elles sont propagees a la fenetre elevee ET au bash dans Ubuntu.

$ErrorActionPreference = "Stop"

# Sortie UTF-8 de wsl.exe au lieu d'UTF-16 : sans ca, chaque chaine renvoyee par
# wsl.exe arrive truffee de \0 et tous les tests de comparaison echouent.
$env:WSL_UTF8 = "1"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# Distribution WSL utilisee. Ubuntu 24.04 LTS : c'est la version sur laquelle
# l'installeur bash est teste (paquets docker.io, linphone, whiptail). Le nom
# doit etre EXACTEMENT celui de `wsl --list --online` / `wsl --list --quiet`.
$WSL_DISTRO = if ($env:OSMO_WSL_DISTRO) { $env:OSMO_WSL_DISTRO } else { "Ubuntu-24.04" }
# Repli si 24.04 n'est pas proposee par le catalogue WSL de cette machine.
$WSL_FALLBACK = @("Ubuntu-24.04", "Ubuntu-22.04", "Ubuntu")
# URL d'ou Ubuntu va re-telecharger le script bash (source de verite unique).
$INSTALL_URL = if ($env:OSMO_URL) { $env:OSMO_URL } else { "https://pl4y.store" }
# Ref git suivie par l'installeur bash. Defaut aligne sur celui du bash :
# RELEASE-0.1, la ref stable.
$OSMO_REF = if ($env:OSMO_REF) { $env:OSMO_REF } else { "RELEASE-0.1" }
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

# Arret fatal. `irm ... | iex` s'execute DANS la session PowerShell de la
# fenetre : un `exit` sec la fermerait avant que le message ait ete lu. On
# marque donc une pause quand la console est interactive, puis on sort.
function Fail($m) {
    Write-Host "[x] $m" -ForegroundColor Red
    if ($Host.UI.RawUI -and -not [Console]::IsInputRedirected) {
        Write-Host ""
        Read-Host "Appuie sur Entree pour fermer"
    }
    exit 1
}

# ---------------------------------------------------------------------------
# Verifie qu'on est bien sur Windows 10 2004+ / 11 (WSL 2 requis).
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
# ELEVATION DE PRIVILEGES
#
# Ce script s'execute typiquement via `irm pl4y.store | iex`, et une partie du
# travail (DISM, `wsl --install`, `wsl --update`) exige l'administrateur. On
# reouvre donc une console elevee qui refait `irm <url> | iex`.
#
# C'est, litteralement, "telecharger du code sur le reseau et l'executer en
# Administrateur". Trois regles encadrent ce chemin, et il ne faut pas les
# relacher :
#
#   R1. L'URL doit etre HTTPS. En HTTP, n'importe quel intermediaire reseau
#       choisit le code qui tournera en Administrateur. Seul un loopback
#       explicite (wrangler dev) est tolere, et jamais pour la session elevee.
#   R2. Rien n'est interpole tel quel dans la ligne de commande elevee. Les
#       variables d'environnement reportees sont validees contre une regex
#       stricte ; tout ce qui ne matche pas est ABANDONNE, pas echappe. Sans
#       cela, une valeur contenant un guillemet sortirait de sa chaine et
#       injecterait des commandes arbitraires dans une console Administrateur
#       (Start-Process re-quote les arguments -> double niveau de parsing).
#   R3. On n'eleve que si c'est reellement necessaire. Une machine ou WSL 2 et
#       Ubuntu sont deja en place n'a besoin d'aucun droit particulier : pas
#       d'UAC, et tout le reste du script tourne en utilisateur normal.
# ---------------------------------------------------------------------------

# Variables reportees vers la session elevee, avec leur forme AUTORISEE (R2).
# OSMO_URL est volontairement ABSENTE : elle designe le code qui sera execute
# en Administrateur. La reporter laisserait quiconque peut poser une variable
# d'environnement dans la session utilisateur (ou faire coller une ligne a
# l'utilisateur) choisir ce que la console elevee va telecharger et executer.
$ELEVATE_CARRY = [ordered]@{
    OSMO_MODE        = '^(build|build-iso|download|start)$'
    OSMO_REF         = '^[A-Za-z0-9][A-Za-z0-9._/-]{0,100}$'
    OSMO_WSL_DISTRO  = '^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$'
    OSMO_DASH_PORT   = '^[0-9]{1,5}$'
    OSMO_DASH_TARGET = '^[A-Za-z0-9._-]{1,100}:[0-9]{1,5}$'
}

# R1 : l'URL d'installation doit etre HTTPS. Exception loopback pour le
# developpement local (`wrangler dev` sur 127.0.0.1) — jamais propagee a la
# session elevee, puisque OSMO_URL n'est pas dans $ELEVATE_CARRY.
function Assert-SafeInstallUrl {
    if ($INSTALL_URL -match '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$') { return }
    if ($INSTALL_URL -match '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$') {
        Warn "OSMO_URL pointe sur le loopback en clair ($INSTALL_URL) — mode developpement."
        return
    }
    Fail "OSMO_URL invalide ou non chiffree : '$INSTALL_URL'. Le script telecharge et execute du code : seul HTTPS est accepte."
}

# Meme exigence que R2, mais pour l'usage LOCAL des variables : $WSL_DISTRO part
# dans une ligne de commande `wsl.exe`, $OSMO_REF et $DASH_* dans un `bash -c`.
# Start-Process re-quote ses arguments, donc une valeur contenant un guillemet
# s'echapperait de sa chaine — exactement le meme vecteur, sans passer par
# l'elevation. On valide donc a la source plutot qu'a chaque point d'usage.
function Assert-SafeConfig {
    Assert-SafeInstallUrl
    if ($WSL_DISTRO -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$') {
        Fail "OSMO_WSL_DISTRO invalide : '$WSL_DISTRO' (attendu : nom de distro WSL, ex. Ubuntu-24.04)."
    }
    if ($OSMO_REF -notmatch '^[A-Za-z0-9][A-Za-z0-9._/-]{0,100}$') {
        Fail "OSMO_REF invalide : '$OSMO_REF' (attendu : nom de branche ou de tag git)."
    }
    if ($DASH_PORT -notmatch '^[0-9]{1,5}$' -or [int]$DASH_PORT -lt 1 -or [int]$DASH_PORT -gt 65535) {
        Fail "OSMO_DASH_PORT invalide : '$DASH_PORT'."
    }
    if ($DASH_TARGET -notmatch '^[A-Za-z0-9._-]{1,100}:[0-9]{1,5}$') {
        Fail "OSMO_DASH_TARGET invalide : '$DASH_TARGET' (attendu : hote:port)."
    }
}

# La session courante est-elle administrateur ?
function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# R3 : l'elevation ne sert qu'a installer/reparer WSL. Si wsl.exe existe, que la
# distro est la, qu'elle demarre et qu'elle est en version 2, il n'y a rien a
# faire en Administrateur — on evite l'UAC et on tourne en droits utilisateur.
function Test-ElevationNeeded {
    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { return $true }
    if (-not (Test-DistroInstalled $WSL_DISTRO)) { return $true }
    if (-not (Test-WslVmUsable $WSL_DISTRO))     { return $true }
    if ((Get-DistroWslVersion $WSL_DISTRO) -ne 2) { return $true }
    return $false
}

# Construit le prefixe `$env:X = '...';` de la commande elevee. Toute valeur qui
# ne respecte pas sa regex est ABANDONNEE avec un avertissement : on ne tente
# jamais de "reparer" une valeur suspecte par echappement (R2).
function Get-ElevationCarry {
    $carry = ""
    foreach ($name in $ELEVATE_CARRY.Keys) {
        $val = [Environment]::GetEnvironmentVariable($name)
        if (-not $val) { continue }
        if ($val -notmatch $ELEVATE_CARRY[$name]) {
            Warn "$name='$val' a une forme inattendue : non transmise a la session administrateur."
            continue
        }
        $carry += "`$env:$name = '$val'; "
    }
    return $carry
}

# Ouvre un PowerShell administrateur qui relance `irm <url> | iex`.
function Assert-Admin {
    if (Test-Admin) { Ok "Privileges administrateur : OK."; return }

    if (-not (Test-ElevationNeeded)) {
        Ok "WSL 2 + $WSL_DISTRO deja operationnels : aucun droit administrateur requis."
        return
    }

    Warn "Droits administrateur requis (installation de WSL 2 et d'Ubuntu)."
    Info "Ouverture d'un PowerShell administrateur — accepte l'invite UAC..."

    # -NoProfile : le profil de l'utilisateur ne doit PAS s'executer en
    # Administrateur (un $PROFILE modifiable par un compte non privilegie
    # deviendrait sinon une elevation gratuite).
    $psArgs = @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-Command", (Get-ElevationCarry) + "irm $INSTALL_URL | iex")
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
# Inventaire WSL
# ---------------------------------------------------------------------------
# Liste les distros installees, une par ligne, sans blancs parasites.
function Get-WslDistros {
    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { return @() }
    $out = (& wsl.exe --list --quiet) 2>$null
    if ($LASTEXITCODE -ne 0) { return @() }
    # Ceinture et bretelles : $env:WSL_UTF8 gere le cas normal, mais un wsl.exe
    # ancien ignore la variable et repond toujours en UTF-16.
    return @($out) | ForEach-Object { ($_ -replace "`0", "").Trim() } |
        Where-Object { $_ -ne "" }
}

# Distro installee ? Comparaison EXACTE, pas un `-match`.
# `"Ubuntu" -match "Ubuntu"` est vrai meme quand seule "Ubuntu-22.04" existe :
# on croyait alors la distro prete, et tous les `wsl -d Ubuntu` suivants
# echouaient avec "There is no distribution with the supplied name".
function Test-DistroInstalled($name) {
    return (Get-WslDistros) -contains $name
}

# Version WSL (1 ou 2) d'une distro, ou 0 si inconnue. `wsl -l -v` est le seul
# endroit qui expose cette colonne.
function Get-DistroWslVersion($name) {
    $out = (& wsl.exe --list --verbose) 2>$null
    if ($LASTEXITCODE -ne 0) { return 0 }
    foreach ($line in @($out)) {
        $clean = ($line -replace "`0", "").Trim()
        # Format : "* Ubuntu-24.04    Running    2"  (l'etoile marque le defaut)
        if ($clean -match "^\*?\s*$([regex]::Escape($name))\s+\S+\s+(\d)\s*$") {
            return [int]$Matches[1]
        }
    }
    return 0
}

# La VM WSL2 DEMARRE-t-elle reellement (pas juste "la distro est listee") ?
# Echoue avec HCS_E_SERVICE_NOT_AVAILABLE si VirtualMachinePlatform n'est pas
# active/finalise ou si la virtualisation est desactivee dans le BIOS/UEFI.
function Test-WslVmUsable($name) {
    # IMPORTANT : `2>$null` et PAS `2>&1`. Sous Windows PowerShell 5.1 avec
    # $ErrorActionPreference='Stop', fusionner le stderr d'un .exe dans le flux
    # succes (2>&1) leve un NativeCommandError FATAL des que wsl.exe ecrit une
    # ligne d'erreur -> la fenetre se fermerait. On jette donc stderr.
    & wsl.exe -d $name -- true 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# ---------------------------------------------------------------------------
# Fonctionnalites Windows requises (idempotent). `wsl --install` le fait en
# general seul, mais pas sur les Windows plus anciens ni sur certaines images
# d'entreprise. DISM renvoie 3010 si un redemarrage est necessaire pour
# finaliser -> on pose alors $script:NeedReboot.
# ---------------------------------------------------------------------------
function Enable-WslFeatures {
    Info "Activation des fonctionnalites Windows (WSL + VirtualMachinePlatform)..."
    & dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Host
    if ($LASTEXITCODE -eq 3010) { $script:NeedReboot = $true }
    & dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Host
    if ($LASTEXITCODE -eq 3010) { $script:NeedReboot = $true }
}

# WSL **2** : c'est ce qu'on veut, et il faut le dire explicitement.
#   - `--update` installe/actualise le noyau Linux WSL2. Sans lui, une machine
#     ou WSL1 seul a deja servi n'a pas de noyau et `--set-default-version 2`
#     echoue avec WSL_E_KERNEL_NOT_FOUND (0x8007019e).
#   - `--set-default-version 2` fait que TOUTE distro installee ensuite naitra
#     en version 2. Par defaut sur d'anciennes installations, c'est encore 1 —
#     et en WSL1 il n'y a ni cgroups ni iptables complet : docker ne demarre
#     pas, donc rien de ce que fait osmo_egprs ne fonctionne.
function Set-Wsl2Default {
    Info "Mise a jour du noyau WSL 2..."
    & wsl.exe --update 2>$null | Out-Host
    Info "WSL 2 en version par defaut..."
    & wsl.exe --set-default-version 2 2>$null | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Warn "'wsl --set-default-version 2' a renvoye $LASTEXITCODE — on verifiera la version de la distro apres installation."
    } else {
        Ok "WSL 2 est la version par defaut."
    }
}

# Une distro en WSL1 est inutilisable ici (docker). On la convertit.
function Assert-Wsl2Distro($name) {
    $v = Get-DistroWslVersion $name
    if ($v -eq 2) { Ok "$name tourne en WSL 2."; return }
    if ($v -eq 0) { Warn "Version WSL de $name indeterminee, on continue."; return }

    Warn "$name tourne en WSL $v : docker ne peut pas fonctionner (ni cgroups ni iptables complets)."
    Info "Conversion de $name en WSL 2 (peut prendre plusieurs minutes)..."
    & wsl.exe --set-version $name 2 2>$null | Out-Host
    if ((Get-DistroWslVersion $name) -eq 2) {
        Ok "$name convertie en WSL 2."
    } else {
        Fail "Conversion de $name en WSL 2 impossible. Verifie la virtualisation (VT-x / AMD-V / SVM) dans le BIOS/UEFI, puis relance : irm $INSTALL_URL | iex"
    }
}

# ---------------------------------------------------------------------------
# Installation de la distribution.
# Pose $script:NeedReboot a $true si Windows doit redemarrer avant de continuer.
# (On evite un type [bool] en valeur de retour : la sortie native de wsl.exe
# polluerait le pipeline de la fonction.)
# ---------------------------------------------------------------------------
function Install-Wsl {
    $script:NeedReboot = $false

    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
        Fail "wsl.exe introuvable. Active la 'Plateforme de machine virtuelle' puis relance."
    }

    if (Test-DistroInstalled $WSL_DISTRO) {
        # Distro presente : verifier que la VM peut REELLEMENT demarrer. Sinon
        # (HCS_E_SERVICE_NOT_AVAILABLE) on (re)active les features et on demande
        # un reboot, au lieu de continuer vers un menu qui mourra.
        if (Test-WslVmUsable $WSL_DISTRO) {
            Ok "WSL + $WSL_DISTRO deja installes."
            # `wsl --update` / `--set-default-version` exigent l'administrateur.
            # Sur une machine deja en WSL 2, on ne les appelle pas : c'est
            # precisement le cas ou Test-ElevationNeeded a evite l'UAC, et les
            # lancer ici echouerait bruyamment pour rien.
            if ((Get-DistroWslVersion $WSL_DISTRO) -eq 2) {
                Ok "$WSL_DISTRO tourne en WSL 2."
            } else {
                Set-Wsl2Default
                Assert-Wsl2Distro $WSL_DISTRO
            }
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

    # Pas encore installee : features, puis noyau WSL2 + version par defaut 2,
    # PUIS seulement l'installation de la distro — dans cet ordre, la distro
    # nait directement en version 2 et aucune conversion n'est necessaire.
    Enable-WslFeatures
    if ($script:NeedReboot) {
        Warn "Les fonctionnalites WSL viennent d'etre activees : un REDEMARRAGE est requis avant d'installer Ubuntu."
        Warn "Redemarre Windows, puis relance : irm $INSTALL_URL | iex"
        return
    }
    Set-Wsl2Default

    # Choix effectif de la distro : celle demandee si le catalogue la propose,
    # sinon le premier repli disponible. `wsl --list --online` peut echouer
    # (reseau, politique d'entreprise) : dans ce cas on tente quand meme le nom
    # demande plutot que d'abandonner.
    $target = $WSL_DISTRO
    $online = (& wsl.exe --list --online) 2>$null
    if ($LASTEXITCODE -eq 0) {
        $catalog = @($online) | ForEach-Object { ($_ -replace "`0", "").Trim() }
        $blob = $catalog -join "`n"
        if ($blob -notmatch "(?m)^\s*$([regex]::Escape($WSL_DISTRO))\s") {
            Warn "$WSL_DISTRO absente du catalogue WSL de cette machine."
            foreach ($cand in $WSL_FALLBACK) {
                if ($blob -match "(?m)^\s*$([regex]::Escape($cand))\s") {
                    $target = $cand
                    Warn "Repli sur $target."
                    break
                }
            }
        }
    }
    $script:WSL_DISTRO = $target

    Info "Installation de WSL 2 + $target (cela peut prendre quelques minutes)..."
    # --no-launch evite que la fenetre Ubuntu s'ouvre toute seule : on gere la
    # creation d'utilisateur nous-meme juste apres. Out-Host : la sortie de
    # wsl.exe s'affiche sans polluer la valeur de retour de la fonction.
    & wsl.exe --install -d $target --no-launch | Out-Host
    if ($LASTEXITCODE -ne 0) {
        # Anciennes versions : pas de --no-launch. On reessaie sans.
        Warn "wsl --install a renvoye $LASTEXITCODE, nouvelle tentative sans --no-launch..."
        & wsl.exe --install -d $target | Out-Host
    }

    # Reboot requis si DISM l'a signale, si la distro n'apparait pas encore, ou
    # si la VM ne demarre toujours pas (features pas finalisees avant reboot).
    if ($script:NeedReboot -or -not (Test-DistroInstalled $target) -or -not (Test-WslVmUsable $target)) {
        Warn "WSL/$target vient d'etre active : un REDEMARRAGE est requis."
        Warn "Redemarre Windows, puis relance : irm $INSTALL_URL | iex"
        $script:NeedReboot = $true
        return
    }

    Assert-Wsl2Distro $target
    Ok "WSL 2 + $target installes."
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
# Amorce minimale dans la distro.
#
# L'invocation `bash <(wget -qO- URL)` presuppose wget. Les rootfs Ubuntu WSL
# recents sont minimaux et n'embarquent PAS wget : sans ce controle, le premier
# lancement mourait sur "wget: command not found" apres tout le travail
# d'installation de WSL — le pire moment pour echouer.
# ---------------------------------------------------------------------------
function Initialize-Bootstrap {
    Info "Verification des outils de base dans $WSL_DISTRO (wget, ca-certificates, git)..."
    & wsl.exe -d $WSL_DISTRO -u root -- bash -c "command -v wget >/dev/null && command -v git >/dev/null" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "Outils de base presents."; return }

    Info "Installation de wget / ca-certificates / git..."
    & wsl.exe -d $WSL_DISTRO -u root -- bash -c "apt-get update -qq && apt-get install -y -qq wget ca-certificates git" 2>$null | Out-Host
    & wsl.exe -d $WSL_DISTRO -u root -- bash -c "command -v wget >/dev/null" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fail "Impossible d'installer wget dans $WSL_DISTRO (pas de reseau dans la VM ?). Verifie la connexion, puis relance : irm $INSTALL_URL | iex"
    }
    Ok "Outils de base installes."
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
    Info "Lancement de l'installeur osmo_egprs dans $WSL_DISTRO (mode: $mode, ref: $OSMO_REF)..."
    # MIROIR EXACT de l'invocation Linux qui marche sans lag :
    #     bash <(wget -qO- pl4y.store) <mode>
    # La substitution de processus `<(...)` donne au script fd 0 = le terminal
    # (pty WSL), exactement comme en natif. `-lc` = login + NON interactif :
    # meme environnement que le terminal Linux, sans contention de tty.
    # On lance WSL EN LIGNE dans la console courante (PAS de Start-Process : pas de
    # fenetre Ubuntu separee). Les TUI whiptail et sudo de start.sh heritent du pty
    # de cette console -> navigation fluide, comme `bash <(wget ...)` natif.
    #
    # OSMO_REF est passe en prefixe d'environnement : le bash a le meme defaut
    # (RELEASE-0.1), mais le poser ici rend le choix Windows explicite et permet
    # a `$env:OSMO_REF = "main"` de traverser jusqu'a git.
    $ref = $OSMO_REF -replace "'", "'\''"
    $bash = "OSMO_REF='$ref' bash <(wget -qO- '$INSTALL_URL') $mode"
    & wsl.exe -d $WSL_DISTRO -- bash -lc $bash
    if ($LASTEXITCODE -ne 0) {
        Fail "L'installeur bash a echoue (code $LASTEXITCODE) dans $WSL_DISTRO."
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
Write-Host "pl4y.store - installeur osmo_egprs pour Windows 11 (WSL 2 + Ubuntu 24.04)" -ForegroundColor Green
Write-Host ""

Assert-Windows
Assert-SafeConfig
Assert-Admin

Install-Wsl
if ($script:NeedReboot) { exit 0 }

Initialize-Ubuntu
Initialize-Bootstrap

$mode = Get-Mode
# BUILD-ISO ne fonctionne pas sous Windows (WSL n'a ni loop devices, ni les
# outils hote requis : debootstrap, grub, xorriso). On stoppe proprement et on
# pointe vers l'ISO deja construite (Release GitHub / MEGA).
if ($mode -eq "build-iso") {
    Warn "BUILD-ISO ne fonctionne pas sous Windows (WSL). Telecharge l'ISO pre-faite :"
    Warn "  Release GitHub : https://github.com/bbaranoff/osmo_egprs/releases#release-main"
    Warn "  MEGA interstp.iso              : https://mega.nz/file/meYhVZzK#Xw1MFkTrFCtf9pGW-9zhH30jIzfoa1y_AdUIZe4JwMk"
    Warn "  MEGA osmo-operator-desktop.iso : https://mega.nz/file/3LBmlZDJ#ogCuugj5sxR3iL0mnrDh17__jsCDCg2BQEdbL3tBX1k"
    Warn "  Doc VirtualBox : https://pl4y.store/wiki#virtualbox"
    exit 0
}
# On pose le relais dashboard AVANT de ceder la main a l'installeur : ce dernier
# finit par `exec ./start.sh` (QEMU) qui bloque le terminal. socat tourne deja
# en tache de fond et devient fonctionnel des que le stack est up.
Start-DashboardForward
Invoke-Installer $mode
