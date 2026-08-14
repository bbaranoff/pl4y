# OpenBTS-UMTS Quick Install & Usage (Ubuntu, USRP)

## 1. Requirements

* OS: Ubuntu 20.04/22.04 (also works on 18.04)
* SDR: USRP B200/B210, N210, X310, etc.
* Dependencies: UHD, libosip2, libsctp, asterisk (optional for SIP/voice)

---

## 2. Install UHD (USRP driver)

```bash
sudo apt update
sudo apt install -y libuhd-dev uhd-host
sudo uhd_images_downloader
```

> Check your USRP:
> `uhd_find_devices`
> `uhd_usrp_probe`

---

## 3. Install build dependencies

```bash
sudo apt install -y build-essential git cmake autoconf automake libtool \
  libosip2-dev libsctp-dev libuhd-dev libsqlite3-dev libboost-all-dev \
  libreadline-dev libncurses5-dev asterisk
```

---

## 4. Build and install OpenBTS-UMTS

a) Clone the repository

```bash
git clone https://github.com/RangeNetworks/openbts-umts.git
cd openbts-umts
```

b) Compile

```bash
./autogen.sh
./configure
make -j$(nproc)
sudo make install
```

---

## 5. Prepare configuration

* Copy example configs from `apps/` to `/etc/OpenBTSUMTS` if needed.
* Edit:

  * NodeB.tab: cell configuration
  * OpenBTSUMTS.db: SQLite database (allowed IMSIs/users)
  * Main config: OpenBTSUMTS.config

Tip: For first tests, use open mode (accept all IMSIs).

---

## 6. Start OpenBTS-UMTS

```bash
sudo OpenBTSUMTS
```

* Monitor the console: check for USRP detection and cell creation.
* Use the interactive CLI for logs and control (`help` for commands).

---

## 7. Connect a 3G phone

* Use a 3G phone (rooted/dev mode preferred) or a programmable SIM.
* The phone’s IMSI must be in the database (`OpenBTSUMTS.db`).
* For SIP + Asterisk:

  * Configure a SIP account in OpenBTS-UMTS and on your softphone.
  * Test calls between SIP devices and the phone.

---

## 8. Debug & logs

* Logs: `/var/log/OpenBTSUMTS/`
* Interactive CLI (`help` command)
* Check: RF status, synchronization, attach/detach events

---

## 9. Stop cleanly

```bash
sudo pkill OpenBTSUMTS
```

---

### Useful links

* [OpenBTS-UMTS GitHub repo](https://github.com/RangeNetworks/openbts-umts)
* [Experimental guide](https://github.com/RangeNetworks/openbts-umts/blob/master/README.md)
* [RangeNetworks SDR Docs](http://www.rangenetworks.com/support/)

---

Need a sample config (NodeB.tab, users), an all-in-one script, or a comparison with OAI? Just ask!

