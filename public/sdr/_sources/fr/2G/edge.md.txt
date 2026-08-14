[English](../../en/2G/edge.md)

# Guide d'installation modulaire EGPRS (Osmocom + SDR)

## Chapitre 1 — Présentation

Ce guide décrit l'installation modulaire d'une infrastructure **EGPRS** (GPRS/EDGE) basée sur Osmocom et SDR (USRP, BladeRF).  
Chaque chapitre détaille un module, son rôle, ses dépendances et options.  
Tout peut être scripté pour une intégration Dockerfile ou un déploiement manuel sur Debian/Ubuntu 22.04+.

---

## Chapitre 2 — Dépendances système

Commencez par installer tous les outils de build essentiels, bibliothèques, Python et utilitaires de debug :
- Compilation : `gcc`, `g++`, `make`, `cmake`, `autoconf`, `automake`, `libtool`, etc.
- Libs système : `libusb-1.0-0-dev`, `libedit-dev`, `libfftw3-dev`, `liburing-dev`, …
- Dev Python : `python3-dev`, `python3-pip`, `python3-numpy`, `python3-mako`, `python3-lxml`, `python3-six`, …
- Outils additionnels : `nano`, `git`, `wget`, `curl`, `tmux`, `doxygen`, `ethtool`, etc.

**Commande d'installation :**
```sh
apt update
apt install -y <tous-les-paquets-listés>
````

---

## Chapitre 3 — SDR & Matériel (UHD, BladeRF)

### 3.1 — UHD (USRP/Ettus)

* **libuhd-dev, uhd-host** : Drivers et outils pour USRP.

* **Images firmware** :

```sh
python3 /usr/lib/uhd/utils/uhd_images_downloader.py
```

* **Règle udev** pour détection auto :

```sh
wget https://raw.githubusercontent.com/EttusResearch/uhd/refs/heads/master/host/utils/uhd-usrp.rules && cp uhd-usrp.rules /etc/udev/rules.d/
```

### 3.2 — BladeRF (Nuand)

* **libbladerf-dev** + build depuis les sources :

```sh
git clone https://github.com/nuand/BladeRF /opt/GSM/BladeRF
cd /opt/GSM/BladeRF && mkdir build && cd build
cmake .. && make -j$(nproc) && make install && ldconfig
```

---

## Chapitre 4 — Librairies Osmocom de base

Ces librairies sont la fondation de toute la stack GSM Osmocom.

* **libosmocore** : Primitives GSM, timers, gestion protocoles.
* **libosmo-netif** : Interfaces réseau.
* **libosmo-abis** : Support interface Abis (BTS ↔ BSC).

**Build de chaque librairie :**

```sh
git clone https://github.com/osmocom/<repo>
cd <repo> && autoreconf -fi && ./configure && make -j$(nproc) && make install && ldconfig
```

*(remplacer `<repo>` par le nom de la librairie)*

---

## Chapitre 5 — Stack cœur GSM/EDGE

**Osmocom fournit un module séparé pour chaque composant cœur de réseau :**

* **osmo-hlr** : Home Location Register (base d’abonnés)
* **osmo-msc** : Mobile Switching Center (appels, SMS, mobilité)
* **osmo-bsc** : Base Station Controller (gestion BTS, handover)
* **osmo-sgsn** : Serving GPRS Support Node (sessions GPRS/EDGE)
* **osmo-ggsn** : Gateway GPRS Support Node (passerelle IP/data)
* **osmo-mgw** : Media Gateway (flux voix/data)
* **osmo-pcu** : Packet Control Unit (gestion trames GPRS/EDGE)
* **libosmo-sigtran** : SIGTRAN/SS7 over IP
* **libsmpp34** : Librairie SMPP (SMS)
* **libgtpnl** : GTP (GPRS Tunneling Protocol pour data mobile)

**Exemple de build générique :**

```sh
git clone https://github.com/osmocom/<module>
cd <module> && autoreconf -fi && ./configure [OPTIONS] && make -j$(nproc) && make install && ldconfig
```

* Les options comme `--enable-gtp-linux`, `--enable-iu`, `--enable-smpp`, etc, dépendent du module.

---

## Chapitre 6 — Couches radio (TRX/BTS)

* **osmo-trx** : Transceiver SDR (modulation, A5/x, couche radio PHY)
* **osmo-bts** : Interface logicielle pour le TRX (logiciel BTS)

  * Option : `--enable-trx` pour activer le mode SDR.

**Build typique :**

```sh
git clone https://github.com/osmocom/osmo-trx
cd osmo-trx && autoreconf -fi && ./configure --with-uhd && make -j$(nproc) && make install && ldconfig

