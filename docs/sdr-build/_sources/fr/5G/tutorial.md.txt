# 5G SA labo : srsRAN Project + Open5GS (Ubuntu 2024)

## 1. Prérequis

* **OS :** Ubuntu 22.04 ou 24.04 (x86\_64)
* **Matériel :** SDR (USRP B200/B210/X300/PlutoSDR/LimeSDR…)
  *OU* mode simulation (aucun matériel SDR requis)
* **Packages de base :** git, cmake, build-essential, etc.

---

## 2. Installer Open5GS (Core 5G)

### a) Dépendances

```bash
sudo apt update
sudo apt install -y git build-essential meson ninja-build python3 python3-pip python3-setuptools \
  flex bison libsctp-dev libssl-dev libnghttp2-dev libmicrohttpd-dev \
  libyaml-dev libmariadb-dev libmongoc-dev libbson-dev mongodb
```

### b) Cloner et compiler Open5GS

```bash
git clone https://github.com/open5gs/open5gs
cd open5gs
meson build --prefix=`pwd`/install
ninja -C build
ninja -C build install
```

*(Binaires dans `open5gs/install/bin/`)*

---

## 3. Installer srsRAN Project (gNB/UE)

### a) Dépendances

```bash
sudo apt install -y cmake g++ libsctp-dev libfftw3-dev libmbedtls-dev \
  libboost-program-options-dev libconfig++-dev pkg-config python3 python3-pip \
  libzmq3-dev libpcsclite-dev
```

### b) Cloner et compiler srsRAN

```bash
git clone https://github.com/srsran/srsRAN_Project.git
cd srsRAN_Project
mkdir build && cd build
cmake ../
make -j$(nproc)
sudo make install
```

*(Binaires dans `/usr/local/bin/`)*

---

## 4. Configurer Open5GS (Core)

* Tous les fichiers : `open5gs/install/etc/open5gs/`
* Fichiers clés :

  * `amf.yaml` (AMF/core)
  * `smf.yaml` (SMF/session)
  * `upf.yaml` (UPF/user-plane)
  * `udm.yaml`, `ausf.yaml`, etc.

**Edits minimaux :**

* PLMN : `mcc: 001`, `mnc: 01` (ou tes propres valeurs)
* Dans `amf.yaml` : l’adresse `ngap` doit matcher celle de ton gNB (ex : `127.0.0.1`)

### Ajouter un abonné test (SIM)

* Ouvre `subscribers.yaml` ou passe par le [WebUI Open5GS](https://github.com/open5gs/open5gs/wiki/WebUI)
* Exemple d’entrée :

  ```yaml
  - imsi: '001010123456789'
    key: '465B5CE8B199B49FAA5F0A2EE238A6BC'
    opc: 'E8ED289DEBA952E4283B54E88E6183CA'
    amf: '8000'
    sqn: '000000000000'
  ```
* À reporter dans la SIM (physique ou config UE logicielle)

---

## 5. Configurer srsRAN gNB

* Fichier : `srsran_project/config/gnb.yaml` *(ou `gnb.conf` selon la version)*

Exemple minimal :

```yaml
plmn:
  mcc: 001
  mnc: 01
amf:
  addr: 127.0.0.1   # IP du core Open5GS
  port: 38412
slices:
  - sst: 1
    sd: 0x000001
```

* Spécifie `rf.device_name` pour ton SDR (si RF)
* Réseau/interface : ex : `ngap.interface_name: lo` pour tests locaux

---

## 6. Configurer srsRAN UE (si test en pur logiciel)

* Fichier : `srsran_project/config/ue.yaml` *(ou `ue.conf`)*
* Paramètres : PLMN, key, opc, amf, imei identiques à l’abonné Open5GS.
* Mode RF ou simulation selon besoin.

---

## 7. Lancer le Core Open5GS

Ouvre **plusieurs terminaux** (ou `tmux`) :

```bash
cd open5gs/install/bin/
sudo ./open5gs-mmed
sudo ./open5gs-sgwcd
sudo ./open5gs-smfd
sudo ./open5gs-amfd
sudo ./open5gs-upfd
sudo ./open5gs-ausfd
sudo ./open5gs-udmd
sudo ./open5gs-pcfd
sudo ./open5gs-nrfd
sudo ./open5gs-bsfd
sudo ./open5gs-hssd
```

Ou tout-en-un :

```bash
sudo ./open5gs-daemon
```

---

## 8. Lancer le gNB srsRAN

```bash
srsran_gnb --cfg srsran_project/config/gnb.yaml
```

---

## 9. (Optionnel) Lancer le srsUE (UE 5G SA logiciel)

```bash
srsran_ue --cfg srsran_project/config/ue.yaml
```

Ou utiliser un vrai smartphone 5G + SDR côté réseau.

---

## 10. Supervision

* Utilise le **WebUI Open5GS** (si installé) pour la gestion des SIM et le monitoring.
* Surveille les logs (attach, registration, PDU session, etc.).
* Une fois le UE attaché, fais un `ping` (depuis l’UE ou via l’interface UPF).

---

## Conseils de dépannage

* **PLMN, clés et IP doivent correspondre** partout.
* Utilise `127.0.0.1` ou une IP locale réelle selon ton cas.
* Avec du RF : vérifie fréquence/bande/SDR.
* En simulation pure (“null device”) tu peux tout tester sans SDR.

---

## Liens utiles

* [Docs srsRAN Project 5G](https://docs.srsran.com/projects/5g/en/latest/)
* [Docs Open5GS](https://open5gs.org/open5gs/docs/)
* [WebUI Open5GS](https://github.com/open5gs/open5gs/wiki/WebUI)
* [Guide abonnés Open5GS](https://open5gs.org/open5gs/docs/guide-subscription/)

