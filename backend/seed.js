// backend/seed.js
const { db, initDatabase } = require('./database');
const crypto = require('crypto');

function seedDatabase() {
  initDatabase();

  // Temporarily disable foreign keys for clean re-seed
  db.exec('PRAGMA foreign_keys = OFF;');

  db.exec(`
    DELETE FROM record_access_consents;
    DELETE FROM otp_requests;
    DELETE FROM appointments;
    DELETE FROM admissions;
    DELETE FROM duplicate_reviews;
    DELETE FROM audit_logs;
    DELETE FROM referrals;
    DELETE FROM procedures;
    DELETE FROM lab_investigations;
    DELETE FROM prescriptions;
    DELETE FROM diagnoses;
    DELETE FROM encounters;
    DELETE FROM allergies;
    DELETE FROM patients;
    DELETE FROM users;
    DELETE FROM facilities;
  `);

  db.exec('PRAGMA foreign_keys = ON;');

  console.log('Seeding Ethiopian health facilities...');
  const insertFacility = db.prepare(`
    INSERT INTO facilities (id, name, code, type, region, zone, woreda, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const facilities = [
    ['FAC-JUMC', 'Jimma University Medical Center (JUMC)', 'JUMC-ETH', 'SPECIALIZED_HOSPITAL', 'Oromia', 'Jimma', 'Jimma City', '+251-47-111-1458'],
    ['FAC-SHENEN', 'Shenen Gibe General Hospital', 'SGGH-ETH', 'GENERAL_HOSPITAL', 'Oromia', 'Jimma', 'Jimma City', '+251-47-111-2090'],
    ['FAC-AGARO', 'Agaro Primary Hospital', 'APH-ETH', 'PRIMARY_HOSPITAL', 'Oromia', 'Jimma', 'Agaro Town', '+251-47-225-0120'],
    ['FAC-TASH', 'Tikur Anbessa (Black Lion) Specialized Hospital', 'TASH-ETH', 'SPECIALIZED_HOSPITAL', 'Addis Ababa', 'Lideta', 'Lideta Woreda 03', '+251-11-551-1211']
  ];

  facilities.forEach(f => insertFacility.run(...f));

  console.log('Seeding clinical and administrative users...');
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, full_name, role, facility_id, professional_id, email, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  // Default demo password hash (demo123)
  const defaultPw = '$2a$10$wT3G0kLwNq2Yg9XQ4jW4u.7W7Qe9xQyC8gO.oZf7y7o9R.0W8t8uG'; // placeholder hash

  const users = [
    ['USR-DOC-01', 'dr_abebe', defaultPw, 'Dr. Abebe Tadesse, MD', 'DOCTOR', 'FAC-JUMC', 'ETH-MED-44129', 'dr.abebe@jumc.edu.et', '+251-91-123-4567'],
    ['USR-DOC-02', 'dr_chala', defaultPw, 'Dr. Chala Gemechu, MD', 'DOCTOR', 'FAC-SHENEN', 'ETH-MED-51902', 'dr.chala@shenen.health.gov.et', '+251-91-234-5678'],
    ['USR-DOC-03', 'dr_tariku', defaultPw, 'Dr. Tariku Bekele, MD', 'DOCTOR', 'FAC-AGARO', 'ETH-MED-62019', 'dr.tariku@agaro.health.gov.et', '+251-91-345-6789'],
    ['USR-NUR-01', 'nurse_fatuma', defaultPw, 'Sr. Fatuma Kedir, BSc', 'NURSE', 'FAC-JUMC', 'ETH-NUR-19820', 'fatuma.k@jumc.edu.et', '+251-91-456-7890'],
    ['USR-REG-01', 'reg_almaz', defaultPw, 'Almaz Bekele', 'REGISTRATION_OFFICER', 'FAC-JUMC', 'ETH-REG-00812', 'almaz.b@jumc.edu.et', '+251-91-567-8901'],
    ['USR-LAB-01', 'lab_dawit', defaultPw, 'Dawit Yohannes, MSc', 'LAB_TECH', 'FAC-JUMC', 'ETH-LAB-09281', 'dawit.y@jumc.edu.et', '+251-91-678-9012'],
    ['USR-PHARM-01', 'pharm_tigist', defaultPw, 'Tigist Haile, BPharm', 'PHARMACIST', 'FAC-JUMC', 'ETH-PHM-04192', 'tigist.h@jumc.edu.et', '+251-91-789-0123'],
    ['USR-ADMIN-01', 'admin_worku', defaultPw, 'Worku Fikadu (Lead Admin)', 'FACILITY_ADMIN', 'FAC-JUMC', 'ETH-ADM-00001', 'worku.fikadu@ju.edu.et', '+251-91-890-1234'],
    ['USR-PAT-01', 'patient_kemal', defaultPw, 'Kemal Mohammed Abba-Dula', 'PATIENT', 'FAC-JUMC', 'ETH-PAT-004128', 'kemal.mohammed@email.et', '+251-91-765-4321']
  ];

  users.forEach(u => insertUser.run(...u));

  console.log('Seeding patients...');
  const insertPatient = db.prepare(`
    INSERT INTO patients (
      id, npdms_id, fayda_fin, fayda_status, first_name, father_name, grandfather_name,
      first_name_amharic, father_name_amharic, date_of_birth, gender, phone_number,
      region, zone_woreda, kebele, house_number, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relation, blood_type, is_emergency_provisional, created_facility_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patients = [
    [
      'PAT-001', 'ETH-NPDMS-2026-004128', '1985-7821-4923', 'VERIFIED',
      'Kemal', 'Mohammed', 'Abba-Dula', 'ከማል', 'መሀመድ',
      '1974-05-12', 'MALE', '+251-91-765-4321',
      'Oromia', 'Jimma City / Mendera Woreda', 'Kebele 04', 'H.No 342',
      'Amina Kemal', '+251-92-334-5566', 'Daughter', 'O+', 0, 'FAC-AGARO', '2026-09-10 09:30:00'
    ],
    [
      'PAT-002', 'ETH-NPDMS-2026-009845', '2001-3847-1920', 'VERIFIED',
      'Chaltu', 'Desta', 'Tolosa', 'ጫልቱ', 'ደስታ',
      '2001-08-20', 'FEMALE', '+251-93-112-2334',
      'Oromia', 'Jimma Zone / Kersa Woreda', 'Kebele 02', 'H.No 118',
      'Desta Tolosa', '+251-91-445-6677', 'Father', 'A+', 0, 'FAC-SHENEN', '2026-10-02 11:15:00'
    ],
    [
      'PAT-003', 'ETH-NPDMS-2026-000911', null, 'UNLINKED',
      'Unknown-Male-Trauma-01', 'Emergency', 'Admission', 'ያልታወቀ', 'አደጋ',
      '1996-01-01', 'MALE', null,
      'Oromia', 'Jimma City', 'Emergency Triage', 'N/A',
      'Traffic Police Officer Girma', '+251-91-998-8776', 'Accompanying Officer', 'B+', 1, 'FAC-JUMC', '2026-11-05 21:40:00'
    ],
    [
      'PAT-004', 'ETH-NPDMS-2026-003319', null, 'UNLINKED',
      'Hawi', 'Gudeta', 'Tulu', 'ሀዊ', 'ጉደታ',
      '2023-03-15', 'FEMALE', '+251-94-556-7788',
      'Oromia', 'Jimma Zone / Mana Woreda', 'Yabu Kebele', 'H.No 54',
      'Gudeta Tulu (Father)', '+251-94-556-7788', 'Father', 'O+', 0, 'FAC-JUMC', '2026-08-14 14:20:00'
    ],
    [
      'PAT-005', 'ETH-NPDMS-2026-007742', '1990-1124-9981', 'VERIFIED',
      'Almaz', 'Hailu', 'Girma', 'አልማዝ', 'ኃይሉ',
      '1990-11-04', 'FEMALE', '+251-91-887-7665',
      'Addis Ababa', 'Lideta Sub-city', 'Woreda 04', 'H.No 709',
      'Hailu Girma', '+251-91-223-3445', 'Father', 'AB+', 0, 'FAC-TASH', '2026-07-19 10:00:00'
    ]
  ];

  patients.forEach(p => insertPatient.run(...p));

  console.log('Seeding documented allergies...');
  const insertAllergy = db.prepare(`
    INSERT INTO allergies (id, patient_id, allergen, reaction, severity, status, facility_id, recorded_by, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const allergies = [
    ['ALG-001', 'PAT-001', 'Penicillin / Amoxicillin', 'Severe anaphylaxis, facial edema and bronchospasm', 'LIFE_THREATENING', 'ACTIVE', 'FAC-AGARO', 'USR-DOC-03', '2026-09-10 10:00:00'],
    ['ALG-002', 'PAT-001', 'Sulfonamide Antibiotics (Bactrim)', 'Generalized maculopapular rash, pruritus', 'MODERATE', 'ACTIVE', 'FAC-AGARO', 'USR-DOC-03', '2026-09-10 10:05:00'],
    ['ALG-003', 'PAT-002', 'NSAIDs (Diclofenac)', 'Gastric burning, mild urticaria', 'MILD', 'ACTIVE', 'FAC-SHENEN', 'USR-DOC-02', '2026-10-02 11:30:00'],
    ['ALG-004', 'PAT-005', 'Ciprofloxacin', 'Tendon tenderness, nausea', 'MODERATE', 'ACTIVE', 'FAC-TASH', 'USR-DOC-01', '2026-07-19 10:30:00']
  ];

  allergies.forEach(a => insertAllergy.run(...a));

  console.log('Seeding longitudinal encounters across facilities...');
  const insertEncounter = db.prepare(`
    INSERT INTO encounters (
      id, patient_id, facility_id, provider_id, encounter_type, chief_complaint,
      vitals_json, soap_notes_json, status, parent_encounter_id, treatment_rationale, started_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const encounters = [
    // Encounter 1: Agaro Primary Hospital (Initial Presentation for Kemal)
    [
      'ENC-001', 'PAT-001', 'FAC-AGARO', 'USR-DOC-03', 'OUTPATIENT',
      'Persistent occipital headache for 3 weeks, increased thirst (polydipsia) and nocturnal urination.',
      JSON.stringify({ bp: '172/104', pulse: 88, temp: 36.8, resp_rate: 18, spo2: 97, weight: 84, height: 172, bmi: 28.4 }),
      JSON.stringify({
        subjective: '52-year-old male farmer presenting with progressive headaches and excessive thirst for ~3 weeks. No chest pain or visual blurriness.',
        objective: 'Alert, oriented x3. BP 172/104 mmHg. S1/S2 present, no murmurs. Chest clear bilaterally. Random blood glucose 245 mg/dL. Urine dipstick shows glucosuria ++.',
        assessment: '1. Essential Hypertension - Stage 2 (Uncontrolled)\n2. Newly diagnosed Type 2 Diabetes Mellitus',
        plan: 'Initiate lifestyle counseling (low sodium, reduced refined carbs). Start Amlodipine 5mg po daily and Metformin 500mg po BID. Order baseline renal function tests. Refer to JUMC Specialized Endocrine & Cardiology clinic for full cardiovascular workup.'
      }),
      'COMPLETED', null, 'Initial baseline diagnosis and primary facility initiation of therapy.',
      '2026-09-10 09:45:00', '2026-09-10 10:45:00'
    ],
    // Encounter 2: JUMC Specialized Cardiology/Endocrine OPD (Continuity of Care for Kemal)
    [
      'ENC-002', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01', 'REFERRAL_CONTINUATION',
      'Referred from Agaro Primary Hospital for review of Stage 2 Hypertension and Type 2 Diabetes.',
      JSON.stringify({ bp: '158/96', pulse: 80, temp: 36.6, resp_rate: 16, spo2: 98, weight: 83.5, height: 172, bmi: 28.2 }),
      JSON.stringify({
        subjective: 'Patient returns following Agaro Hospital referral. Notes compliance with Amlodipine and Metformin. Headaches have partially improved but morning blood pressure remains elevated ~155-160 systolic.',
        objective: 'BP 158/96 mmHg right arm sitting. JVP normal. Peripheral pulses palpable. No pedal edema. Fundoscopy: mild arteriolar narrowing, no papilledema.',
        assessment: '1. Essential Hypertension, suboptimally controlled on monotherapy.\n2. Type 2 Diabetes Mellitus under ongoing control.\n3. Documented Severe Penicillin Allergy - ALERT VERIFIED.',
        plan: 'Optimize antihypertensive regimen: increase Amlodipine to 10mg daily and add Losartan (ARB) 50mg daily for nephroprotection. Continue Metformin 500mg BID. Order Fasting Lipid Profile, HbA1c, and Serum Creatinine. Follow-up in 4 weeks at JUMC or Agaro Hospital.'
      }),
      'COMPLETED', 'ENC-001', 'Dose stepped up from Agaro initial prescription due to persistent systolic elevation >150 mmHg. Added Losartan for target organ protection.',
      '2026-10-18 10:15:00', '2026-10-18 11:20:00'
    ],
    // Encounter 3: Shenen Gibe ANC visit for Chaltu
    [
      'ENC-003', 'PAT-002', 'FAC-SHENEN', 'USR-DOC-02', 'OUTPATIENT',
      'Routine 3rd Antenatal Care (ANC) visit at 32 weeks gestational age.',
      JSON.stringify({ bp: '112/70', pulse: 76, temp: 36.7, resp_rate: 18, spo2: 99, weight: 64, height: 160, fundal_height: 32 }),
      JSON.stringify({
        subjective: 'Primi-gravida at 32 weeks GA. Reports good fetal kicks and normal appetite. No headache, epigastric pain, or vaginal bleeding.',
        objective: 'Normotensive. Fundal height 32 cm compatible with dates. Fetal lie longitudinal, cephalic presentation. FHR 140 bpm regular. No lower limb edema.',
        assessment: 'Normal singleton intrauterine pregnancy at 32 weeks gestation. Low risk.',
        plan: 'Continue daily Ferrous Sulfate 200mg + Folic Acid 0.4mg. Re-emphasize birth preparedness and complication readiness plan at Shenen Gibe delivery ward. Next ANC visit in 2 weeks.'
      }),
      'COMPLETED', null, 'Routine maternal care protocol.',
      '2026-10-02 11:20:00', '2026-10-02 12:00:00'
    ],
    // Encounter 4: Emergency Trauma at JUMC (Break-Glass Protocol)
    [
      'ENC-004', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01', 'EMERGENCY',
      'Brought by highway police following motorcycle collision. Severe pain in left leg, multiple facial abrasions.',
      JSON.stringify({ bp: '135/85', pulse: 104, temp: 37.1, resp_rate: 22, spo2: 96, gcs: '14/15' }),
      JSON.stringify({
        subjective: 'Break-glass emergency admission. Patient groggy, reports acute trauma 45 minutes ago. No history of loss of consciousness.',
        objective: 'Left lower leg visibly deformed with marked swelling, crepitus, and tender over mid-shaft tibia. Distal dorsalis pedis pulse intact. Capillary refill < 2s.',
        assessment: '1. Closed Fracture, Mid-shaft Left Tibia and Fibula\n2. Multiple Contusions and Soft Tissue Abrasions',
        plan: 'Emergency leg splinting. IV fluids normal saline. STAT X-ray Left Tibia/Fibula. Tramadol 50mg IV for severe pain. Orthopedic consultation for definitive reduction and casting.'
      }),
      'COMPLETED', null, 'Emergency resuscitation and stabilization protocol.',
      '2026-11-05 21:45:00', '2026-11-05 23:15:00'
    ]
  ];

  encounters.forEach(e => insertEncounter.run(...e));

  console.log('Seeding diagnoses...');
  const insertDiagnosis = db.prepare(`
    INSERT INTO diagnoses (id, encounter_id, patient_id, icd10_code, condition_name, diagnosis_type, notes, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const diagnoses = [
    ['DX-001', 'ENC-001', 'PAT-001', 'I10', 'Essential (primary) hypertension', 'CONFIRMED', 'Stage 2 hypertension, baseline BP 172/104', '2026-09-10 10:30:00'],
    ['DX-002', 'ENC-001', 'PAT-001', 'E11.9', 'Type 2 diabetes mellitus without complications', 'CONFIRMED', 'Fasting blood glucose > 200 mg/dL', '2026-09-10 10:32:00'],
    ['DX-003', 'ENC-002', 'PAT-001', 'I10', 'Essential (primary) hypertension', 'CONFIRMED', 'Ongoing evaluation, added Losartan to Amlodipine', '2026-10-18 10:55:00'],
    ['DX-004', 'ENC-003', 'PAT-002', 'Z34.0', 'Supervision of normal first pregnancy, third trimester', 'CONFIRMED', 'Routine 32-week ANC review', '2026-10-02 11:45:00'],
    ['DX-005', 'ENC-004', 'PAT-003', 'S82.2', 'Fracture of shaft of tibia', 'CONFIRMED', 'Closed fracture left leg from vehicular collision', '2026-11-05 22:15:00']
  ];

  diagnoses.forEach(d => insertDiagnosis.run(...d));

  console.log('Seeding prescriptions...');
  const insertPrescription = db.prepare(`
    INSERT INTO prescriptions (
      id, encounter_id, patient_id, facility_id, prescribed_by, medication_name,
      dosage, route, frequency, duration, instructions, status, dispensed_by, dispensed_at, prescribed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const prescriptions = [
    [
      'RX-001', 'ENC-001', 'PAT-001', 'FAC-AGARO', 'USR-DOC-03',
      'Metformin Hydrochloride', '500 mg', 'ORAL', 'Twice daily with meals', '30 days',
      'Take with breakfast and dinner to reduce GI discomfort', 'DISPENSED', 'USR-PHARM-01', '2026-09-10 11:10:00', '2026-09-10 10:35:00'
    ],
    [
      'RX-002', 'ENC-001', 'PAT-001', 'FAC-AGARO', 'USR-DOC-03',
      'Amlodipine Besylate', '5 mg', 'ORAL', 'Once daily in morning', '30 days',
      'Monitor morning blood pressure', 'DISPENSED', 'USR-PHARM-01', '2026-09-10 11:12:00', '2026-09-10 10:38:00'
    ],
    [
      'RX-003', 'ENC-002', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01',
      'Amlodipine Besylate', '10 mg', 'ORAL', 'Once daily in morning', '60 days',
      'Up-titrated from 5mg for improved systolic BP control', 'ACTIVE', null, null, '2026-10-18 11:00:00'
    ],
    [
      'RX-004', 'ENC-002', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01',
      'Losartan Potassium', '50 mg', 'ORAL', 'Once daily', '60 days',
      'Renal protective ARB therapy. Re-check serum potassium and creatinine in 4 weeks.', 'ACTIVE', null, null, '2026-10-18 11:05:00'
    ],
    [
      'RX-005', 'ENC-003', 'PAT-002', 'FAC-SHENEN', 'USR-DOC-02',
      'Ferrous Fumarate + Folic Acid', '200 mg / 0.4 mg', 'ORAL', 'Once daily', '60 days',
      'Take with citrus juice or water, avoid taking simultaneously with tea or milk', 'DISPENSED', 'USR-PHARM-01', '2026-10-02 12:15:00', '2026-10-02 11:50:00'
    ],
    [
      'RX-006', 'ENC-004', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01',
      'Tramadol Hydrochloride', '50 mg', 'IV', 'Every 8 hours PRN', '3 days',
      'Slow IV infusion for acute trauma pain', 'DISPENSED', 'USR-PHARM-01', '2026-11-05 22:30:00', '2026-11-05 22:00:00'
    ]
  ];

  prescriptions.forEach(p => insertPrescription.run(...p));

  console.log('Seeding lab investigations...');
  const insertLab = db.prepare(`
    INSERT INTO lab_investigations (
      id, encounter_id, patient_id, ordered_facility_id, ordered_by, test_name,
      category, specimen, status, result_value, normal_range, units, interpretation, findings_notes, verified_by, ordered_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const labs = [
    [
      'LAB-001', 'ENC-001', 'PAT-001', 'FAC-AGARO', 'USR-DOC-03',
      'Random Blood Glucose (RBG)', 'BIOCHEMISTRY', 'Capillary Blood', 'COMPLETED',
      '245', '70 - 140', 'mg/dL', 'ABNORMAL', 'Markedly elevated consistent with uncontrolled diabetes', 'USR-LAB-01', '2026-09-10 10:00:00', '2026-09-10 10:15:00'
    ],
    [
      'LAB-002', 'ENC-002', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01',
      'Hemoglobin A1c (HbA1c)', 'BIOCHEMISTRY', 'Venous Whole Blood', 'COMPLETED',
      '8.4', '4.0 - 5.6', '%', 'ABNORMAL', 'Indicates suboptimal glycemic control over past 3 months', 'USR-LAB-01', '2026-10-18 10:30:00', '2026-10-18 12:45:00'
    ],
    [
      'LAB-003', 'ENC-002', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01',
      'Serum Creatinine & eGFR', 'BIOCHEMISTRY', 'Serum', 'COMPLETED',
      '1.08', '0.70 - 1.30', 'mg/dL', 'NORMAL', 'eGFR > 85 mL/min/1.73m2. Baseline renal function intact before ARB initiation', 'USR-LAB-01', '2026-10-18 10:30:00', '2026-10-18 12:50:00'
    ],
    [
      'LAB-004', 'ENC-003', 'PAT-002', 'FAC-SHENEN', 'USR-DOC-02',
      'Complete Blood Count (CBC) - Hemoglobin', 'HEMATOLOGY', 'EDTA Whole Blood', 'COMPLETED',
      '11.8', '11.0 - 15.0', 'g/dL', 'NORMAL', 'Adequate hemoglobin level for 3rd trimester gestation', 'USR-LAB-01', '2026-10-02 11:30:00', '2026-10-02 11:55:00'
    ],
    [
      'LAB-005', 'ENC-004', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01',
      'X-Ray Left Tibia and Fibula (AP & Lateral)', 'IMAGING', 'Radiological Examination', 'COMPLETED',
      'Fracture Shaft of Tibia', 'No bone disruption', 'Image Report', 'CRITICAL', 'Displaced transverse fracture of mid-diaphyseal left tibia with accompanying undisplaced fibular fracture', 'USR-LAB-01', '2026-11-05 22:05:00', '2026-11-05 22:40:00'
    ]
  ];

  labs.forEach(l => insertLab.run(...l));

  console.log('Seeding procedures & surgeries...');
  const insertProcedure = db.prepare(`
    INSERT INTO procedures (
      id, encounter_id, patient_id, facility_id, surgeon_id, procedure_name,
      indication, surgical_team, anesthesia_type, operative_notes, outcome,
      complications, post_op_treatment, recovery_progress, future_recommendations, performed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const procedures = [
    [
      'PROC-001', 'ENC-004', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01',
      'Closed Reduction and Above-Knee Long Leg Plaster Cast Application',
      'Displaced mid-shaft fracture of left tibia/fibula following RTA along Jimma-Agaro road',
      'Dr. Abebe Tadesse (Lead Orthopedic Surgeon), Sr. Fatuma Kedir (Scrub Nurse)',
      'SEDATION',
      'Under aseptic precautions and IV sedation, longitudinal traction applied. Anatomical alignment restored and verified under fluoroscopy. Long leg POP backslab and circular cast applied. Neurovascular status reassessed: DP and PT pulses strong, toe warmth and capillary refill normal.',
      'SUCCESSFUL', 'None noted intraoperatively',
      'Elevate limb on pillows. Analgesia: Tramadol 50mg po TID PRN. Prophylactic anticoagulation: Enoxaparin 40mg SC daily for 14 days.',
      'Post-op day 1: Toe movements intact, minimal swelling, neurovascularly intact.',
      'Repeat check X-ray in 2 weeks at JUMC Orthopedic Clinic. Cast change to PTB cast at 6 weeks.',
      '2026-11-05 23:00:00'
    ],
    [
      'PROC-002', 'ENC-001', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01',
      'Diagnostic Fundoscopy & Direct Ophthalmoscopy',
      'Cardiovascular organ damage assessment for uncontrolled Stage 2 Hypertension',
      'Dr. Abebe Tadesse (Cardiology/Internal Medicine)',
      'LOCAL',
      'Pupils dilated with Tropicamide 1%. Bilateral fundi visualized. Arteriolar narrowing noted (Grade 1 hypertensive retinopathy). No flame hemorrhages, cotton wool spots, or papilledema.',
      'SUCCESSFUL', 'None',
      'Continue aggressive blood pressure control with Amlodipine 10mg and Losartan 50mg.',
      'Full visual acuity preserved.',
      'Annual dilated eye examination at JUMC Ophthalmology.',
      '2026-10-18 11:30:00'
    ]
  ];

  procedures.forEach(p => insertProcedure.run(...p));

  console.log('Seeding inpatient admissions...');
  const insertAdmission = db.prepare(`
    INSERT INTO admissions (
      id, patient_id, facility_id, admitting_doctor_id, ward_name, bed_number,
      admission_reason, status, admitted_at, discharge_date, discharge_summary, post_discharge_instructions, condition_on_discharge
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const admissions = [
    [
      'ADM-001', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01', 'Orthopedic Surgery Ward B', 'Bed 14',
      'Acute polytrauma following motorcycle crash; displaced left tibia fracture requiring surgical stabilization.',
      'ADMITTED', '2026-11-05 22:30:00', null, null, null, null
    ],
    [
      'ADM-002', 'PAT-001', 'FAC-AGARO', 'USR-DOC-03', 'Medical Inpatient Ward', 'Bed 08',
      'Hypertensive urgency (BP 172/104) with acute symptomatic headache and hyperglycemia.',
      'DISCHARGED', '2026-09-10 10:00:00', '2026-09-12 14:00:00',
      'Patient stabilized with oral antihypertensives (Amlodipine 5mg) and oral hypoglycemics (Metformin 500mg BID). Blood pressure decreased to 142/88 mmHg. Fasting blood sugar stabilized to 148 mg/dL. Referred to JUMC Cardiology for specialized longitudinal management.',
      'Continue low-sodium diet, take prescribed medications regularly, avoid alcohol, attend JUMC cardiology appointment.',
      'IMPROVED'
    ]
  ];

  admissions.forEach(a => insertAdmission.run(...a));

  console.log('Seeding scheduled appointments...');
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (
      id, patient_id, facility_id, doctor_id, department, appointment_date, appointment_time, reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const appointments = [
    [
      'APT-001', 'PAT-001', 'FAC-JUMC', 'USR-DOC-01', 'Cardiology & Endocrine Clinic',
      '2026-11-18', '09:30 AM', '4-week follow-up for blood pressure and HbA1c review', 'SCHEDULED'
    ],
    [
      'APT-002', 'PAT-002', 'FAC-SHENEN', 'USR-DOC-02', 'Antenatal & Maternal Health',
      '2026-11-16', '10:00 AM', 'Routine 34-week gestational age antenatal checkup', 'SCHEDULED'
    ],
    [
      'APT-003', 'PAT-003', 'FAC-JUMC', 'USR-DOC-01', 'Orthopedic Outpatient Clinic',
      '2026-11-19', '02:00 PM', 'Cast check and 2-week follow-up X-ray for left tibia fracture', 'SCHEDULED'
    ]
  ];

  appointments.forEach(ap => insertAppointment.run(...ap));

  console.log('Seeding cross-facility referrals...');
  const insertReferral = db.prepare(`
    INSERT INTO referrals (
      id, patient_id, from_facility_id, to_facility_id, referring_clinician_id,
      urgency, referral_reason, clinical_summary, status, counter_referral_summary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const referrals = [
    [
      'REF-001', 'PAT-001', 'FAC-AGARO', 'FAC-JUMC', 'USR-DOC-03',
      'PRIORITY', 'Cardiology & Endocrine Specialized Assessment',
      '52yo male with newly recognized Stage 2 Hypertension (BP 172/104) and T2DM (RBG 245). Commenced on Metformin 500mg and Amlodipine 5mg. Patient has severe documented Penicillin anaphylaxis. Please evaluate for comprehensive organ damage and optimize therapeutic regimen.',
      'COUNTER_REFERRED',
      'Patient reviewed at JUMC Cardiology OPD by Dr. Abebe Tadesse. Blood pressure stabilized to 158/96. Stepped up Amlodipine to 10mg and added Losartan 50mg daily. Renal function confirmed normal (Cr 1.08). Patient may continue routine follow-up refills at Agaro Primary Hospital with quarterly JUMC checks.',
      '2026-09-10 11:30:00', '2026-10-18 12:00:00'
    ]
  ];

  referrals.forEach(r => insertReferral.run(...r));

  console.log('Seeding audit logs...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, user_role, facility_id, patient_id, action, resource_type, justification, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const audits = [
    ['AUD-001', 'USR-REG-01', 'Almaz Bekele', 'REGISTRATION_OFFICER', 'FAC-JUMC', 'PAT-001', 'VIEW_RECORD', 'PATIENT_DEMOGRAPHICS', 'Routine appointment check-in', '192.168.10.12', '2026-10-18 09:30:00'],
    ['AUD-002', 'USR-DOC-01', 'Dr. Abebe Tadesse, MD', 'DOCTOR', 'FAC-JUMC', 'PAT-001', 'VIEW_RECORD', 'LONGITUDINAL_EHR', 'Cardiology outpatient consultation review', '192.168.10.45', '2026-10-18 10:15:00'],
    ['AUD-003', 'USR-DOC-01', 'Dr. Abebe Tadesse, MD', 'DOCTOR', 'FAC-JUMC', 'PAT-001', 'PRESCRIBE_MED', 'PRESCRIPTIONS', 'Up-titrated Amlodipine to 10mg + added Losartan 50mg', '192.168.10.45', '2026-10-18 11:05:00'],
    ['AUD-004', 'USR-DOC-01', 'Dr. Abebe Tadesse, MD', 'DOCTOR', 'FAC-JUMC', 'PAT-003', 'BREAK_GLASS', 'EMERGENCY_RECORDS', 'Emergency trauma: unconscious RTA victim without digital ID requiring acute surgical reduction', '192.168.10.88', '2026-11-05 21:42:00']
  ];

  audits.forEach(a => insertAudit.run(...a));

  console.log('Seeding duplicate review queue...');
  const insertDuplicate = db.prepare(`
    INSERT INTO duplicate_reviews (id, candidate_patient_id, matched_patient_id, match_score, match_reasons, status, resolution_notes, reviewed_by, reviewed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const duplicates = [
    [
      'DUP-001', 'PAT-DEMO-DUP-01', 'PAT-001', 0.94,
      'Name phonetic similarity 95% (Kemal Mohamed Abadula vs Kemal Mohammed Abba-Dula), matching birthdate (1974-05-12), matching telephone (+251-91-765-4321)',
      'PENDING_REVIEW', null, null, null, '2026-10-25 14:10:00'
    ]
  ];

  duplicates.forEach(d => insertDuplicate.run(...d));

  console.log('✅ NPDMS Ethiopian Healthcare Seed Data loaded successfully!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
