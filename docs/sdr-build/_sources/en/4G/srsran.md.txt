# Installing srsRAN 4G (via PPA or source)

## 1. Quick Install via PPA (Ubuntu)

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:srsran/ppa
sudo apt update
sudo apt install -y srsran
```

**Check the install:**

```bash
srsenb --version
```

---

## 2. Building from Source

```bash
sudo apt update
sudo apt install -y git cmake build-essential libfftw3-dev libmbedtls-dev \
  libboost-program-options-dev libconfig++-dev libsctp-dev \
  libuhd-dev libpcsclite-dev pkg-config python3 python3-pip

git clone https://github.com/srsran/srsRAN_Project.git
cd srsRAN_Project
mkdir build && cd build
cmake ../
make -j$(nproc)
sudo make install
```

---

## 3. Generate/Configure a SIM (IMSI, Ki, OPC)

To connect a real phone or software UE, you need a SIM whose parameters are known to the **srsEPC** core.

## a. Generate a standard SIM profile

* **IMSI**: unique identifier (e.g., `001010123456789`)
* **Ki**: 16-byte key (e.g., `00112233445566778899aabbccddeeff`)
* **OPC**: 16-byte operator key (e.g., `0102030405060708090a0b0c0d0e0f10`)
* **MSISDN** (optional): virtual phone number

You can use an online generator ([Free5GC SIM Generator](https://free5gc.org/webconsole/sim.html)), or generate random values:

```bash
# Generate a random IMSI
IMSI="001010$(shuf -i 100000000-999999999 -n 1)"
# Generate Ki and OPC keys
KI=$(openssl rand -hex 16)
OPC=$(openssl rand -hex 16)
echo "IMSI: $IMSI"
echo "KI:   $KI"
echo "OPC:  $OPC"
```

## b. Add the subscriber to srsEPC

Open the subscriber config file, typically:

```bash
nano /etc/srsran/epc_user_db.csv
```

Or in your local folder: `srsRAN_Project/config/user_db.csv`

**Sample entry:**

```
IMSI,  Ki,                       OPC,                      MSISDN,     AMF,   SQN
001010123456789,00112233445566778899aabbccddeeff,0102030405060708090a0b0c0d0e0f10,1234567890,8000,000000
```

**Required fields**: IMSI, Ki, OPC (others can be left as default if not needed).

---

## 4. Program a real SIM card (optional)

If you use a programmable SIM card (Sysmocom, MagicSIM, etc.):

* Use [pySIM](https://github.com/osmocom/pysim) (Python)
* Run:

```bash
pysim-prog.py --ki $KI --opc $OPC --imsi $IMSI
```

(Adapt the command to your reader and card model.)

---

## 5. Start srsENB (eNodeB) and srsEPC (core)

In two terminals:

```bash
# Terminal 1 (eNodeB)
srsenb enb.conf

# Terminal 2 (EPC)
srsepc epc.conf
```

---

## 6. Test UE Attachment

* Power on your phone (SIM inserted, “4G/auto” network mode)
* Check for detection in the logs
* If needed, adjust the PLMN in `enb.conf` and `epc.conf` to match your SIM IMSI (e.g., MCC/MNC = 001/01)

---

### Useful Docs

* [https://docs.srsran.com/projects/4g/en/latest/index.html](https://docs.srsran.com/projects/4g/en/latest/index.html)
* [https://osmocom.org/projects/pysim/wiki](https://osmocom.org/projects/pysim/wiki)