git clone https://github.com/osmocom/osmo-bts
cd osmo-bts && autoreconf -fi && ./configure --enable-trx && make -j$(nproc) && make install && ldconfig
```

---

## Chapitre 7 — Services & Outils additionnels

* **osmo-sip-connector** : passerelle GSM ↔ VoIP SIP (pour appels IP)
* **Outils SIM** : `pcsc-tools`, `pcscd`, `libpcsclite-dev`
* **iptables**, **tmux**, **nano**, **python3-pip** : utilitaires système
* **python3-requests** : scripts API/réseau

**Exemple d'installation :**

```sh
apt install -y iptables tmux nano python3-pip python3-requests
pip3 install requests
```

---

## Chapitre 8 — Script modulaire (bash)

```bash
#!/bin/bash
# Installeur modulaire EGPRS/Osmocom
# Construit une stack GSM/EDGE complète avec SDR : USRP, BladeRF, Osmocom core et toutes dépendances.
# Auteur : Bastien / bbaranoff (software-defined-radio.com)
# Testé sur Ubuntu 22.04+

set -e
N=$(nproc) || N=2
ROOT=/opt/GSM

# ----------------------------------------
# Chapitre 2 — Dépendances système
# ----------------------------------------
install_deps() {
    echo "==> Installation des paquets système et dépendances de build..."
    apt update
    apt install -y \
        gcc g++ make cmake autoconf automake libtool pkg-config \
        libedit-dev libfftw3-dev libusb-1.0-0-dev liburing-dev \
        nano git wget curl tmux doxygen ethtool \
        python3 python3-dev python3-pip python3-six python3-mako python3-lxml python3-numpy python3-pybind11 python3-requests python3-scipy python3-setuptools python3-ruamel.yaml \
        libpcsclite-dev pcsc-tools pcscd cpufrequtils libsctp-dev libconfig++-dev libconfig-dev libmbedtls-dev \
        libtalloc-dev libgnutls28-dev libmnl-dev libortp-dev libdbd-sqlite3 iproute2 iputils-ping \
        libsqlite3-dev libdbi-dev libc-ares-dev libsofia-sip-ua-glib-dev telnet \
        systemd systemd-sysv dbus dbus-user-session ccache libboost-all-dev libncurses5 libncurses5-dev \
        libusb-1.0-0 libusb-dev iptables udev
}

# ----------------------------------------
# Chapitre 3 — Drivers SDR & Firmware
# ----------------------------------------

install_uhd() {
    echo "==> Installation UHD/USRP et téléchargement images firmware..."
    apt install -y libuhd-dev uhd-host
    python3 /usr/lib/uhd/utils/uhd_images_downloader.py
    # Règles udev Ettus USRP
    wget -O /etc/udev/rules.d/uhd-usrp.rules https://raw.githubusercontent.com/EttusResearch/uhd/refs/heads/master/host/utils/uhd-usrp.rules
    echo "export UHD_MODULE_PATH=/usr/lib/uhd/modules" >> /root/.bashrc
}

install_bladerf() {
    echo "==> Installation BladeRF et build depuis sources..."
    apt install -y libbladerf-dev
    git clone https://github.com/nuand/BladeRF $ROOT/BladeRF || true
    cd $ROOT/BladeRF
    mkdir -p build && cd build
    cmake .. && make -j$N && make install && ldconfig
}

# ----------------------------------------
# Chapitre 4 — Librairies Osmocom de base
# ----------------------------------------
build_osmo_lib() {
    echo "==> Build des librairies Osmocom : libosmocore, libosmo-netif, libosmo-abis"
    for repo in libosmocore libosmo-netif libosmo-abis; do
        git clone https://github.com/osmocom/$repo $ROOT/$repo || true
        cd $ROOT/$repo
        autoreconf -fi
        ./configure
        make -j$N
        make install
        ldconfig
    done
}

