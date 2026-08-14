[English](../../en/sdr/sdr.md)
# Différents types de SDR

## Tableau comparatif des SDR (Specs + Prix, 2025)

| **SDR (modèle)**            | **Plage RF**                            | **Tx/Rx**        | **Bande instant.** | **FPGA/Chipset**                | **Interface**  | **Points forts**                          | **Prix indicatif\***                            |
| --------------------------- | --------------------------------------- | ---------------- | ------------------ | ------------------------------- | -------------- | ------------------------------------------ | ------------------------------------------------ |
| **RTL‑SDR V3**              | 500 kHz–1,7 GHz                         | RX seulement     | ~2,4 MHz           | RTL2832U + R820T2               | USB 2.0        | Ultra abordable, RX seul, énorme écosystème | 30–40 $ (30–40 €)                               |
| **ADALM‑PLUTO (PlutoSDR)**  | 325 MHz–3,8 GHz (mod : ~70–6000 MHz)    | 1Tx / 1Rx (full) | 20 MHz             | Zynq Z-7010 + AD9363            | USB 2.0        | Ultra compact, bidouillable, éducatif       | 230–250 $ (230–250 €), France : ~350 €           |
| **LimeSDR Mini 2.0**        | ~10 MHz–3,5 GHz                         | 1Tx / 1Rx        | 40 MHz             | Lattice ECP5 + LMS7002M         | USB 3.0        | Basse latence, DSP avancé, open source      | 440 $ (~410 €)                                  |
| **HackRF One**              | 1 MHz–6 GHz                             | 1Tx / 1Rx (half) | 20 MHz             | MAX2837/2839                    | USB 2.0        | Open source, hacking, très populaire        | 320–350 $ (~320–350 €)                          |
| **BladeRF 2.0 Micro xA4**   | ~47 MHz–6 GHz                           | 1Tx / 1Rx (full) | 56 MHz             | Intel Cyclone V FPGA + LMS7002M | USB 3.0        | Puissant, large bande, forte communauté     | 649 € (~700 $)                                  |
| **AntSDR E200/E310**        | 70 MHz–6 GHz (AD9361/63)                | 2Tx / 2Rx (full) | 56–61,44 MHz       | Zynq-7020 + AD9361/63           | Ethernet, USB  | MIMO 2x2, HW/SW ouverts, flexible          | 317 € (AD9363)<br>472 € (AD9361)<br>eBay : 475–800 $ |
| **LibreSDR B210/B220 Mini** | 70 MHz–6 GHz                            | 2Tx / 2Rx (full) | ~56 MHz            | FPGA + AD9361/63                | USB 3.0        | Compatible USRP B210, ultra compact        | 369 €                                          |
| **USRP B210**               | 70 MHz–6 GHz                            | 2Tx / 2Rx (full) | 56 MHz             | Spartan-6 + AD9361              | USB 3.0        | Référence labo/éduc, UHD, robuste          | 2 165 $ (~2 000 €)                              |
| **USRP X310**               | 10 MHz–6 GHz* (modulaire)               | 2Tx / 2Rx (full) | 160 MHz            | Kintex-7, RF modulaire          | 1/10 GbE, PCIe | Recherche/pro, BW extrême, modulaire        | 10 400–11 400 $                                 |

\*Prix pour cartes neuves seules, hors taxes/frais port (2025) ; à vérifier.

**Légende :**
- *Full* : duplex intégral (Tx+Rx simultanés)
- *Half* : semi-duplex (Tx ou Rx, pas les deux en même temps)

---

## Points d’équilibre à l’usage (vue miroir/équilibrée)

- **ADALM-PLUTO, HackRF** : Entrée de gamme, parfait pour formation, hacking, prototypage, limité en BW instantané & duplex.
- **LimeSDR Mini, BladeRF** : Plus puissants, USB 3.0, vrai DSP/FPGA, hobby + proto sérieux.
- **AntSDR, LibreSDR** : Excellent rapport perf/prix pour 2x2 MIMO, idéal recherche avancée, flexible, open source.
- **USRP B210/X310** : Plates-formes de référence pour la recherche/lab, pro, coûteux mais perfs ultimes (surtout X310).

---

<div style="display: flex; flex-wrap: wrap; gap: 18px; justify-content: flex-start; align-items: flex-start;">

<a href="https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/" style="text-align:center">
  <img src="https://www.rtl-sdr.com/wp-content/uploads/2023/03/improvements_v3.jpg" alt="RTL-SDR V3" width="220"/><br>
  <b>RTL‑SDR V3</b>
</a>

<a href="https://www.analog.com/en/design-center/evaluation-hardware-and-software/evaluation-boards-kits/adalm-pluto.html" style="text-align:center">
  <img src="https://www.analog.com/en/_/media/analog/en/evaluation-board-images/images/adalm-pluto-web.gif" alt="ADALM-PLUTO PlutoSDR" width="220"/><br>
  <b>ADALM-PLUTO</b>
</a>

<a href="https://www.crowdsupply.com/lime-micro/limesdr-mini-2-0" style="text-align:center">
  <img src="https://www.crowdsupply.com/img/2829/6b51f129-f3e4-4963-ba6f-70c17ffc2829/limesdr-mini-2-prototype-top-bottom-1_jpg_gallery-lg.jpg" alt="LimeSDR Mini 2.0" width="220"/><br>
  <b>LimeSDR Mini 2.0</b>
</a>

<a href="https://greatscottgadgets.com/hackrf/" style="text-align:center">
  <img src="https://greatscottgadgets.com/images/h1-preliminary1-445.jpeg" alt="HackRF One" width="220"/><br>
  <b>HackRF One</b>
</a>

<a href="https://lab401.com/products/bladerf-sdr-2-micro-xa4" style="text-align:center">
  <img src="https://lab401.com/cdn/shop/products/BladeRF-Starter-Pack-Resized_521x284.png" alt="BladeRF 2.0 Micro xA4" width="220"/><br>
  <b>BladeRF 2.0 Micro xA4</b>
</a>

<a href="https://www.crowdsupply.com/microphase-technology/antsdr-e200" style="text-align:center">
  <img src="https://www.crowdsupply.com/img/6233/8e9bd1c8-8003-40bf-b73e-3c27d58a6233/antsdr-e200-front-back-01_jpg_gallery-lg.jpg" alt="AntSDR E200" width="220"/><br>
  <b>AntSDR E200 / E310</b>
</a>

<a href="https://www.sdrstore.eu/software-defined-radio/instruments/usrp/libresdr-b210-mini-b220-mini-2r2t-xc7a200tad9361-or-xc7a100tad9363-sdr-uhd-pluto-oai-compatible.html" style="text-align:center">
  <img src="https://www.sdrstore.eu/images/ab__webp/detailed/13/download_-_2025-06-26T180436.230_jpg.webp" alt="LibreSDR B210 Mini" width="220"/><br>
  <b>LibreSDR B210/B220 Mini</b>
</a>

<a href="https://www.ettus.com/all-products/ub210-kit/" style="text-align:center">
  <img src="https://www.ettus.com/wp-content/uploads/2019/01/B210_Board-Large_2.jpg" alt="USRP B210" width="220"/><br>
  <b>USRP B210</b>
</a>

<a href="https://www.ettus.com/all-products/x310-kit/" style="text-align:center">
  <img src="https://www.ettus.com/wp-content/uploads/2024/10/NI-Ettus-X310.jpeg" alt="USRP X310" width="220"/><br>
  <b>USRP X310</b>
</a>

</div>

