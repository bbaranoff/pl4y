[English](../../en/2G/gsm-basics.md)

# Bases du GSM : Vue d'ensemble

**GSM** (Global System for Mobile Communications) est le standard cellulaire le plus utilisé au monde, initialement conçu pour la voix et les SMS 2G, puis étendu à la donnée (GPRS/EDGE).

---

## Qu'est-ce que le GSM ?

- Standard **cellulaire numérique** pour voix et données mobiles
- Lancé en Europe en 1991, adopté mondialement
- Bandes : 900/1800 MHz (Europe/Asie), 850/1900 MHz (Amériques)

---

## Concepts clés

- **Réseau cellulaire** : Divise la couverture en « cellules », chacune desservie par une station de base (BTS)
- **Carte SIM** : Stocke l'identité de l'abonné et les clés secrètes
- **Voix, SMS, données bas débit** : Services de base (l'accès Internet a été ajouté ensuite)

---

## Architecture GSM

- **MS (Mobile Station)** : Le téléphone (matériel + SIM)
- **BTS (Base Transceiver Station)** : « Antenne relais » – gère le lien radio avec le téléphone
- **BSC (Base Station Controller)** : Gère plusieurs BTS, handover et ressources radio
- **MSC (Mobile Switching Center)** : Bascule appels/SMS, gère mobilité et authentification
- **HLR/VLR (Home/Visitor Location Register)** : Bases de données abonnés et itinérance
- **AUC** : Centre d’authentification (gère SIM/IMSI/Ki)
- **EIR** : Registre des équipements (bloque les téléphones volés)

```
[MS] ⇄ [BTS] ⇄ [BSC] ⇄ [MSC] ⇄ [HLR/VLR]
```

---

## Fréquences et modulation

- **TDMA** : Time Division Multiple Access (plusieurs utilisateurs par fréquence, via des intervalles de temps)
- **GMSK** : Gaussian Minimum Shift Keying (modulation radio efficace et robuste)

---

## Sécurité & SIM

- Chaque SIM possède un **IMSI** unique et une clé secrète **Ki**
- **Authentification** : Algorithmes A3/A8, génération d'une clé session (Kc) pour chaque appel

---

## Interface radio GSM & pile de protocoles

L’« interface radio » GSM définit comment le téléphone communique avec le réseau sur le canal radio : fréquences, slots temporels, couches de protocoles…

---

## Canaux radio & intervalles de temps

- **Bandes de fréquences** : GSM900, 1800, 850, 1900 MHz
- **Canal** = fréquence porteuse (200 kHz) découpée en 8 **timeslots** (TDMA)
- **Un utilisateur** = un timeslot par trame (hors canaux de contrôle/données « packet »)

---

## Types de canaux

- **Traffic Channels (TCH)** : Transportent voix ou données utilisateur
- **Control Channels (CCH)** :
    - **BCCH** : Broadcast Control (infos réseau, paramètres cellule)
    - **CCCH** : Common Control (paging, accès)
    - **DCCH** : Dedicated Control (établissement d’appel, authent, signalisation SMS)

---

## Pile de protocoles

- **Couche 1 (physique)** : Modulation, transmission RF (GMSK)
- **Couche 2 (liaison)** : LAPDm — correction d’erreurs, tramage
- **Couche 3 (réseau)** : RR/MM/CC — gestion radio, mobilité, contrôle d’appel

---

## Séquence d’appel (simplifiée)

1. **Allumage** → Le téléphone scanne le BCCH, sélectionne la meilleure cellule
2. **Enregistrement** → Envoie l’IMSI, le réseau authentifie la SIM
3. **Appel/SMS** → Signalisation sur DCCH, voix/données sur TCH
4. **Handover** → Si déplacement, le réseau commute BTS/BSC
5. **Chiffrement** → Flux chiffré (A5/1 etc.) activé après authentification

---

## Données par paquets

- **GPRS/EDGE** : Utilise des timeslots additionnels pour la data (canaux « packet »), gérés par SGSN/GGSN dans le cœur
- **Débits** : De ~9,6 kbps (GSM) à 236 kbps (EDGE)


## Quel est le rôle de SS7 dans GSM ?

### SS7 (Signaling System No. 7) est le **protocole de signalisation universel** utilisé dans le cœur des réseaux télécoms (fixes et mobiles).

Dans le GSM, il joue un **rôle clé dans toutes les opérations de gestion du réseau, de l’abonné, du roaming et des services**.

---

### Principales fonctions de SS7 dans GSM :

1. **Gestion de la mobilité / Roaming**

   * SS7 permet au réseau de savoir où se trouve chaque abonné, même en itinérance (roaming international).
   * Les messages SS7 servent à mettre à jour les bases HLR/VLR (Home Location Register / Visitor Location Register) à chaque changement de zone.

2. **Authentification et sécurité**

   * Utilisé pour véhiculer les messages d’authentification entre les MSC (commutateur mobile), HLR, AUC (Authentication Center).
   * Transfert de clés, challenge/réponse lors de l’attachement d’un mobile.

3. **Établissement et routage des appels**

   * Toute la “logique” d’établissement, d’acheminement, de libération des appels (voix, SMS) repose sur la signalisation SS7.
   * Routage intelligent : SS7 sait trouver la destination réelle d’un numéro, même si l’abonné a bougé ou a activé des services (transfert d’appel, portabilité, etc).

4. **SMS**

   * Les SMS transitent côté signalisation via le réseau SS7, entre les MSC, SMSC (Short Message Service Center), HLR, etc.

5. **Services avancés**

   * Gestion du numéro court, services à valeur ajoutée (ex : renvoi, messagerie vocale, USSD, etc).

---

### Exemples de messages SS7 dans GSM

* **MAP** (Mobile Application Part) : localise, authentifie, transfère l’état de l’abonné.
* **ISUP** (ISDN User Part) : gère l’établissement d’appels voix.
* **SCCP** (Signalling Connection Control Part) : routage avancé des messages.

---

## Pourquoi SS7 est critique dans GSM ?

* **C’est le “langage” entre tous les grands équipements cœur de réseau** (MSC, HLR, VLR, SMSC, AUC, EIR…).
* Sans SS7, pas d’itinérance, pas de gestion d’abonnés, pas de routage automatique.
* Il rend possible la mobilité mondiale et la gestion dynamique de millions d’abonnés à l’échelle opérateur.

---

### À retenir

> **SS7 dans GSM** = le “système nerveux” qui coordonne toutes les opérations invisibles du réseau mobile, du simple appel au roaming international, en passant par la sécurité et les SMS.

