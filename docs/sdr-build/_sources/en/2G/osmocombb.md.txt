# OsmocomBB

**OsmocomBB** (Osmocom Baseband) is an open-source project that implements a GSM “baseband” stack for certain Motorola phones and SDR setups.

## What is OsmocomBB?

- **Mobile-side GSM protocol stack (MS, mobile station)**
- Replaces the original firmware to provide access to GSM Layer 1/2/3, protocol logging, sniffing, and testing
- Useful for: analysis, security testing, academic research, IMSI catchers, and radio fuzzing

## Architecture

- **host/osmocon**: Tool for loading the firmware onto supported devices
- **src/host/layer23**: GSM stack running on the PC (calls, SMS, sniffing, burst capture, etc.)
- **firmware/**: Baseband code to flash onto compatible phones

## Supported Hardware

- **Motorola C1xx series (C123, C118, C155, etc.)**
- Some other “Calypso” chipset-based models

## Use Cases & Limitations

- Can connect to a real 2G cell or an Osmocom BTS (osmo-bts-trx)
- Limited to pure 2G (no 3G/4G support)
- **Warning:** Transmitting without a license is illegal!  
  Use only for research or in controlled environments.

## Useful Links

- [OsmocomBB GitHub repository](https://github.com/osmocom/osmocom-bb)
- [Official Wiki](https://osmocom.org/projects/baseband/wiki/OsmocomBB)
- [Installation Guide (French)](https://www.lafabriquedunet.fr/blog/osmocombb-guide/)

---

**For SDR:** An experimental project exists to link OsmocomBB to an SDR (BladeRF, HackRF, etc.) via the “virtual layer1” interface.

## 🛰️ OsmocomBB Calypso BTS – Ubuntu 24.04 (C115/C118/C123 + PL2303)

## Required Hardware

* 2x Motorola C1xx (C115, C118, C123… Calypso chipset)
* 2x USB-to-serial cables, 2.5 mm jack (PL2303/FTDI)
* Ubuntu 24.04 x86\_64 (VM or bare metal)
* Root/sudo access

---

## 1. System dependencies

```bash
sudo apt update
sudo apt install -y \
  build-essential git cmake pkg-config autoconf automake libtool shtool \
  bison flex libtalloc-dev libpcsclite-dev zlib1g-dev libmpfr-dev libmpc-dev \
  libgmp-dev libncurses5-dev libncursesw5-dev libsofia-sip-ua-dev libxml2-dev \
  libfftw3-dev libgnutls28-dev libssl-dev python3 python3-pip \
  alsa-oss lemon libtinfo-dev
```

> **Note:** Ubuntu 24.04 uses GCC 13+ by default, but you’ll need an **ARM cross-compiler** (for Calypso firmware) based on GCC 4.9. If precompiled binaries for Ubuntu 22.04 are available, they also work on 24.04.
> See below for the ARM toolchain (prefer a direct binary rather than source build; containers/VMs can help if you run into incompatibilities).

---

## 2. Install the ARM-elf toolchain (Calypso cross-compiler)

## Option A: Direct download (recommended, ready-to-use)

```bash
# From Osmocom (preferred—do NOT build from source on new Ubuntu)
cd /opt
sudo wget https://downloads.osmocom.org/binaries/toolchain/arm-2021.03.tar.bz2
sudo tar -xjf arm-2021.03.tar.bz2
export PATH=$PATH:/opt/arm-2021.03/bin
```

> **Add the PATH export to your `.bashrc` for persistence**

## Option B: Manual compilation

> (Not recommended on Ubuntu 24.04, it’s slow and error-prone. Prefer the prebuilt toolchain.)

---

## 3. Build and install OsmocomBB

```bash
# 1. Clone the sources
git clone https://github.com/osmocom/osmocom-bb.git
cd osmocom-bb

# 2. Prepare build system
cd src
autoreconf -i

# 3. Build firmware (set toolchain if needed)
export PATH=$PATH:/opt/arm-2021.03/bin
./configure
make -j$(nproc)
sudo make install
sudo ldconfig
```

---

## 4. Flash the firmware to the phones

**Connect both phones via USB-PL2303, with battery removed.**

```bash
cd src/host/osmocon
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/rssi.highram.bin
# (Shell #1: RSSI scan, Ctrl-C to stop)
```

**Find an active ARFCN (strong GSM signal, e.g. 900/1800 MHz).**

```bash
# Load TRX (BTS) firmware
sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -s /tmp/osmocom_l2 \
  -c ../../target/firmware/board/compal_e88/trx.highram.bin -r 99
sudo ./osmocon -m c123xor -p /dev/ttyUSB1 -s /tmp/osmocom_l2.2 \
  -c ../../target/firmware/board/compal_e88/trx.highram.bin -r 99
```

---

## 5. Start the transceiver and BTS stack

In separate shells/terminals:

```bash
# Shell #3: Calypso transceiver (replace with ARFCN you found)
cd src/host/layer23/src/transceiver/
sudo ./transceiver -a [ARFCN] -2 -r 99

# Shell #4: osmo-nitb (minimal core network)
osmo-nitb -c ~/.osmocom/open-bsc.cfg -l ~/.osmocom/hlr.sqlite3 -P -m -C --debug=DRLL:DCC:DMM:DRR:DRSL:DNM

# Shell #5: osmobts-trx
osmobts-trx -c ~/.osmocom/osmo-bts.cfg -r 99
```

---

## 6. (Optional) Install Asterisk + LCR for SIP calls

```bash
sudo apt install -y asterisk asterisk-dev
git clone https://github.com/fairwaves/lcr
cd lcr
autoreconf -i
./configure --with-sip --with-gsm-bs --with-gsm-ms --with-asterisk
make
sudo make install
sudo cp chan_lcr.so /usr/lib/asterisk/modules/
```

Configure `/etc/asterisk/sip.conf` with your SIP provider credentials.

---

## 7. Verify your setup and check logs

* Watch logs in every shell: look for “registered”, “attach”, etc.
* Try to attach with a phone (Osmocom SIM or a test SIM with a PLMN your network allows).

---


## 🛰️  OsmocomBB Mobile (MS) – Ubuntu 24.04 Quick Install

## 1. Prerequisites

* **Hardware:**

  * Motorola C1xx series (C115/C118/C123/C155, etc.) with Calypso baseband
  * USB-to-serial 2.5mm cable (PL2303/FTDI)
* **System:**

  * Ubuntu 24.04 x86\_64 (native or VM)
  * Internet and sudo/root access

---

## 2. Install Dependencies

```bash
sudo apt update
sudo apt install -y \
  build-essential git cmake pkg-config autoconf automake libtool shtool \
  bison flex libtalloc-dev libpcsclite-dev zlib1g-dev libmpfr-dev libmpc-dev \
  libgmp-dev libncurses5-dev libncursesw5-dev libsofia-sip-ua-dev libxml2-dev \
  libfftw3-dev libgnutls28-dev libssl-dev python3 python3-pip \
  alsa-oss lemon libtinfo-dev
```

---

## 3. Install ARM Toolchain (cross-compiler for Calypso firmware)

```bash
cd /opt
sudo wget https://downloads.osmocom.org/binaries/toolchain/arm-2021.03.tar.bz2
sudo tar -xjf arm-2021.03.tar.bz2
export PATH=$PATH:/opt/arm-2021.03/bin
```

> *(Add that last export to your `~/.bashrc` for persistence)*

---

## 4. Clone and Build OsmocomBB

```bash
git clone https://github.com/osmocom/osmocom-bb.git
cd osmocom-bb/src
autoreconf -i
export PATH=$PATH:/opt/arm-2021.03/bin
./configure
make -j$(nproc)
```

---

## 5. Flash Mobile Firmware (Compal/C123 etc.)

1. **Connect phone via USB serial cable (battery OUT).**

2. **In one terminal:**

   ```bash
   cd host/osmocon
   sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/hello_world.highram.bin
   # (optional: test with hello_world)
   ```

3. **For full mobile firmware:**

   ```bash
   sudo ./osmocon -m c123xor -p /dev/ttyUSB0 -c ../../target/firmware/board/compal_e88/layer1.highram.bin
   ```

4. **In a second terminal:**

   ```bash
   cd host/layer23/src/mobile
   ./mobile
   ```

---

## 6. Configure `mobile.cfg` (SIM, PLMN, logging, etc.)

Create/edit `mobile.cfg` (example in `osmocom-bb/src/host/layer23/src/mobile/`):

```ini
log gsmtap 127.0.0.1
log stderr
hlr
  subscriber-list subscriber_list.csv
sim
  driver sysmo
```

*(Adjust SIM section if using a real SIM or "test SIM")*

---

## 7. Run OsmocomBB Mobile

```bash
# In host/layer23/src/mobile/
./mobile -c mobile.cfg
```

* The phone will boot, try to register to the configured network.
* Watch logs: you should see “PLMN search”, “network found”, “registration accepted” (if SIM/network match).

---

## 8. (Optional) Forward GSMTAP to Wireshark

Wireshark can listen to GSMTAP UDP packets for live decoding:

```bash
wireshark -k -Y gsmtap -i udp:4729
```

*(Add `log gsmtap 127.0.0.1` to your config for this to work.)*

---

## Useful Links

* [OsmocomBB Wiki](https://osmocom.org/projects/baseband/wiki)
* [OsmocomBB Mailing List/Forum](https://lists.osmocom.org/mailman/listinfo/baseband-devel)
* [Firmware Toolchain](https://downloads.osmocom.org/binaries/toolchain/)
* [BTS HowTo](https://osmocom.org/projects/baseband/wiki/CalypsoBTS)

