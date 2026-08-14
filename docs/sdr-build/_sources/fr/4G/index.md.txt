# 4G : LTE/LTE+

Retrouve ici les principales solutions logicielles pour déployer, expérimenter ou auditer des réseaux 4G/LTE :
— pour la recherche, les tests sécurité, l’enseignement ou le prototypage.

---

## Navigation rapide

```{toctree}
:maxdepth: 2
:caption: Menu 4G
srsran.md
```

---

## Présentation rapide des stacks

### srsRAN (ex-srsLTE)

* **Description** : Suite logicielle complète (eNodeB, EPC, UE) pour LTE (4G) et NR (5G), très utilisée en recherche et prototypage.
* **Points forts** : Facile à installer (PPA dispo), docs claires, compatible SDR, supporte 4G/5G, mode standalone ou intégré.
* **Usage** : eNodeB, EPC, UE logiciel, analyse réseau, tests sécurité, PoC radio.

### OpenLTE

* **Description** : Projet plus minimaliste, focalisé sur la réception LTE, décodage de signaux et expérimentation SDR.
* **Points forts** : Ultra-léger, simple pour décodage cellId et démo LTE, peu adapté aux déploiements complets.
* **Usage** : Décodage de signaux LTE, identification cellId, analyse spectrale, démos SDR.

### OpenAirInterface (OAI)

* **Description** : Plateforme de recherche télécom très complète (4G, 5G), compatible eNodeB, EPC, gNodeB.
* **Points forts** : Architecture fidèle aux standards 3GPP, nombreux modules, forte communauté académique.
* **Usage** : Recherche, tests avancés (core + RAN), expérimentation multi-cellules, protocoles 3GPP à jour.

### Open5GS

* **Description** : Core réseau EPC (LTE/4G) et 5GC (5G) en open source, API moderne, très modulaire.
* **Points forts** : Core pur (pas de RAN), facile à intégrer avec eNodeB tiers (srsRAN, OAI…), support Docker/K8s, API REST.
* **Usage** : Déploiement d’un cœur LTE/5G, intégration réseaux privés, test core standalone ou mixte, dev d’applications réseau.

---

## Comparatif rapide

| **Stack**   | **Rôle**        | **Licence** | **Points forts**       | **Limites**                   |
| ----------- | --------------- | ----------- | ---------------------- | ----------------------------- |
| **srsRAN**  | eNodeB, EPC, UE | AGPLv3      | Facile, 4G/5G, SDR     | Perf. modérée, support SDR    |
| **OpenLTE** | Rx LTE, analyse | GPLv3       | Léger, décodage facile | Incomplet, pas EPC natif      |
| **OAI**     | eNB, EPC, gNB   | OAI Public  | Fidèle 3GPP, modulaire | Setup complexe, doc technique |
| **Open5GS** | EPC, 5GC (core) | AGPLv3      | Core pur, API, moderne | Pas de RAN inclus             |

---

## Pour aller plus loin

* [srsRAN Project Docs](https://docs.srsran.com/projects/4g/en/latest/)
* [OpenLTE GitHub](https://github.com/evilsocket/openlte)
* [OpenAirInterface](https://www.openairinterface.org/)
* [Open5GS Project](https://open5gs.org/)

