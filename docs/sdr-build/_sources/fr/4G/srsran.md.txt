# Installation de srsRAN 4G (via PPA ou sources)

## 1. Installation rapide via PPA (Ubuntu)

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:srsran/ppa
sudo apt update
sudo apt install -y srsran
```

**Vérifie l’install :**

```bash
srsenb --version
```

---

## 2. Compilation depuis les sources

```bash
sudo apt update
sudo apt install -y git cmake build-essential libfftw3-dev libmbedtls-dev \
  libboost-program-options-dev libconfig++-dev libsctp-dev \
  libuhd-dev libpcsclite-dev pkg-config python3 python3-pip

git clone https://github.com/srsran/srsRAN_Project.git
cd srsRAN_Project
mkdir build && cd build
cmake ../
make -j$(nproc)
sudo make install
```

---

## 3. Générer/Configurer une SIM (IMSI, Ki, OPC)

Pour connecter un téléphone réel ou un UE logiciel, il faut une SIM dont les paramètres sont connus du core **srsEPC**.

## a. Générer un profil SIM standard

* **IMSI** : identifiant unique (ex: `001010123456789`)
* **Ki** : clé de 16 octets (ex: `00112233445566778899aabbccddeeff`)
* **OPC** : clé d'opérateur de 16 octets (ex: `0102030405060708090a0b0c0d0e0f10`)
* **MSISDN** (optionnel) : numéro de tel virtuel

Tu peux utiliser un générateur en ligne ([Free5GC SIM Generator](https://free5gc.org/webconsole/sim.html)), ou générer aléatoirement :

```bash
# Générer un IMSI au hasard
IMSI="001010$(shuf -i 100000000-999999999 -n 1)"
# Générer une clé Ki et OPC
KI=$(openssl rand -hex 16)
OPC=$(openssl rand -hex 16)
echo "IMSI: $IMSI"
echo "KI:   $KI"
echo "OPC:  $OPC"
```

## b. Ajouter l’abonné dans srsEPC

Ouvre le fichier de conf des abonnés, typiquement :

```bash
nano /etc/srsran/epc_user_db.csv
```

Ou dans ton dossier local `srsRAN_Project/config/user_db.csv`

**Exemple d’entrée :**

```
IMSI,  Ki,                       OPC,                      MSISDN,     AMF,   SQN
001010123456789,00112233445566778899aabbccddeeff,0102030405060708090a0b0c0d0e0f10,1234567890,8000,000000
```

**Champ obligatoire** : IMSI, Ki, OPC (les autres = valeur par défaut si besoin).

---

## 4. Programmer une carte SIM réelle (optionnel)

Si tu utilises une carte programmable (Sysmocom, MagicSIM, etc.) :

* Utilise [pySIM](https://github.com/osmocom/pysim) (Python)
* Lance :

```bash
pysim-prog.py --ki $KI --opc $OPC --imsi $IMSI
```

(Adapté selon ton lecteur et modèle de carte)

---

## 5. Lancer srsENB (eNodeB) et srsEPC (core)

Dans deux terminaux :

```bash
# Terminal 1 (eNodeB)
srsenb enb.conf

# Terminal 2 (EPC)
srsepc epc.conf
```

---

## 6. Tester l’attachement UE

* Allume ton téléphone (SIM insérée, mode réseau “4G/auto”)
* Vérifie la détection dans les logs
* Si besoin, ajuste le PLMN dans `enb.conf` et `epc.conf` pour matcher l’IMSI de la SIM (ex: MCC/MNC = 001/01)

---

### Docs utiles

* [https://docs.srsran.com/projects/4g/en/latest/index.html](https://docs.srsran.com/projects/4g/en/latest/index.html)
* [https://osmocom.org/projects/pysim/wiki](https://osmocom.org/projects/pysim/wiki)

