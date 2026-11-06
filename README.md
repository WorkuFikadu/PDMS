# National Patient Data Management System (NPDMS)
### A Unified, Secure, and Interoperable Patient Health Record Platform for Ethiopia

**Project Type:** Final-Year Software Engineering Capstone Project  
**Author:** Worku Fikadu  
**Institution:** Jimma University – Department of Computer Science  
**Academic Year:** 2026/2027 (November 2026)  
**Target Coverage:** Ethiopian Healthcare Facilities (Jimma University Medical Center, Shenen Gibe Hospital, Agaro Primary Hospital, Tikur Anbessa Hospital, and Primary Health Centers)

---

## 1. Project Overview & Motivation

Patient records in Ethiopia are frequently fragmented across individual hospitals and clinics. When a patient travels between facilities—such as from a primary hospital in Agaro to a specialized referral center at Jimma University Medical Center (JUMC)—clinicians lack timely access to prior diagnoses, allergy profiles, medication histories, and laboratory findings. This causes:
- Dangerous duplicate prescribing and severe allergic adverse events.
- Costly repetition of diagnostic investigations.
- Care discontinuities in referrals and emergency resuscitation.

The **National Patient Data Management System (NPDMS)** solves these challenges by establishing an interoperable longitudinal patient record, secured with an internal universal identifier (`ETH-NPDMS-2026-XXXXXX`) and integrated with Ethiopia's National Digital ID (**Fayda**) while ensuring emergency care and care for children without digital IDs is never denied.

---

## 2. System Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │              Trilingual Client Interface (EN / OM / AM)                │
   │  React 19 + Vite 8 + Tailwind CSS v4 + Lucide Clinical Icons + QR Code │
   └───────────────┬────────────────────────────────────────┬───────────────┘
                   │                                        │
                   ▼                                        ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                 NPDMS REST & Interoperability Gateway                  │
   │       Node.js 24 + Express + Native node:sqlite (Zero-Config)          │
   ├────────────────────────────────────────┬───────────────────────────────┤
   │ • Patient Identity & Fayda Verification│ • Longitudinal Cross-EHR      │
   │ • 5-Min OTP Cross-Hospital Gateway     │ • AI Clinical Copilot (EN/OM) │
   │ • Digital Health Card with QR Code     │ • Ambulance Transfer Brief    │
   │ • Child Immunization (EPI) & ANC 1-4   │ • Offline-First Batch Sync    │
   │ • Operations & Surgical History        │ • Inpatient Bed Admissions    │
   │ • Clinical Allergy CDS Alerts          │ • Emergency Break-Glass Hub   │
   │ • Appointments & Ethio Telecom SMS     │ • HL7 FHIR R4 JSON Exporter   │
   └────────────────────────────────────────┴───────────────────────────────┘
