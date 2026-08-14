[English](../../en/2G/osmocombb.md)

# OsmocomBB

**OsmocomBB** (Osmocom Baseband) est un projet open source qui implémente une pile GSM “baseband” pour certains téléphones Motorola et des configurations SDR.

## Qu’est-ce qu’OsmocomBB ?

- **Pile protocolaire GSM côté mobile (MS, mobile station)**
- Remplace le firmware d’origine pour donner accès aux couches GSM 1/2/3, journalisation des protocoles, sniffing et tests
- Utilisations : analyse, tests de sécurité, recherche académique, IMSI catchers, fuzzing radio

## Architecture

- **host/osmocon** : Outil de chargement du firmware sur les appareils compatibles
- **src/host/layer23** : Pile GSM s’exécutant sur le PC (appels, SMS, sniffing, capture de bursts, etc.)
- **firmware/** : Code baseband à flasher sur les téléphones compatibles

## Matériel supporté

- **Série Motorola C1xx (C123, C118, C155, etc.)**
- Certains autres modèles à chipset “Calypso”

## Cas d’usage & limitations

- Peut se connecter à une vraie cellule 2G ou à une BTS Osmocom (osmo-bts-trx)
- Limité à la 2G pure (pas de support 3G/4G)
- **Attention :** Émettre sans licence est illégal !  
  N’utilisez que pour la recherche ou en environnement contrôlé.

## Liens utiles

- [Dépôt GitHub OsmocomBB](https://github.com/osmocom/osmocom-bb)
- [Wiki officiel](https://osmocom.org/projects/baseband/wiki/OsmocomBB)
- [Guide d’installation (FR)](https://www.lafabriquedunet.fr/blog/osmocombb-guide/)

---

**Pour SDR :** Un projet expérimental existe pour connecter OsmocomBB à un SDR (BladeRF, HackRF, etc.) via l’interface “virtual layer1”.

## 🛰️ OsmocomBB Calypso BTS – Ubuntu 24.04 (C115/C118/C123 + PL2303)

## Matériel requis

* 2x Motorola C1xx (C115, C118, C123… chipset Calypso)
* 2x Câbles USB-série jack 2.5 mm (PL2303/FTDI)
* Ubuntu 24.04 x86\_64 (VM ou natif)
* Accès root

---

## 1. Dépendances système

```bash
sudo apt update
sudo apt install -y \
  build-essential git cmake pkg-config autoconf automake libtool shtool \
  bison flex libtalloc-dev libpcsclite-dev zlib1g-dev libmpfr-dev libmpc-dev \
  libgmp-dev libncurses5-dev libncursesw5-dev libsofia-sip-ua-dev libxml2-dev \
  libfftw3-dev libgnutls28-dev libssl-dev python3 python3-pip \
  alsa-oss lemon libtinfo-dev
```

> **Note** : Ubuntu 24.04 a GCC 13+ par défaut, mais il faut parfois cross-compiler avec GCC 4.9 pour le firmware Calypso. S’il existe des binaires arm-elf précompilés pour Ubuntu 22.04, ils fonctionnent aussi sous 24.04.
> Pour l’ARM toolchain, voir plus bas (utilise de préférence un container/VM si souci d’incompatibilité).

---

## 2. Installer la toolchain ARM-elf (cross-compiler Calypso)

### Option A : Téléchargement direct (prêt à l’emploi)

```bash
# Depuis Osmocom (préconisé : ne pas compiler vous-même sous Ubuntu récent)
cd /opt
sudo wget https://downloads.osmocom.org/binaries/toolchain/arm-2021.03.tar.bz2
sudo tar -xjf arm-2021.03.tar.bz2
export PATH=$PATH:/opt/arm-2021.03/bin
```

> **Ajoute l’export PATH à ton .bashrc pour persistance**

### Option B : Compilation manuelle

> (non recommandé sur Ubuntu 24.04, c’est lent et casse souvent, préfère la méthode ci-dessus)

---

## 3. Compiler et installer OsmocomBB

```bash
# 1. Cloner les sources
git clone https://github.com/osmocom/osmocom-bb.git
cd osmocom-bb

# 2. Préparer le build
cd src
autoreconf -i

# 3. Compiler le firmware (spécifie la toolchain si besoin)
export PATH=$PATH:/opt/arm-2021.03/bin
./configure
make -j$(nproc)
sudo make install
sudo ldconfig
```

---

## 4. Flasher le firmware sur les téléphones

**Connecte les deux téléphones via USB-PL2303, batterie retirée.**

```bash
cd src/host/osmocon
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/rssi.highram.bin
# (Shell #1 : RSSI scan, contrôle-C pour arrêter)
```

**Trouve un ARFCN actif (fort signal GSM, ex. : 900/1800 MHz).**

```bash
# Pour charger le firmware TRX (BTS)
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -s /tmp/osmocom_l2 \
  -c ../../target/firmware/board/compal_e88/trx.highram.bin -r 99
sudo ./osmocon -m c123xor -p /dev/ttyUSB1 -s /tmp/osmocom_l2.2 \
  -c ../../target/firmware/board/compal_e88/trx.highram.bin -r 99
```

---

## 5. Lancer le transceiver et la stack BTS

Dans d’autres shells :

```bash
# Shell #3 : transceiver Calypso (remplace ARFCN trouvé)
cd src/host/layer23/src/transceiver/
sudo ./transceiver -a [ARFCN] -2 -r 99

# Shell #4 : osmo-nitb (NITB = core minimal)
osmo-nitb -c ~/.osmocom/open-bsc.cfg -l ~/.osmocom/hlr.sqlite3 -P -m -C --debug=DRLL:DCC:DMM:DRR:DRSL:DNM

# Shell #5 : osmobts-trx
osmobts-trx -c ~/.osmocom/osmo-bts.cfg -r 99
```

---

## 6. (Optionnel) Installer Asterisk + LCR pour appels SIP

```bash
sudo apt install -y asterisk asterisk-dev
git clone https://github.com/fairwaves/lcr
cd lcr
autoreconf -i
./configure --with-sip --with-gsm-bs --with-gsm-ms --with-asterisk
make
sudo make install
sudo cp chan_lcr.so /usr/lib/asterisk/modules/
```

Configurer `/etc/asterisk/sip.conf` avec tes identifiants SIP.

---

## 7. Vérifier le setup et logs

* Vérifie les logs dans chaque shell : recherche “registered”, “attach”, etc.
* Lancer l’attachement avec un mobile (SIM Osmocom ou Free avec accès PLMN custom).

---

## 🛰️ **OsmocomBB Mobile (MS) – Installation rapide Ubuntu 24.04

## 1. Prérequis

* **Matériel :**

  * Motorola C1xx (C115/C118/C123/C155, etc., baseband Calypso)
  * Câble USB-série 2.5 mm (PL2303 ou FTDI)
* **Système :**

  * Ubuntu 24.04 x86\_64 (natif ou VM)
  * Accès internet + droits sudo/root

---

## 2. Installer les dépendances

```bash
sudo apt update
sudo apt install -y \
  build-essential git cmake pkg-config autoconf automake libtool shtool \
  bison flex libtalloc-dev libpcsclite-dev zlib1g-dev libmpfr-dev libmpc-dev \
  libgmp-dev libncurses5-dev libncursesw5-dev libsofia-sip-ua-dev libxml2-dev \
  libfftw3-dev libgnutls28-dev libssl-dev python3 python3-pip \
  alsa-oss lemon libtinfo-dev
```

---

## 3. Installer la toolchain ARM (cross-compile Calypso)

```bash
cd /opt
sudo wget https://downloads.osmocom.org/binaries/toolchain/arm-2021.03.tar.bz2
sudo tar -xjf arm-2021.03.tar.bz2
export PATH=$PATH:/opt/arm-2021.03/bin
```

> *(Ajoute ce dernier export à ton `~/.bashrc` pour qu’il soit permanent)*

---

## 4. Cloner et compiler OsmocomBB

```bash
git clone https://github.com/osmocom/osmocom-bb.git
cd osmocom-bb/src
autoreconf -i
export PATH=$PATH:/opt/arm-2021.03/bin
./configure
make -j$(nproc)
```

---

## 5. Flasher le firmware Mobile (Compal/C123 etc.)

1. **Branche le téléphone via le câble USB-série (sans la batterie).**

2. **Dans un terminal :**

```bash
cd host/osmocon
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/hello_world.highram.bin
# (optionnel : tester hello_world)
```

3. **Pour le firmware mobile complet :**

```bash
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/layer1.highram.bin
```

4. **Dans un autre terminal :**

```bash
cd host/layer23/src/mobile
./mobile
```

---

## 6. Configurer `mobile.cfg` (SIM, PLMN, log, etc.)

Crée/édite le fichier `mobile.cfg` (exemple dans `osmocom-bb/src/host/layer23/src/mobile/`) :

```ini
log gsmtap 127.0.0.1
log stderr
hlr
  subscriber-list subscriber_list.csv
sim
  driver sysmo
```

*(Adapte la section SIM si tu utilises une vraie SIM ou une “test SIM”)*

---

##7. Lancer OsmocomBB Mobile

```bash
# Dans host/layer23/src/mobile/
./mobile -c mobile.cfg
```

* Le téléphone démarre, tente de s’enregistrer sur le réseau configuré.
* Regarde les logs : tu dois voir “PLMN search”, “network found”, “registration accepted” (si SIM & PLMN ok).

---

## 8. (Optionnel) Suivi GSMTAP dans Wireshark

Wireshark peut décoder en temps réel les trames GSMTAP envoyées en UDP :

```bash
wireshark -k -Y gsmtap -i udp:4729
```

*(Pense à bien avoir `log gsmtap 127.0.0.1` dans ta config !)*

---

## Liens utiles

* [OsmocomBB Wiki](https://osmocom.org/projects/baseband/wiki)
* [Forum OsmocomBB](https://lists.osmocom.org/mailman/listinfo/baseband-devel)
* [Firmware Toolchain](https://downloads.osmocom.org/binaries/toolchain/)
* [BTS HowTo](https://osmocom.org/projects/baseband/wiki/CalypsoBTS)

