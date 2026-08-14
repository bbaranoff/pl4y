# Modular EGPRS Installation Guide (Osmocom + SDR)

## Chapter 1 — Overview

This guide describes the modular installation of an **EGPRS** (GPRS/EDGE) infrastructure based on Osmocom and SDR (USRP, BladeRF).  
Each chapter details a module, its role, dependencies, and options.  
Everything can be scripted for Dockerfile integration or manual deployment on Debian/Ubuntu 22.04+.

---

## Chapter 2 — System Dependencies

First, install the essential build tools, libraries, python, and debugging tools:
- Compilation: `gcc`, `g++`, `make`, `cmake`, `autoconf`, `automake`, `libtool`, etc.
- System libs: `libusb-1.0-0-dev`, `libedit-dev`, `libfftw3-dev`, `liburing-dev`, …
- Python development: `python3-dev`, `python3-pip`, `python3-numpy`, `python3-mako`, `python3-lxml`, `python3-six`, …
- Additional tools: `nano`, `git`, `wget`, `curl`, `tmux`, `doxygen`, `ethtool`, etc.

**Install command:**
```sh
apt update
apt install -y <all-listed-packages>
````

---

## Chapter 3 — SDR & Hardware (UHD, BladeRF)

### 3.1 — UHD (USRP/Ettus)

* **libuhd-dev, uhd-host**: Drivers and tools for USRP devices.

* **Firmware images**:

```sh
python3 /usr/lib/uhd/utils/uhd_images_downloader.py
```

* **udev rule** for auto-detection:

```sh
wget https://raw.githubusercontent.com/EttusResearch/uhd/refs/heads/master/host/utils/uhd-usrp.rules && cp uhd-usrp.rules /etc/udev/rules.d/
```

### 3.2 — BladeRF (Nuand)

* **libbladerf-dev** + build from source:

```sh
git clone https://github.com/nuand/BladeRF /opt/GSM/BladeRF
cd /opt/GSM/BladeRF && mkdir build && cd build
cmake .. && make -j$(nproc) && make install && ldconfig
```

---

## Chapter 4 — Core Osmocom Libraries

These libraries are the foundation of the entire Osmocom GSM stack.

* **libosmocore**: GSM primitives, timers, protocol management.
* **libosmo-netif**: Network interfaces.
* **libosmo-abis**: Abis interface support (BTS ↔ BSC).

**Build each library:**

```sh
git clone https://github.com/osmocom/<repo>
cd <repo> && autoreconf -fi && ./configure && make -j$(nproc) && make install && ldconfig
```

*(replace `<repo>` with the library name)*

---

## Chapter 5 — GSM/EDGE Core Stack

**Osmocom provides a separate module for each core network component:**

* **osmo-hlr**: Home Location Register (subscriber database)
* **osmo-msc**: Mobile Switching Center (calls, SMS, mobility)
* **osmo-bsc**: Base Station Controller (BTS management, handover)
* **osmo-sgsn**: Serving GPRS Support Node (GPRS/EDGE session management)
* **osmo-ggsn**: Gateway GPRS Support Node (IP/data gateway)
* **osmo-mgw**: Media Gateway (voice/data streams)
* **osmo-pcu**: Packet Control Unit (GPRS/EDGE frame management)
* **libosmo-sigtran**: SIGTRAN/SS7 over IP
* **libsmpp34**: SMPP library (SMS handling)
* **libgtpnl**: GTP (GPRS Tunneling Protocol for mobile data)

**Generic build example:**

```sh
git clone https://github.com/osmocom/<module>
cd <module> && autoreconf -fi && ./configure [OPTIONS] && make -j$(nproc) && make install && ldconfig
```

* Options like `--enable-gtp-linux`, `--enable-iu`, `--enable-smpp`, etc, are set depending on the module.

---

## Chapter 6 — Radio Layers (TRX/BTS)

* **osmo-trx**: SDR Transceiver (modulation, A5/x, radio PHY)
* **osmo-bts**: Software interface for the TRX (BTS software)

  * Option: `--enable-trx` to enable SDR mode.

**Typical build:**

```sh
git clone https://github.com/osmocom/osmo-trx
cd osmo-trx && autoreconf -fi && ./configure --with-uhd && make -j$(nproc) && make install && ldconfig

