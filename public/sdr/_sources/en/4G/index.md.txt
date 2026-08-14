# 4G : LTE/LTE+

Find below the main software solutions to deploy, experiment with, or audit 4G/LTE networks — for research, security testing, teaching, or prototyping.

---

## Quick Navigation

```{toctree}
:maxdepth: 2
:caption: 4G Menu
srsran.md
```

---

## Overview of Each Stack

### srsRAN (formerly srsLTE)

* **Description:** Complete software suite (eNodeB, EPC, UE) for LTE (4G) and NR (5G), widely used for research and prototyping.
* **Highlights:** Easy to install (official PPA available), good documentation, SDR support, works for both 4G/5G, standalone or integrated use.
* **Typical use:** eNodeB, EPC, software UE, network analysis, security testing, SDR PoC.

### OpenLTE

* **Description:** More minimal project, focused on LTE reception, signal decoding, and SDR experimentation.
* **Highlights:** Ultra-lightweight, simple for decoding cellId and LTE demo, less suited for full deployments.
* **Typical use:** LTE signal decoding, cellId identification, spectrum analysis, SDR demos.

### OpenAirInterface (OAI)

* **Description:** Highly complete telecom research platform (4G, 5G), supporting eNodeB, EPC, gNodeB.
* **Highlights:** Architecture faithful to 3GPP standards, many modules, strong academic community.
* **Typical use:** Research, advanced core+RAN tests, multi-cell experimentation, up-to-date 3GPP protocol implementation.

### Open5GS

* **Description:** Open source core network EPC (LTE/4G) and 5GC (5G), modern API, highly modular.
* **Highlights:** Core only (no RAN), easy to integrate with 3rd-party eNodeBs (srsRAN, OAI, etc.), supports Docker/K8s, REST API.
* **Typical use:** LTE/5G core deployments, private network integration, standalone or mixed core testing, network application development.

---

## Quick Comparison Table

| **Stack**   | **Role**         | **License** | **Highlights**           | **Limitations**              |
| ----------- | ---------------- | ----------- | ------------------------ | ---------------------------- |
| **srsRAN**  | eNodeB, EPC, UE  | AGPLv3      | Easy, 4G/5G, SDR support | Moderate perf., SDR focus    |
| **OpenLTE** | LTE Rx, Analysis | GPLv3       | Lightweight, simple Rx   | Not complete, no native EPC  |
| **OAI**     | eNB, EPC, gNB    | OAI Public  | 3GPP accurate, modular   | Complex setup, technical doc |
| **Open5GS** | EPC, 5GC (Core)  | AGPLv3      | Pure core, modern API    | No RAN included              |

---

## Useful Links

* [srsRAN Project Docs](https://docs.srsran.com/projects/4g/en/latest/)
* [OpenLTE GitHub](https://github.com/evilsocket/openlte)
* [OpenAirInterface](https://www.openairinterface.org/)
* [Open5GS Project](https://open5gs.org/)

