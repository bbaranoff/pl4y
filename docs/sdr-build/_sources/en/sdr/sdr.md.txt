# Different kind of SDR

## SDRs Comparison Chart (Specs + Price, 2025)

| **SDR (Model)**             | **RF Range**                           | **Tx/Rx**        | **Instant BW** | **FPGA/Chipset**                | **Interface**  | **Notable Features**                      | **Approx Price\***                                |
| --------------------------- | -------------------------------------- | ---------------- | -------------- | ------------------------------- | -------------- | ----------------------------------------- | ------------------------------------------------- |
| **RTL‑SDR V3**              | 500 kHz–1.7 GHz                        | Rx only          | \~2.4 MHz      | RTL2832U + R820T2               | USB 2.0        | Super cheap, receive only, huge ecosystem | \$30–40 (€30–40)                                  |
| **ADALM‑PLUTO (PlutoSDR)**  | 325 MHz–3.8 GHz (mod to \~70–6000 MHz) | 1Tx / 1Rx (full) | 20 MHz         | Zynq Z-7010 + AD9363            | USB 2.0        | Ultra compact, hackable, educational      | \$230–250 (€230–250); France: \~€350              |
| **LimeSDR Mini 2.0**        | \~10 MHz–3.5 GHz                       | 1Tx / 1Rx        | 40 MHz         | Lattice ECP5 + LMS7002M         | USB 3.0        | Low latency, advanced DSP, open source    | \$440 (\~€410)                                    |
| **HackRF One**              | 1 MHz–6 GHz                            | 1Tx / 1Rx (half) | 20 MHz         | MAX2837/2839                    | USB 2.0        | Open source, hacking, popular, DIY crowd  | \$320–350 (\~€320–350)                            |
| **BladeRF 2.0 Micro xA4**   | \~47 MHz–6 GHz                         | 1Tx / 1Rx (full) | 56 MHz         | Intel Cyclone V FPGA + LMS7002M | USB 3.0        | Powerful, wideband, strong dev community  | €649 (\~\$700)                                    |
| **AntSDR E200/E310**        | 70 MHz–6 GHz (AD9361/63)               | 2Tx / 2Rx (full) | 56–61.44 MHz   | Zynq-7020 + AD9361/63           | Ethernet, USB  | MIMO 2x2, open HW/SW, flexible            | €317 (AD9363)<br>€472 (AD9361)<br>eBay: \$475–800 |
| **LibreSDR B210/B220 Mini** | 70 MHz–6 GHz                           | 2Tx / 2Rx (full) | \~56 MHz       | FPGA + AD9361/63                | USB 3.0        | USRP B210 compatible, ultra-compact       | €369                                              |
| **USRP B210**               | 70 MHz–6 GHz                           | 2Tx / 2Rx (full) | 56 MHz         | Spartan-6 + AD9361              | USB 3.0        | Lab/edu reference, UHD, rugged            | \$2,165 (\~€2,000)                                |
| **USRP X310**               | 10 MHz–6 GHz\* (modular)               | 2Tx / 2Rx (full) | 160 MHz        | Kintex-7, modular RF            | 1/10 GbE, PCIe | Research/pro, extreme bandwidth, modular  | \$10,396–11,435                                   |


\*Prices are for new, board-only units, no taxes/shipping, 2025; actual may vary.


**Legend:**

* *Full* = full duplex Tx+Rx.
* *Half* = half duplex (Tx or Rx, not at the same time).

## Usage “Balance Points” (Mirror/Equilibrate View)

* **ADALM-PLUTO, HackRF**: Entry level, best for education, hacking, prototyping, limited by instant bandwidth and duplex.
* **LimeSDR Mini, BladeRF**: More powerful, USB 3.0, real DSP/FPGA resources, hobby + serious prototyping.
* **AntSDR, LibreSDR**: Superb value for 2x2 MIMO, ideal for advanced research, flexible, open source.
* **USRP B210/X310**: Reference platforms for research, labs, pro dev, expensive but ultimate performance (esp. X310).

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

[1]: https://www.crowdsupply.com/microphase-technology/antsdr-e200?utm_source=chatgpt.com "AntSDR E200"
[2]: https://www.mouser.com/c/embedded-solutions/wireless-rf-modules/?series=AntSDR&srsltid=AfmBOoraiN3EH4H2z6PDesDPAALeBCxojISz5p0nyPa3mz6g0b7vj3nO&utm_source=chatgpt.com "AntSDR Series RF Modules"
[3]: https://www.ebay.com/shop/antsdr?_nkw=antsdr&utm_source=chatgpt.com "Antsdr"
[4]: https://www.crowdsupply.com/signalens/signalsdr-pro?utm_source=chatgpt.com "SignalSDR Pro"
[5]: https://www.ettus.com/all-products/ub210-kit/?utm_source=chatgpt.com "USRP B210 USB Software Defined Radio (SDR)"
[6]: https://www.ettus.com/all-products/x310-kit/?utm_source=chatgpt.com "USRP X310 High Performance Software Defined Radio"
[7]: https://www.newark.com/ni/783145-01/usrp-x310-sdr-device-160-mhz-2/dp/27AJ2473?utm_source=chatgpt.com "783145-01 - Software Defined Radios"
[8]: https://www.sdrstore.eu/software-defined-radio/instruments/usrp/libresdr-b210-mini-b220-mini-2r2t-xc7a200tad9361-or-xc7a100tad9363-sdr-uhd-pluto-oai-compatible/?utm_source=chatgpt.com "LibreSDR B210 Mini B220 Mini 70MHz-6GHz 2R2T SDR ..."
[9]: https://www.nuand.com/product/bladerf-x40/?utm_source=chatgpt.com "bladeRF x40 - Nuand"
[10]: https://www.nuand.com/product/bladerf-xa9/?utm_source=chatgpt.com "bladeRF 2.0 micro xA9 - Nuand"