git clone https://github.com/osmocom/osmo-bts
cd osmo-bts && autoreconf -fi && ./configure --enable-trx && make -j$(nproc) && make install && ldconfig
```

---

## Chapter 7 — Services & Additional Tools

* **osmo-sip-connector**: GSM ↔ VoIP SIP gateway (for IP calls)
* **SIM tools**: `pcsc-tools`, `pcscd`, `libpcsclite-dev`
* **iptables**, **tmux**, **nano**, **python3-pip**: System utilities
* **python3-requests**: For API/network scripts

**Install example:**

```sh
apt install -y iptables tmux nano python3-pip python3-requests
pip3 install requests
```

---

## Chapter 8 — Modular Script (bash)

```bash
#!/bin/bash
# EGPRS/Osmocom Stack Modular Installer
# Builds a complete SDR-enabled GSM/EDGE stack: USRP, BladeRF, full Osmocom core, and all dependencies.
# Author: Bastien / bbaranoff (software-defined-radio.com)
# Tested: Ubuntu 22.04+

set -e
N=$(nproc) || N=2
ROOT=/opt/GSM

# ----------------------------------------
# Chapter 2 — System Dependencies
# ----------------------------------------
install_deps() {
    echo "==> Installing base system and build dependencies..."
    apt update
    apt install -y \
        gcc g++ make cmake autoconf automake libtool pkg-config \
        libedit-dev libfftw3-dev libusb-1.0-0-dev liburing-dev \
        nano git wget curl tmux doxygen ethtool \
        python3 python3-dev python3-pip python3-six python3-mako python3-lxml python3-numpy python3-pybind11 python3-requests python3-scipy python3-setuptools python3-ruamel.yaml \
        libpcsclite-dev pcsc-tools pcscd cpufrequtils libsctp-dev libconfig++-dev libconfig-dev libmbedtls-dev \
        libtalloc-dev libgnutls28-dev libmnl-dev libortp-dev libdbd-sqlite3 iproute2 iputils-ping \
        libsqlite3-dev libdbi-dev libc-ares-dev libsofia-sip-ua-glib-dev telnet \
        systemd systemd-sysv dbus dbus-user-session ccache libboost-all-dev libncurses5 libncurses5-dev \
        libusb-1.0-0 libusb-dev iptables udev
}

# ----------------------------------------
# Chapter 3 — SDR Drivers & Firmware
# ----------------------------------------

install_uhd() {
    echo "==> Installing USRP/UHD dependencies and downloading firmware images..."
    apt install -y libuhd-dev uhd-host
    python3 /usr/lib/uhd/utils/uhd_images_downloader.py
    # Install Ettus USRP udev rules
    wget -O /etc/udev/rules.d/uhd-usrp.rules https://raw.githubusercontent.com/EttusResearch/uhd/refs/heads/master/host/utils/uhd-usrp.rules
    echo "export UHD_MODULE_PATH=/usr/lib/uhd/modules" >> /root/.bashrc
}

install_bladerf() {
    echo "==> Installing BladeRF dependencies and building from source..."
    apt install -y libbladerf-dev
    git clone https://github.com/nuand/BladeRF $ROOT/BladeRF || true
    cd $ROOT/BladeRF
    mkdir -p build && cd build
    cmake .. && make -j$N && make install && ldconfig
}

# ----------------------------------------
# Chapter 4 — Osmocom Base Libraries
# ----------------------------------------
build_osmo_lib() {
    echo "==> Building Osmocom core libraries: libosmocore, libosmo-netif, libosmo-abis"
    for repo in libosmocore libosmo-netif libosmo-abis; do
        git clone https://github.com/osmocom/$repo $ROOT/$repo || true
        cd $ROOT/$repo
        autoreconf -fi
        ./configure
        make -j$N
        make install
        ldconfig
    done
}

