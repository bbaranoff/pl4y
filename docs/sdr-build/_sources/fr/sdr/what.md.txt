[English](../../en/sdr/what.md)

# Qu’est-ce qu’un SDR ?

## Définition

La **radio définie par logiciel** (SDR, Software‑Defined Radio) est un système radio où les composants classiques (mélangeurs, filtres, amplis, modulateurs/démodulateurs, détecteurs, etc.) sont implémentés en logiciel sur un ordinateur ou un système embarqué.  
La vraie “radio” devient du code : le matériel ne sert qu’à numériser les signaux analogiques.

> **Analogie :** Dans une radio classique, chaque standard (AM, FM, GSM, WiFi…) nécessite un circuit dédié. En SDR, un seul appareil—avec le bon logiciel—suffit pour tout faire.

---

## Comment ça fonctionne ?

1. **Antenne**  
   Capte ou émet les ondes électromagnétiques (RF).

2. **RF Front-End**  
   Circuit analogique minimal.  
   *En réception* : amplifie et convertit le signal pour numérisation.  
   *En émission* : l’inverse.

3. **CAN / CNA**  
   * **Convertisseur Analogique-Numérique (CAN/ADC)** : Échantillonne le signal à haute vitesse, convertit en numérique pour traitement logiciel.  
   * **Convertisseur Numérique-Analogique (CNA/DAC)** : Reconvertit le signal traité en analogique pour l’émission.

4. **Unité de traitement (CPU/GPU/FPGA)**  
   Toute la modulation, démodulation, filtrage, décodage et logique protocolaire s’effectue en logiciel—PC, Raspberry Pi, smartphone ou FPGA.

5. **Pile logicielle**  
   Les frameworks logiciels (GNU Radio, SDR#, SDRangel, GQRX, srsRAN…) gèrent le traitement du signal et fournissent l’interface utilisateur, la démodulation, et parfois toute la pile réseau.

---

## Avantages et points forts

* **Flexibilité :** Un seul SDR peut recevoir/décoder ou émettre une multitude de signaux — il suffit de changer de logiciel.
* **Évolutivité :** Nouveaux protocoles ou standards ? Ajoute-les par mise à jour logicielle, sans changer de matériel.
* **Économies :** Plus besoin de collectionner des appareils radio spécialisés.
* **Prototypage rapide :** Ingénieurs, chercheurs et hackers peuvent expérimenter facilement.
* **Applications larges :** De la FM, satellites météo, et ADS-B avion à l’analyse GSM/LTE, hacking, spectre radio ou radioamateur.

---

## Exemples de matériels SDR courants

| Modèle         | Prix (€)  | Gamme de fréquences   | Cas d’usage notables      |
| -------------- | --------- | --------------------- | ------------------------ |
| RTL‑SDR v3     | 35‑50     | 500 kHz–1,7 GHz       | Entrée de gamme, RX seul |
| HackRF One     | 300‑400   | 1 MHz–6 GHz           | TX/RX, dev & hacking     |
| ADALM‑PLUTO    | 150‑200   | 325 MHz–3,8 GHz       | LTE, WiFi, éducatif      |
| LimeSDR Mini   | 200‑300   | 10 MHz–3,5 GHz        | MIMO, LTE, GSM, projet   |
| USRP B200/B210 | 1 000+    | 70 MHz–6 GHz          | Recherche/pro, dev       |

---

## Applications typiques d’un SDR

* **Radioamateur** (tous modes, numérique/analogique)
* **Surveillance du spectre** (recherche de signaux, chasse d’interférences)
* **Reverse Engineering** (analyse protocoles, sécurité sans fil)
* **Réseaux cellulaires** (sniffing GSM, LTE, IMSI-catcher, base station SDR)
* **Communication satellite** (météo, navigation, TV, radioamateur)
* **Hacking objets connectés** (IoT, pagers, compteurs intelligents…)
* **Éducation & Recherche** (TP, cours, projets étudiants)

---

## SDR en pratique

### Ce qu’il faut pour débuter

* **Matériel SDR :** RTL-SDR pour la RX pas chère ; HackRF/PlutoSDR pour la RX/TX.
* **Antenne :** Basique pour la FM, plus large ou optimisée pour d’autres usages.
* **PC ou appareil embarqué :** Même un Raspberry Pi peut suffire.
* **Logiciel :** GNU Radio (avancé), SDR# (Windows, simple), GQRX (Linux), etc.

---

## Exemple réel : RTL‑SDR

* **Brancher la clé USB SDR**
* **Installer SDR# ou GQRX**
* **Se caler sur 100 MHz — écouter la FM !**
* **Changer de logiciel/plugin — décoder ADS-B avion, pagers, satellites météo, ou capter des signaux domotiques**

---

## Pourquoi le SDR est révolutionnaire ?

Le **SDR** fait sauter les barrières matérielles de la radio.  
Il donne le pouvoir d’analyser, prototyper et *reprendre la main* sur le spectre à toute personne munie d’un ordinateur.

*Que tu sois étudiant, hacker, ingénieur ou simple curieux : la radio n’est plus une boîte noire. Tu peux voir, entendre et *façonner* le monde invisible qui t’entoure.*
