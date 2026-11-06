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
   ┌───────────────────────────────────────────────────────────────┐
   │         Trilingual Client Interface (EN / OM / AM)            │
   │  React 19 + Vite 8 + Tailwind CSS v4 + Lucide Clinical Icons   │
   └───────────────┬───────────────────────────────┬───────────────┘
                   │                               │
                   ▼                               ▼
   ┌───────────────────────────────────────────────────────────────┐
   │              NPDMS REST & Interoperability Gateway            │
   │      Node.js 24 + Express + Native SQLite (Zero-Config)       │
   ├───────────────────────────────┬───────────────────────────────┤
   │ • Patient Identity & Matching │ • Longitudinal EHR Timeline   │
   │ • Fayda National ID Simulator │ • Clinical Allergy CDS Alerts │
   │ • Inter-Hospital Referrals    │ • Emergency Break-Glass Hub   │
   │ • Pharmacy & Dispensation     │ • HL7 FHIR R4 JSON Exporter   │
   └───────────────────────────────┴───────────────────────────────┘
```

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React, Trilingual localization (English, Afaan Oromoo, Amharic).
- **Backend:** Node.js v24 with built-in native `node:sqlite` (SQLite 3.51 with WAL mode, zero native compilation required).
- **Standards:** HL7 FHIR R4 interoperability schemas, ICD-10 clinical coding, WCAG AA accessibility, Ethiopian Personal Data Protection principles.

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
