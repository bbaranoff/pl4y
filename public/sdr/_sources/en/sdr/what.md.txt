# What is an SDR?

## Definition

**Software‑Defined Radio (SDR)** is a radio communication system where traditional hardware components (mixers, filters, amplifiers, modulators/demodulators, detectors, etc.) are implemented in software running on a general-purpose computer or embedded system. The actual “radio” becomes a piece of code—hardware just samples analog signals and digitizes them.

> **Analogy:** In classic radios, each standard (AM, FM, GSM, WiFi…) needs its own circuitry. In SDR, one device—plus the right software—can do it all.

---

## How It Works

1. **Antenna**
   Receives or transmits electromagnetic waves (RF).

2. **RF Front-End**
   Minimal analog circuitry. For *receivers*: amplifies and downconverts signals to a frequency suitable for digitization. For *transmitters*: does the reverse.

3. **ADC / DAC**

   * **Analog-to-Digital Converter (ADC):** Samples incoming analog signals at high speed, converting to digital for software processing.
   * **Digital-to-Analog Converter (DAC):** Converts processed digital signals back to analog for transmission.

4. **Processing Unit (CPU/GPU/FPGA)**
   All modulation, demodulation, filtering, decoding, and protocol logic handled in software—can run on a PC, Raspberry Pi, smartphone, or FPGA.

5. **Software Stack**
   Software frameworks (like GNU Radio, SDR#, SDRangel, GQRX, srsRAN) manage signal processing and provide user interface, demodulation, and sometimes full-stack radio network functionality.

---

## Key Features and Advantages

* **Flexibility:** One SDR can receive/decode or transmit many types of signals—just change the software.
* **Upgradeability:** New protocols/standards added via software updates, not hardware swaps.
* **Cost Efficiency:** Reduces the need for multiple pieces of radio equipment.
* **Rapid Prototyping:** Engineers and researchers can experiment with new ideas quickly.
* **Wide Application:** From simple FM radio, weather satellite imagery, and ADS-B aircraft tracking to GSM/LTE hacking, spectrum analysis, or amateur radio.

---

## Common SDR Hardware Examples

| Model          | Price (EUR) | Frequency Range | Notable Use Cases    |
| -------------- | ----------- | --------------- | -------------------- |
| RTL‑SDR v3     | 35‑50       | 500 kHz–1.7 GHz | Entry-level, RX only |
| HackRF One     | 300‑400     | 1 MHz–6 GHz     | TX/RX, dev & hacking |
| ADALM‑PLUTO    | 150‑200     | 325 MHz–3.8 GHz | LTE, WiFi, Edu       |
| LimeSDR Mini   | 200‑300     | 10 MHz–3.5 GHz  | MIMO, LTE, GSM, Edu  |
| USRP B200/B210 | 1,000+      | 70 MHz–6 GHz    | Pro research/dev     |

---

## Typical SDR Applications

* **Amateur Radio** (all bands, digital/analog modes)
* **Spectrum Monitoring** (searching for signals, interference hunting)
* **Reverse Engineering** (protocol analysis, wireless security)
* **Cellular Networks** (GSM, LTE sniffing, IMSI catchers, base stations)
* **Satellite Communication** (weather, navigation, TV, amateur)
* **Wireless Device Hacking** (IoT, pagers, smart meters)
* **Education and Research** (labs, courses, student projects)

---

## SDR in Practice

## What You Need to Start

* **SDR Hardware:** RTL-SDR is the cheapest for RX; HackRF/PlutoSDR for RX/TX.
* **Antenna:** Basic for FM; wideband/optimized for more advanced tasks.
* **PC or Embedded Device:** Even a Raspberry Pi works for many tasks.
* **Software:** GNU Radio (advanced), SDR# (Windows, easy), GQRX (Linux), etc.

---

## Real‑World Example: RTL‑SDR

* **Plug in the dongle via USB**
* **Install SDR# or GQRX**
* **Tune to 100 MHz — receive FM radio!**
* **Change software/plugin — decode ADS-B aircraft signals, pager traffic, weather satellites, or even capture signals from smart home devices**

---

## Why SDR Matters

**SDR** breaks the hardware barrier in wireless.
It puts the power to analyze, prototype, and *own* the radio spectrum into the hands of anyone with a laptop.

*Whether you’re a student, hacker, scientist, or engineer: SDR means radio is no longer a black box—you can see, hear, and *shape* the invisible world around you.*