# ----------------------------------------
# Chapitres 5/6 — Réseau cœur, radio, EDGE
# ----------------------------------------
build_osmo_core() {
    echo "==> Build Osmocom réseau, radio et modules GPRS..."
    
    # HLR (DB abonnés)
    git clone https://github.com/osmocom/osmo-hlr $ROOT/osmo-hlr || true
    cd $ROOT/osmo-hlr && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # Media Gateway
    git clone https://github.com/osmocom/osmo-mgw $ROOT/osmo-mgw || true
    cd $ROOT/osmo-mgw && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # SIGTRAN (SS7 sur IP)
    git clone https://gitea.osmocom.org/osmocom/libosmo-sigtran $ROOT/libosmo-sigtran || true
    cd $ROOT/libosmo-sigtran && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # libsmpp34 (SMS)
    git clone https://github.com/osmocom/libsmpp34 $ROOT/libsmpp34 || true
    cd $ROOT/libsmpp34 && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # libgtpnl (tunnels GTP)
    git clone https://github.com/osmocom/libgtpnl $ROOT/libgtpnl || true
    cd $ROOT/libgtpnl && autoreconf -fi && ./configure --enable-gtp-linux && make -j$N && make install && ldconfig

    # Éléments cœur (ordre : GGSN, SGSN, MSC, BSC, PCU)
    git clone https://github.com/osmocom/osmo-ggsn $ROOT/osmo-ggsn || true
    cd $ROOT/osmo-ggsn && autoreconf -fi && ./configure --enable-gtp-linux && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-sgsn $ROOT/osmo-sgsn || true
    cd $ROOT/osmo-sgsn && autoreconf -fi && ./configure --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-msc $ROOT/osmo-msc || true
    cd $ROOT/osmo-msc && autoreconf -fi && ./configure --enable-smpp --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-bsc $ROOT/osmo-bsc || true
    cd $ROOT/osmo-bsc && autoreconf -fi && ./configure --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-pcu $ROOT/osmo-pcu || true
    cd $ROOT/osmo-pcu && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # Couches radio : TRX, BTS
    git clone https://github.com/osmocom/osmo-trx $ROOT/osmo-trx || true
    cd $ROOT/osmo-trx && autoreconf -fi && ./configure --with-uhd && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-bts $ROOT/osmo-bts || true
    cd $ROOT/osmo-bts && autoreconf -fi && ./configure --enable-trx && make -j$N && make install && ldconfig

    # SIP connector (SIP/VoIP)
    git clone https://github.com/osmocom/osmo-sip-connector $ROOT/osmo-sip-connector || true
    cd $ROOT/osmo-sip-connector && autoreconf -fi && ./configure && make -j$N && make install && ldconfig
}

# ----------------------------------------
# Chapitre 7 — Python & utilitaires système
# ----------------------------------------
install_python_utils() {
    echo "==> Installation dépendances pip et update images UHD..."
    pip3 install requests
    # (Re)télécharge images firmware UHD si besoin
    python3 /usr/lib/uhd/utils/uhd_images_downloader.py || true
}

# ----------------------------------------
# Séquence principale
# ----------------------------------------
main() {
    install_deps
    install_uhd
    install_bladerf
    build_osmo_lib
    build_osmo_core
    install_python_utils
    echo "==> Tous les modules sont installés. Vous pouvez passer à la configuration et aux scripts de run."
}

main "$@"
```

---

## Chapitre 9 — Résumé & Bonnes pratiques

* **Chaque module** est un bloc indépendant, à construire dans l’ordre (libs → cœur → radio → services)
* Pour EGPRS, l’ordre **BTS/TRX/PCU/SGSN/GGSN** est crucial (le flux data traverse chaque élément)
* **Séparation des modules** = maintenance et debug facilités
* Toujours vérifier les dépendances système/matériel (drivers USRP, firmware BladeRF, règles udev…)