```

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React, Canvas-Confetti, QRCode generator, Trilingual localization (English, Afaan Oromoo, Amharic).
- **Backend:** Node.js v24 with built-in native `node:sqlite` (`DatabaseSync` with WAL mode, zero native compilation required).
- **Standards:** HL7 FHIR R4 interoperability schemas, ICD-10 clinical coding, WCAG AA accessibility, Ethiopian Personal Data Protection principles, Ethio Telecom SMS gateway simulation.

---

## 3. Quick Start Guide

### Prerequisites
- Node.js (v20+ or v24+)
- Web browser (Chrome, Edge, Firefox)

### Running the System
1. **Reset & Seed Database (Ethiopian Healthcare Data):**
   ```bash
   npm run seed
   ```
2. **Start Backend Server (Port 5000):**
   ```bash
   node backend/server.js
   ```
3. **Start Frontend Client (Port 3000):**
   ```bash
   cd frontend
   npm run dev
   ```
4. **Or launch everything in one click on Windows:**
   Double-click `start.bat` in the project root directory.

---

## 4. Key Demonstration Scenarios (Defense Walkthrough)

### Scenario 1: Trilingual Interface & Accessibility
- In the top header bar, click **EN**, **Afaan Oromoo**, or **አማርኛ**.
- The entire interface dynamically switches scripts (Latin and Ge'ez/Ethiopic typography) with tailored medical terminology.

### Scenario 2: Patient Registration & Fayda Digital ID Verification
1. Navigate to **Patient Registry** -> Click **"Register Patient"**.
2. Enter the test Fayda FIN `1985-7821-4923` and click **"Lookup in Fayda Registry"**.
3. The system verifies the digital identity with the simulated National Identity Authority, auto-populating verified Amharic and English names, date of birth, and regional residence.
4. Notice the **Emergency Trauma / Unconscious** toggle: fulfills the core design principle that emergency care is never denied due to lack of a digital ID.

### Scenario 3: Probabilistic Duplicate Detection & Review Queue
1. Register a patient with the name *"Kemal Mohamed"* and matching telephone.
2. The system flags a **94% probabilistic match** against existing patient `PAT-001`.
3. Switch to the **Duplicate Review Queue** tab to examine the side-by-side demographic comparison, review audit notes, and either safely merge into the master record or confirm distinct individuals.

### Scenario 4: Cross-Facility Longitudinal EHR & Care Continuity
1. In the **Patient Registry**, click **"View Full EHR"** on **Kemal Mohammed** (`ETH-NPDMS-2026-004128`).
2. Notice the high-visibility **RED ALLERGY ALERT**: *Penicillin / Amoxicillin (Life-Threatening Anaphylaxis)* and *Sulfonamides (Moderate)*.
3. Review the **Chronological Encounter Timeline**:
   - **Visit 1 at Agaro Primary Hospital:** Initial presentation, BP 172/104, diagnosed with Stage 2 Hypertension and T2DM, commenced on Metformin and Amlodipine 5mg.
   - **Visit 2 at Jimma University Medical Center (JUMC):** Specialist consultation by Dr. Abebe Tadesse linking to Agaro's episode, stepping up Amlodipine to 10mg + adding Losartan 50mg, with explicit documented continuity rationale.

### Scenario 5: Real-Time Drug Allergy & Contraindication Safety Engine
1. In the patient's EHR, click **"Start Consultation Encounter"**.
2. In the prescription section, type `Amoxicillin` or `Penicillin` and click **"Check & Add"**.
3. **Alert Triggered:** The system instantly intercepts the order with a critical alert: *"Patient has a documented LIFE_THREATENING allergy to Penicillin / Amoxicillin (Severe anaphylaxis, facial edema and bronchospasm)"*.
4. Test duplicate therapy detection by attempting to add another `Amlodipine` order.

### Scenario 6: Inter-Facility Referrals Hub
1. Navigate to **Inter-Facility Referrals**.
2. View the referral pathway from **Agaro Primary Hospital** to **Jimma University Medical Center**.
3. View the completed counter-referral guidance providing discharge advice back to the referring primary health center.

### Scenario 7: Emergency "Break-Glass" Access & Tamper-Evident Audit
1. In the clinical timeline, click **"Break-Glass Emergency Access"**.
2. Enter a clinical trauma justification (e.g., *"Unconscious acute head injury victim"*).
3. Access is granted and a permanent audit log entry is written to the **Security & Audit Trail** tab.

### Scenario 8: HL7 FHIR R4 Interoperability Export
1. In the patient chart, click **"Export HL7 FHIR Bundle"**.
2. Inspect the generated FHIR R4 JSON Bundle including standard `Patient`, `Condition`, `MedicationRequest`, and `AllergyIntolerance` resources.

### Scenario 9: Cross-Hospital Record Sharing via OTP Authorization (CORE FEATURE)
1. Navigate to **Cross-Hospital Access (OTP)** tab.
2. Select or search for **Kemal Mohammed** (`PAT-001`) who previously received treatment at **Agaro Primary Hospital** and **Jimma University Medical Center (JUMC)**.
3. Switch the active facility to **Tikur Anbessa Specialized Hospital** in Addis Ababa.
4. Click **"Request Access & Send OTP"**:
   - The system triggers an Ethio Telecom SMS dispatch simulation to the patient's verified phone (`+251-91-765-4321`).
   - A 5-minute security countdown begins (`05:00`).
   - The test OTP passcode appears in the live simulator banner (e.g. `834921`).
5. Enter the 6-digit PIN in the interactive OTP input cells.
6. The system verifies single-use non-replayability, creates an access consent grant (`60-minute unlocked session token`), triggers celebratory confetti, and renders the cross-hospital medical history.
7. Test brute-force protection: entering incorrect codes 3 times locks the request.

### Scenario 10: AI Clinical Copilot & Longitudinal Summarizer (Trilingual)
1. Open any patient's full EHR and click the **"AI Copilot"** button.
2. Select between **English**, **Afaan Oromoo**, or **አማርኛ**.
3. The AI engine instantly synthesizes the longitudinal medical history across all visiting facilities:
   - **Executive Digest:** Concise narrative of chronic conditions and facility transitions.
   - **Critical Allergy Alerts:** Red-flagged allergy warnings with contraindications.
   - **Active Medication Regimen:** Current doses, frequencies, and facilities.
   - **Lab Insights:** Flagged abnormal lab values (HbA1c, fasting glucose, renal markers).
   - **Recommended Care Plan:** Evidence-based follow-up according to Ethiopian MOH clinical guidelines.

### Scenario 11: National Digital Patient Health Card with QR Code
1. In the patient EHR, click **"Health Card"**.
2. An official Ethiopian National Health Card is rendered with Ministry of Health branding, Fayda FIN link, blood type, emergency contact, and documented allergies.
3. The scannable QR code encodes encrypted JSON payload containing `NPDMS_ID`, `FAYDA_FIN`, demographics, and emergency medical tags for rapid triage.
4. Click **"Print Card"** to produce a wallet-sized laminated printout.

### Scenario 12: Inter-Hospital Clinical Transfer Brief (Ambulance / Referral)
1. In the patient EHR, click **"Transfer Brief"**.
2. A formal inter-facility clinical summary is generated formatted with official header, referring facility, receiving facility, vital signs, active diagnoses, active medications, and primary physician signature lines.
3. Clinicians can print directly (`Ctrl+P` / Print button) for ambulance transport or referral handover.

### Scenario 13: Child Immunization (EPI) & Maternal Health (ANC 1–4)
1. Navigate to **Maternal & Child (ANC/EPI)** tab.
2. Under **Antenatal Care (ANC 1–4)**, review gestational age, fundal height, fetal heart rate, tetanus toxoid status, iron folate, and rapid serology (HIV, VDRL/Syphilis) for patient *Chaltu Desta*. Click **"Record ANC Visit"** to document visit progress.
3. Under **Child Immunization (EPI)**, review patient *Hawi Gudeta* against the official Ethiopian National Immunization Schedule (BCG, OPV-0, Pentavalent 1-3, PCV 1-3, Rotavirus, Measles Rubella MR-1 & MR-2). Click **"Record Vaccination"** to record new doses with vaccine batch numbers.

### Scenario 14: Appointments & Ethio Telecom SMS Notification Dispatcher
1. Navigate to **Appointments & SMS** tab.
2. View scheduled outpatient follow-ups with hospital departments.
3. Click **"Schedule Appointment & Dispatch SMS"** to book an appointment with automatic SMS reminder dispatched in the patient's preferred language (EN/OM/AM) through shortcode `8282`.
4. Review the real-time notification delivery log.

### Scenario 15: Offline-First Mode & Sync Queue Simulator
1. In the top notification banner, observe the **Offline Sync Bar**.
2. Click **"Work Offline"** to simulate network failure or rural clinic power disruption.
3. Click **"Record Offline Consultation"** to document an outpatient encounter saved directly to client-side `localStorage`.
4. The queue badge increments (e.g. `1 pending sync`).
5. Click **"Sync Now (Reconnected)"**: the batch sync payload is posted to `/api/sync/batch`, written into the central database, and logged in the immutable audit trail.

---

## 5. Role-Based Access Simulation
Use the **Role Switcher** in the top navigation bar to test the application from any perspective:
- **Doctor / Clinical Officer:** Longitudinal chart, SOAP notes, prescriptions, allergy alerts.
- **Nurse / Midwife:** Triage, vitals entry, maternal/ANC observations.
- **Registration Officer:** Demographic intake, Fayda verification, duplicate checks.
- **Laboratory Technologist:** Diagnostic orders queue, result verification, reference ranges.
- **Pharmacist:** Hospital dispensing queue, drug safety validation.
- **Facility / System Admin:** Duplicate resolution, audit trail, operational dashboards.
- **Patient Portal:** Consumer view of personal visits, prescriptions, and allergy warnings.

---

## 6. Academic References & Project Metadata
- Jimma University, Department of Computer Science (November 2026)
- Ethiopian Ministry of Health – National Digital Health Strategy (NDHS)
- Ethiopian National Digital ID Authority (Fayda)
- HL7 International FHIR Release 4 (R4) Standard
