# OpenBTS-UMTS : Installation et utilisation rapide (Ubuntu, USRP)

## 1. Prérequis

* OS : Ubuntu 20.04/22.04 (fonctionne aussi sur 18.04)
* SDR : USRP B200/B210, N210, X310, etc.
* Dépendances : UHD, libosip2, libsctp, asterisk (optionnel pour la voix/SIP)

---

## 2. Installer UHD (driver USRP)

```bash
sudo apt update
sudo apt install -y libuhd-dev uhd-host
sudo uhd_images_downloader
```

Vérifiez que votre USRP est détecté :
`uhd_find_devices`
`uhd_usrp_probe`

---

## 3. Installer les dépendances de compilation

```bash
sudo apt install -y build-essential git cmake autoconf automake libtool \
  libosip2-dev libsctp-dev libuhd-dev libsqlite3-dev libboost-all-dev \
  libreadline-dev libncurses5-dev asterisk
```

---

## 4. Compiler et installer OpenBTS-UMTS

a) Cloner le dépôt

```bash
git clone https://github.com/RangeNetworks/openbts-umts.git
cd openbts-umts
```

b) Compilation

```bash
./autogen.sh
./configure
make -j$(nproc)
sudo make install
```

---

## 5. Préparer la configuration

* Copiez les exemples de configs du dossier `apps/` vers `/etc/OpenBTSUMTS` si besoin.
* Modifiez :

  * NodeB.tab : configuration de la cellule
  * OpenBTSUMTS.db : base SQLite (IMSIs/utilisateurs autorisés)
  * Fichier principal : OpenBTSUMTS.config

Astuce : pour les premiers tests, démarrez en mode open (toutes les IMSI acceptées).

---

## 6. Démarrer OpenBTS-UMTS

```bash
sudo OpenBTSUMTS
```

* Surveillez la console : vérifiez la détection de l’USRP et la création de la cellule.
* L’interface CLI permet d’accéder aux logs et commandes (`help` pour la liste).

---

## 7. Connecter un téléphone 3G

* Utilisez un téléphone 3G (idéalement rooté/dev) ou une SIM programmable.
* L’IMSI du téléphone doit être présente dans la base (`OpenBTSUMTS.db`).
* Si SIP + Asterisk :

  * Configurez un compte SIP dans OpenBTS-UMTS et sur votre softphone.
  * Faites des appels entre appareils SIP et le téléphone.

---

## 8. Logs et debug

* Logs : `/var/log/OpenBTSUMTS/`
* CLI interactive (`help`)
* Vérifiez : état RF, synchronisation, attachement/détachement

---

## 9. Arrêt propre

```bash
sudo pkill OpenBTSUMTS
```

---

### Liens utiles

* [Dépôt GitHub OpenBTS-UMTS](https://github.com/RangeNetworks/openbts-umts)
* [Guide expérimental](https://github.com/RangeNetworks/openbts-umts/blob/master/README.md)
* [Docs SDR RangeNetworks](http://www.rangenetworks.com/support/)