# ----------------------------------------
# Chapter 5/6 — Core Network, Radio, and Edge Modules
# ----------------------------------------
build_osmo_core() {
    echo "==> Building Osmocom network, radio and GPRS modules..."
    
    # HLR (subscriber DB)
    git clone https://github.com/osmocom/osmo-hlr $ROOT/osmo-hlr || true
    cd $ROOT/osmo-hlr && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # Media Gateway
    git clone https://github.com/osmocom/osmo-mgw $ROOT/osmo-mgw || true
    cd $ROOT/osmo-mgw && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # SIGTRAN (SS7 over IP)
    git clone https://gitea.osmocom.org/osmocom/libosmo-sigtran $ROOT/libosmo-sigtran || true
    cd $ROOT/libosmo-sigtran && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # libsmpp34 (for SMS)
    git clone https://github.com/osmocom/libsmpp34 $ROOT/libsmpp34 || true
    cd $ROOT/libsmpp34 && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # libgtpnl (for GTP tunnel support)
    git clone https://github.com/osmocom/libgtpnl $ROOT/libgtpnl || true
    cd $ROOT/libgtpnl && autoreconf -fi && ./configure --enable-gtp-linux && make -j$N && make install && ldconfig

    # Core network elements (order matters: GGSN, SGSN, MSC, BSC, PCU)
    git clone https://github.com/osmocom/osmo-ggsn $ROOT/osmo-ggsn || true
    cd $ROOT/osmo-ggsn && autoreconf -fi && ./configure --enable-gtp-linux && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-sgsn $ROOT/osmo-sgsn || true
    cd $ROOT/osmo-sgsn && autoreconf -fi && ./configure --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-msc $ROOT/osmo-msc || true
    cd $ROOT/osmo-msc && autoreconf -fi && ./configure --enable-smpp --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-bsc $ROOT/osmo-bsc || true
    cd $ROOT/osmo-bsc && autoreconf -fi && ./configure --enable-iu && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-pcu $ROOT/osmo-pcu || true
    cd $ROOT/osmo-pcu && autoreconf -fi && ./configure && make -j$N && make install && ldconfig

    # Radio layers: TRX, BTS
    git clone https://github.com/osmocom/osmo-trx $ROOT/osmo-trx || true
    cd $ROOT/osmo-trx && autoreconf -fi && ./configure --with-uhd && make -j$N && make install && ldconfig

    git clone https://github.com/osmocom/osmo-bts $ROOT/osmo-bts || true
    cd $ROOT/osmo-bts && autoreconf -fi && ./configure --enable-trx && make -j$N && make install && ldconfig

    # SIP connector for VoIP/SIP support
    git clone https://github.com/osmocom/osmo-sip-connector $ROOT/osmo-sip-connector || true
    cd $ROOT/osmo-sip-connector && autoreconf -fi && ./configure && make -j$N && make install && ldconfig
}

# ----------------------------------------
# Chapter 7 — Python & System Utilities
# ----------------------------------------
install_python_utils() {
    echo "==> Installing pip dependencies and updating UHD images..."
    pip3 install requests
    # (Re)download UHD firmware images in case not done above
    python3 /usr/lib/uhd/utils/uhd_images_downloader.py || true
}

# ----------------------------------------
# Main Sequence
# ----------------------------------------
main() {
    install_deps
    install_uhd
    install_bladerf
    build_osmo_lib
    build_osmo_core
    install_python_utils
    echo "==> All modules installed. You can now proceed with configuration and runtime scripts."
}

main "$@"
```

---

## Chapter 9 — Summary & Best Practices

* **Each module** is an independent building block, build in sequence (libs → core → radio → services)
* For EGPRS, the order **BTS/TRX/PCU/SGSN/GGSN** is critical (data flows through each component)
* **Separation of modules** = easier maintenance & debugging.
* Always check system/hardware dependencies (USRP drivers, BladeRF firmware, udev rules…)

