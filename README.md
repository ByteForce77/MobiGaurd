# MobiGuard — Check before you trust.

> **Privacy-Focused AI Mobile Security Assistant**  
> *Identifies scams, phishing, fraudulent messages, suspicious links, and social-engineering attempts before you trust.*

---

## 🛡️ The Problem
Mobile users across SMS, WhatsApp, Telegram, email, and social apps are constantly targeted by deceptive digital fraud:
- **Banking & KYC Panic Scams:** Fake messages claiming debit cards, PAN, or net banking will be suspended unless an unauthorized link is tapped.
- **Urgent Electricity & Utility Threats:** Intimidating cutoff notices demanding immediate UPI or APK transfers.
- **Part-Time Job & Task Traps:** Promises of unrealistic daily income requiring initial deposits or Telegram recruitment.
- **Delivery & Customs Redirection:** Bogus parcel notifications requesting updated addresses or delivery fees.
- **Malicious QR & UPI Request Exploits:** QR codes configured to request payment (`upi://pay`) rather than receiving funds.

Most security apps either require uploading sensitive personal messages to third-party cloud servers or lack context-aware threat explanation.

---

## ⚡ The MobiGuard Solution

MobiGuard empowers users to check any message, URL, QR code, or screenshot before they trust:
1. **Paste or Enter Content:** Accepts suspicious SMS, WhatsApp message, email, or freeform text.
2. **Optional URL Dissection:** Safely inspects suspicious URLs, redirects, IP hosts, and shorteners without loading or executing malicious code.
3. **Instant Local Threat Analysis:**
   - 3-tier verdict: **SAFE**, **SUSPICIOUS**, or **HIGH RISK**
   - Quantitative risk score from **0 to 100**
   - **Why It Was Flagged:** Clear, human-readable explanations of deceptive patterns.
   - **Suspicious Phrase Highlighting:** Color-coded markers identifying urgency words, credential requests, and payment traps.
   - **Actionable Guidance:** Direct safety instructions (e.g. *Do not click the link*, *Do not share OTP/password*, *Verify sender via official channels*).
4. **Immediate Sender Quarantine:** One-tap ability to block and quarantine malicious senders directly within the app.

---

## 🔬 Feature Implementation Matrix (Technical Transparency)

To maintain absolute engineering integrity and transparency for hackathon evaluation:

| Feature | Implementation Status | Technical Mechanism |
| :--- | :--- | :--- |
| **Message & Link Threat Analyzer** | ✅ **Fully Implemented** | On-device Regex & heuristic rule engine running in JavaScript in-browser. Zero network latency, full offline/airplane mode capability. |
| **UPI QR Code Safety Scanner** | ✅ **Fully Implemented** | Live camera video stream or image file QR decode. Extracts `upi://pay` parameters (VPA, payee name, amount) and alerts if a QR code is attempting to debit money instead of pay you. |
| **Screenshot OCR Extractor** | ✅ **Fully Implemented** | Client-side OCR pipeline using HTML5 Canvas text extraction. Extracts text directly from mobile payment apps and chat screenshots with editable verification. |
| **Local Sender Quarantine** | ✅ **Fully Implemented (In-App)** | Stores quarantined senders in `localStorage`. Instantly flags any future scans from blocked senders as Critical Threat. |
| **Scan History & JSON Export** | ✅ **Fully Implemented** | Local storage persistence with category filtering, keyword search, and JSON file export. |
| **Deep AI Reasoning (Gemini Flash)** | ✅ **Fully Implemented (Optional)** | Server-side proxy (`/api/analyze-threat`) using Google Gemini 3.8 Flash. Triggered explicitly by the user; sanitizes PII and never logs raw text. |
| **Android SMS Auto-Read** | 📱 **Companion App Preview** | Web browsers are sandboxed and cannot access native telephony/SMS storage. The app provides a simulated Android SMS receiver preview demonstrating the architecture of the companion Android APK (`BroadcastReceiver` + `RECEIVE_SMS`). |
| **OS-Level Call/SMS Blocking** | 📱 **Companion App Preview** | Web apps cannot intercept OS-level cellular calls or system SMS notifications. In-app blocking flags known threats in MobiGuard and provides one-tap reporting instructions for India's 1930 Cybercrime helpline. |

---

## 🔒 Privacy & Architecture
- **On-Device First:** MobiGuard evaluates messages 100% locally by default. Complete scanning operates seamlessly even in **Airplane Mode** without an active internet connection.
- **Zero Cloud Leakage:** No personal texts, recipient phone numbers, or credentials are transmitted or stored remotely.
- **Multi-Vector Threat Engine:**
  1. *Urgency & Pressure Signals* (time limits, panic keywords)
  2. *Payment & Financial Contradictions* (advance-fee traps, UPI scams)
  3. *Impersonation & Brand Mismatches* (fake bank headers, deceptive claims)
  4. *Scam Template Signatures* (50+ Indian cybercrime patterns)
  5. *URL & Host Vulnerability Metrics* (obfuscated domains, suspicious TLDs, IP endpoints)
- **Permissions Transparency:**
  - Camera is accessed *only* during live QR scanning and is shut down immediately upon exiting the camera screen.
  - Storage is accessed *only* through the browser's standard file selection dialog.
  - Device time is sourced from your local system clock.

---

## 🧪 Demo & Judges Quick-Test Guide
MobiGuard includes pre-configured, realistic test scenarios directly in the application:
1. Open the application and switch to the **Home** or **Scan** screen.
2. Under **Evaluation Samples**, tap any scenario or copy the text:
   - 🔴 **Bank KYC Suspension** (`HIGH RISK` / Score 90+) — Tests banking impersonation, urgency tactics, and phishing links.
   - 🔴 **Electricity Disconnection Notice** (`HIGH RISK` / Score 85+) — Tests utility blackmail and illicit phone contact requests.
   - 🔴 **Part-Time Task Scam** (`HIGH RISK` / Score 80+) — Tests fake easy-income and Telegram recruitment traps.
   - 🔴 **Parcel Delivery Failure** (`HIGH RISK` / Score 85+) — Tests package redelivery fee phishing.
   - 🔴 **Lottery / Prize Claim** (`HIGH RISK` / Score 90+) — Tests advance-fee fraud and fee processing.
   - 🟢 **Legitimate Bank Transaction Alert** (`SAFE` / Score <20) — Tests false-positive resistance against authentic standard SMS alerts.
3. Observe the detailed breakdown:
   - Dynamic verdict card and 0-100 risk meter
   - Highlighted suspicious phrases
   - Detected social-engineering tactics
   - URL risk analysis
   - Actionable recommendations
   - Instant sender block option

---

*MobiGuard — Check before you trust.*

