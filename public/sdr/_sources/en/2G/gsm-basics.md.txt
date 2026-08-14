# GSM Basics: Overview

**GSM** (Global System for Mobile Communications) is the most widely used cellular standard in the world, originally designed for 2G voice and SMS, and later extended to data (GPRS/EDGE).

---

## What is GSM?

- **Digital** cellular standard for mobile voice and data
- Launched in Europe in 1991; adopted globally
- 900/1800 MHz (EU/Asia), 850/1900 MHz (Americas)

---

## Core Concepts

- **Cellular network**: Divides coverage into “cells,” each served by a Base Station
- **SIM card**: Holds subscriber identity and keys
- **Voice, SMS, low-rate data**: Core services (with later upgrades for Internet access)

---

## GSM Architecture

- **MS (Mobile Station)**: Your phone (hardware + SIM)
- **BTS (Base Transceiver Station)**: “Cell tower” – handles radio link with phones
- **BSC (Base Station Controller)**: Manages multiple BTS, handles handover and resources
- **MSC (Mobile Switching Center)**: Switches calls/SMS, manages mobility and authentication
- **HLR/VLR (Home/Visitor Location Register)**: Databases for subscriber info and roaming
- **AUC**: Authentication Center (manages SIM/IMSI/Ki)
- **EIR**: Equipment Identity Register (blocks stolen phones)

```

\[MS] ⇄ \[BTS] ⇄ \[BSC] ⇄ \[MSC] ⇄ \[HLR/VLR]

```

---

## Frequency & Modulation

- **TDMA**: Time Division Multiple Access (multiple users per frequency, via timeslots)
- **GMSK**: Gaussian Minimum Shift Keying (modulation for efficient, robust RF)

---

## Security & SIM

- Each SIM has a unique **IMSI** and a secret **Ki** key
- **Authentication**: Uses A3/A8 algorithms, with session keys (Kc) for each call

---

## Radio Channels & Timeslots

- **Frequency bands**: GSM900, 1800, 850, 1900 MHz
- **Channel** = carrier frequency (200 kHz wide) divided into 8 **timeslots** (TDMA)
- **One user** = one timeslot per frame (except for control channels or “packet” data)

---

## Channel Types

- **Traffic Channels (TCH)**: Carry voice or user data
- **Control Channels (CCH)**:
    - **BCCH**: Broadcast Control (network info, cell parameters)
    - **CCCH**: Common Control (paging, access grant)
    - **DCCH**: Dedicated Control (setup, authentication, SMS signaling)

---

## Protocol Stack

- **Layer 1 (Physical)**: Handles modulation, RF transmission (GMSK)
- **Layer 2 (Data Link)**: LAPDm – error correction, framing
- **Layer 3 (Network)**: RR/MM/CC – radio resource management, mobility, call control

---

## Call Flow (Simplified)

1. **Power on** → Phone scans BCCH, selects best cell
2. **Registration** → Sends IMSI, network authenticates SIM
3. **Call/SMS** → Signaling on DCCH, voice/data on TCH
4. **Handover** → If moving, network switches BTS/BSC
5. **Encryption** → Stream cipher (A5/1 etc.) enabled after authentication

---

## Packet Data

- **GPRS/EDGE**: Uses extra timeslots for data (“packet channels”), handled by SGSN/GGSN in the core
- **Data rates**: From ~9.6 kbps (GSM) to 236 kbps (EDGE)

## What is the role of SS7 in GSM?

## **SS7** (Signaling System No. 7) is the **universal signaling protocol** used in the core of telecom networks (both fixed and mobile).

In GSM, SS7 is **fundamental for all network management, subscriber handling, roaming, and service operations**.

---

###Key functions of SS7 in GSM:**

1. **Mobility Management / Roaming**

   * SS7 allows the network to track the location of each subscriber—even when roaming internationally.
   * SS7 messages update the HLR/VLR (Home/Visitor Location Registers) whenever a user moves to a new area.

2. **Authentication and Security**

   * SS7 is used to exchange authentication messages between MSC (Mobile Switching Center), HLR, and AUC (Authentication Center).
   * It handles key transfer, challenge/response during mobile registration.

3. **Call Setup and Routing**

   * All call setup, routing, and release (voice, SMS) is managed through SS7 signaling.
   * Smart routing: SS7 ensures the call/SMS reaches the right destination even if the subscriber moves or uses services like call forwarding.

4. **SMS Delivery**

   * SMS messages are delivered over SS7 signaling, passing between MSC, SMSC (Short Message Service Center), HLR, etc.

5. **Advanced Services**

   * Handles short codes, value-added services (e.g., call forwarding, voicemail, USSD, etc.).

---

## Examples of SS7 messages in GSM

* **MAP** (Mobile Application Part): handles subscriber location, authentication, status transfer.
* **ISUP** (ISDN User Part): manages voice call setup.
* **SCCP** (Signaling Connection Control Part): advanced routing for signaling messages.

---

## Why is SS7 critical in GSM? 

* **It’s the “language” used between all major core network components** (MSC, HLR, VLR, SMSC, AUC, EIR, etc.).
* Without SS7, there would be no roaming, no subscriber management, and no automatic routing.
* It enables global mobility and real-time management of millions of subscribers for operators.

---

## In summary

> **SS7 in GSM = the “nervous system” of the mobile network, coordinating all behind-the-scenes operations—from simple calls and SMS to international roaming and security.**

