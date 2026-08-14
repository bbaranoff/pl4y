# 5G SA Lab: srsRAN Project + Open5GS (Ubuntu, 2024)

## 1. Prerequisites

* **OS:** Ubuntu 22.04/24.04 (x86\_64)
* **Hardware:** SDR for real RF (USRP B200/B210/X300/PlutoSDR/LimeSDR, etc.)
  *OR* use srsRAN’s software simulation for quick lab.
* **Basic requirements:** Git, CMake, build-essential, etc.

---

## 2. Install Open5GS Core Network

### a) Install dependencies

```bash
sudo apt update
sudo apt install -y git build-essential meson ninja-build python3 python3-pip python3-setuptools \
  flex bison libsctp-dev libssl-dev libnghttp2-dev libmicrohttpd-dev \
  libyaml-dev libmariadb-dev libmongoc-dev libbson-dev mongodb
```

### b) Get and build Open5GS

```bash
git clone https://github.com/open5gs/open5gs
cd open5gs
meson build --prefix=`pwd`/install
ninja -C build
ninja -C build install
```

*(Binaries will be in `open5gs/install/bin/`)*

---

## 3. Install srsRAN Project (gNB/UE)

### a) Dependencies

```bash
sudo apt install -y cmake g++ libsctp-dev libfftw3-dev libmbedtls-dev \
  libboost-program-options-dev libconfig++-dev pkg-config python3 python3-pip \
  libzmq3-dev libpcsclite-dev
```

### b) Clone and build srsRAN Project

```bash
git clone https://github.com/srsran/srsRAN_Project.git
cd srsRAN_Project
mkdir build && cd build
cmake ../
make -j$(nproc)
sudo make install
```

*(Binaries will be in `/usr/local/bin/`)*

---

## 4. Configure Open5GS (Core Network)

* All config files: `open5gs/install/etc/open5gs/`
* Key files to edit:

  * `amf.yaml` (core/AMF config)
  * `smf.yaml` (session mgmt)
  * `upf.yaml` (user-plane)
  * `udm.yaml`, `ausf.yaml`, etc.

**Minimal edits:**

* Set PLMN: `mcc: 001`, `mnc: 01` (or your custom)
* In `amf.yaml`, check your `ngap` IP address matches your gNB’s IP

### Add a test subscriber (SIM card info)

* Open `subscribers.yaml` or use the [Open5GS WebUI](https://github.com/open5gs/open5gs/wiki/WebUI).
* Example entry:

  ```yaml
  - imsi: '001010123456789'
    key: '465B5CE8B199B49FAA5F0A2EE238A6BC'
    opc: 'E8ED289DEBA952E4283B54E88E6183CA'
    amf: '8000'
    sqn: '000000000000'
  ```
* Use these credentials in your UE (real SIM or srsUE software SIM).

---

## 5. Configure srsRAN gNB

* Config file: `srsran_project/config/gnb.yaml` *(or `gnb.conf` depending on version)*

Example minimal config:

```yaml
plmn:
  mcc: 001
  mnc: 01
amf:
  addr: 127.0.0.1   # or IP of your Open5GS AMF
  port: 38412
slices:
  - sst: 1
    sd: 0x000001
```

* Set `rf.device_name` to your SDR (if using RF)
* Set network interface correctly (ex: `ngap.interface_name: lo` for local)

---

## 6. Configure srsRAN UE (if testing software UE)

* Config file: `srsran_project/config/ue.yaml` *(or `ue.conf`)*
* Set PLMN, key, opc, amf, and IMEI to match Open5GS subscriber info.
* Set RF/simulation as needed.

---

## 7. Run Open5GS Core Network

Open **multiple terminals** (or use `tmux`):

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

Or use the all-in-one launcher:

```bash
sudo ./open5gs-daemon
```

---

## 8. Run srsRAN gNB

```bash
srsran_gnb --cfg srsran_project/config/gnb.yaml
```

---

## 9. (Optional) Run srsUE (5G SA UE)

```bash
srsran_ue --cfg srsran_project/config/ue.yaml
```

Or use a physical 5G phone + SDR as RF.

---

## 10. Monitoring

* Use the **Open5GS WebUI** (if installed) for easy subscriber management & status.
* Watch logs in all terminals for attach, registration, PDU session, etc.
* Check IP connectivity: once the UE is attached, try a `ping` from UE terminal.

---

## Troubleshooting Tips

* Make sure your **PLMN, keys, and addresses match** on all configs.
* Use `127.0.0.1` or a real LAN IP for AMF/NGAP as appropriate.
* If using RF, make sure frequency, bandwidth, and SDR device are correct.
* Software mode (“null” device) works for pure software testing (no SDR needed).

---

## Useful links

* [srsRAN Project 5G Docs](https://docs.srsran.com/projects/5g/en/latest/)
* [Open5GS Docs](https://open5gs.org/open5gs/docs/)
* [Open5GS WebUI](https://github.com/open5gs/open5gs/wiki/WebUI)
* [Open5GS Subscribers Quick Start](https://open5gs.org/open5gs/docs/guide-subscription/)

