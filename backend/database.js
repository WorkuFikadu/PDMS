// backend/database.js
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'npdms.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for performance and data integrity
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- SPECIALIZED_HOSPITAL, GENERAL_HOSPITAL, PRIMARY_HOSPITAL, HEALTH_CENTER, HEALTH_POST
      region TEXT NOT NULL,
      zone TEXT NOT NULL,
      woreda TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      bed_capacity INTEGER DEFAULT 0,
      latitude REAL,
      longitude REAL,
      director_name TEXT,
      fayda_connected INTEGER DEFAULT 1,
      nhdis_connected INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL, -- REGISTRATION_OFFICER, DOCTOR, NURSE, LAB_TECH, PHARMACIST, FACILITY_ADMIN, SYSTEM_ADMIN, PATIENT
      facility_id TEXT,
      professional_id TEXT,
      email TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      npdms_id TEXT UNIQUE NOT NULL,
      fayda_fin TEXT UNIQUE,
      fayda_status TEXT DEFAULT 'UNLINKED', -- VERIFIED, UNLINKED, PENDING_REVIEW
      first_name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      grandfather_name TEXT NOT NULL,
      first_name_amharic TEXT,
      father_name_amharic TEXT,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL, -- MALE, FEMALE, OTHER
      phone_number TEXT,
      region TEXT NOT NULL,
      zone_woreda TEXT NOT NULL,
      kebele TEXT,
      house_number TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      emergency_contact_relation TEXT,
      blood_type TEXT,
      is_emergency_provisional INTEGER DEFAULT 0,
      created_facility_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_facility_id) REFERENCES facilities(id)
    );

    CREATE TABLE IF NOT EXISTS allergies (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      allergen TEXT NOT NULL,
      reaction TEXT,
      severity TEXT NOT NULL, -- MILD, MODERATE, SEVERE, LIFE_THREATENING
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED
      facility_id TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      encounter_type TEXT NOT NULL, -- OUTPATIENT, INPATIENT, EMERGENCY, REFERRAL_CONTINUATION
      chief_complaint TEXT NOT NULL,
      vitals_json TEXT, -- JSON string of BP, pulse, temp, resp_rate, spo2, weight, height
      soap_notes_json TEXT, -- JSON string with subjective, objective, assessment, plan
      status TEXT DEFAULT 'COMPLETED', -- IN_PROGRESS, COMPLETED
      parent_encounter_id TEXT,
      treatment_rationale TEXT, -- Clinical reason if altering or continuing earlier therapy
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      icd10_code TEXT NOT NULL,
      condition_name TEXT NOT NULL,
      diagnosis_type TEXT DEFAULT 'CONFIRMED', -- PRESUMPTIVE, CONFIRMED
      notes TEXT,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      prescribed_by TEXT NOT NULL,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      route TEXT NOT NULL, -- ORAL, IV, IM, TOPICAL, INHALATION
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT,
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, DISPENSED, DISCONTINUED, EXPIRED
      dispensed_by TEXT,
      dispensed_at TEXT,
      prescribed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (prescribed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lab_investigations (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      ordered_facility_id TEXT NOT NULL,
      ordered_by TEXT NOT NULL,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL, -- HEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY, IMAGING, SEROLOGY
      specimen TEXT,
      status TEXT DEFAULT 'ORDERED', -- ORDERED, SAMPLE_COLLECTED, IN_ANALYSIS, COMPLETED
      result_value TEXT,
      normal_range TEXT,
      units TEXT,
      interpretation TEXT, -- NORMAL, ABNORMAL, CRITICAL
      findings_notes TEXT,
      verified_by TEXT,
      ordered_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (ordered_facility_id) REFERENCES facilities(id),
      FOREIGN KEY (ordered_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS procedures (
      id TEXT PRIMARY KEY,
      encounter_id TEXT,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      surgeon_id TEXT NOT NULL,
      procedure_name TEXT NOT NULL,
      indication TEXT NOT NULL,
      surgical_team TEXT,                    -- Assistant surgeons, scrub nurses
      anesthesia_type TEXT DEFAULT 'GENERAL',-- GENERAL, SPINAL, LOCAL, SEDATION
      operative_notes TEXT,
      outcome TEXT,                          -- SUCCESSFUL, PARTIAL, COMPLICATIONS
      complications TEXT,
      post_op_treatment TEXT,                -- Antibiotics, analgesia, wound care
      recovery_progress TEXT,                -- Day 1-7 recovery status
      future_recommendations TEXT,           -- Follow-up surgery, implant removal
      performed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (surgeon_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      admitting_doctor_id TEXT NOT NULL,
      ward_name TEXT NOT NULL,               -- e.g. Medical Ward 3, Surgical ICU, Pediatric Ward
      bed_number TEXT NOT NULL,
      admission_reason TEXT NOT NULL,
      status TEXT DEFAULT 'ADMITTED',        -- ADMITTED, DISCHARGED, TRANSFERRED
      admitted_at TEXT DEFAULT (datetime('now')),
      discharge_date TEXT,
      discharge_summary TEXT,
      post_discharge_instructions TEXT,
      condition_on_discharge TEXT,           -- RECOVERED, IMPROVED, UNCHANGED, REFERRED
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (admitting_doctor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      doctor_id TEXT,
      department TEXT NOT NULL,              -- Internal Medicine, Surgery, Pediatrics, Ob/Gyn
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'SCHEDULED',       -- SCHEDULED, COMPLETED, CANCELLED
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      from_facility_id TEXT NOT NULL,
      to_facility_id TEXT NOT NULL,
      referring_clinician_id TEXT NOT NULL,
      urgency TEXT NOT NULL, -- ROUTINE, PRIORITY, EMERGENCY
      referral_reason TEXT NOT NULL,
      clinical_summary TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, ARRIVED, COUNTER_REFERRED, COMPLETED
      counter_referral_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (from_facility_id) REFERENCES facilities(id),
      FOREIGN KEY (to_facility_id) REFERENCES facilities(id),
      FOREIGN KEY (referring_clinician_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      facility_id TEXT,
      patient_id TEXT,
      action TEXT NOT NULL, -- VIEW_RECORD, CREATE_PATIENT, UPDATE_PATIENT, CREATE_ENCOUNTER, PRESCRIBE_MED, DISPENSE_MED, PUBLISH_LAB, CREATE_REFERRAL, BREAK_GLASS, EXPORT_FHIR
      resource_type TEXT,
      justification TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS duplicate_reviews (
      id TEXT PRIMARY KEY,
      candidate_patient_id TEXT NOT NULL,
      matched_patient_id TEXT NOT NULL,
      match_score REAL NOT NULL,
      match_reasons TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, RESOLVED_MERGED, RESOLVED_SEPARATE
      resolution_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- OTP AUTHORIZATION GATEWAY: Cross-Hospital Record Sharing
    CREATE TABLE IF NOT EXISTS otp_requests (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      requesting_facility_id TEXT NOT NULL,
      requesting_user_id TEXT NOT NULL,
      requesting_user_name TEXT NOT NULL,
      otp_code TEXT NOT NULL,                     -- 6-digit OTP (hashed in production)
      otp_purpose TEXT DEFAULT 'CROSS_HOSPITAL_RECORD_ACCESS',
      phone_number_sent_to TEXT NOT NULL,          -- Masked phone for display
      status TEXT DEFAULT 'PENDING',              -- PENDING, VERIFIED, EXPIRED, USED, CANCELLED, LOCKED
      failed_attempts INTEGER DEFAULT 0,          -- Max 3 incorrect attempts before invalidating
      expires_at TEXT NOT NULL,                   -- 5-minute expiry timestamp
      verified_at TEXT,
      access_session_token TEXT,                  -- Short-lived token for authorized record access
      session_expires_at TEXT,                    -- Access session valid for 60 mins
      patient_notified INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (requesting_facility_id) REFERENCES facilities(id)
    );

    -- RECORD ACCESS CONSENTS: Patient-authorized cross-hospital data sharing log
    CREATE TABLE IF NOT EXISTS record_access_consents (
      id TEXT PRIMARY KEY,
      otp_request_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      authorized_facility_id TEXT NOT NULL,
      authorized_user_id TEXT NOT NULL,
      access_scope TEXT NOT NULL,                 -- JSON: array of allowed record types
      granted_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (otp_request_id) REFERENCES otp_requests(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (authorized_facility_id) REFERENCES facilities(id)
    );

    -- VACCINATIONS & IMMUNIZATION (EPI Schedule: BCG, Pentavalent, PCV, Rota, Measles)
    CREATE TABLE IF NOT EXISTS vaccinations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      vaccine_name TEXT NOT NULL,
      dose_number INTEGER NOT NULL,
      date_given TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      administered_by TEXT NOT NULL,
      batch_number TEXT,
      next_due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    -- MATERNAL HEALTH & ANTENATAL CARE (ANC 1-4)
    CREATE TABLE IF NOT EXISTS maternal_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      visit_number TEXT NOT NULL,                 -- ANC 1, ANC 2, ANC 3, ANC 4, Postnatal
      gestational_age_weeks INTEGER NOT NULL,
      fundal_height_cm REAL,
      fetal_heart_rate_bpm INTEGER,
      blood_pressure TEXT,
      weight_kg REAL,
      tetanus_toxoid_status TEXT DEFAULT 'GIVEN',
      iron_folate_given INTEGER DEFAULT 1,
      hiv_test_result TEXT DEFAULT 'NON_REACTIVE',
      vdrl_test_result TEXT DEFAULT 'NON_REACTIVE',
      notes TEXT,
      facility_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    -- SIMULATED ETHIO TELECOM SMS NOTIFICATIONS & APPOINTMENT REMINDERS
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      message_type TEXT NOT NULL,                 -- APPOINTMENT_REMINDER, OTP_AUTH, REFERRAL_UPDATE, LAB_RESULT
      message_text TEXT NOT NULL,
      language TEXT DEFAULT 'en',                 -- en, om, am
      status TEXT DEFAULT 'DELIVERED',
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- NATIONAL BLOOD INVENTORY & EMERGENCY NETWORK
    CREATE TABLE IF NOT EXISTS blood_inventory (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      blood_group TEXT NOT NULL, -- A+, A-, B+, B-, AB+, AB-, O+, O-
      units_available INTEGER DEFAULT 0,
      component_type TEXT DEFAULT 'WHOLE_BLOOD', -- WHOLE_BLOOD, PRBC, FFP, PLATELETS
      storage_location TEXT,
      last_updated TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    CREATE TABLE IF NOT EXISTS blood_requests (
      id TEXT PRIMARY KEY,
      requesting_facility_id TEXT NOT NULL,
      fulfilling_facility_id TEXT,
      patient_id TEXT,
      blood_group TEXT NOT NULL,
      units_requested INTEGER NOT NULL,
      urgency_level TEXT DEFAULT 'CRITICAL', -- STAT_EMERGENCY, URGENT, ROUTINE
      clinical_indication TEXT,
      status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, IN_TRANSIT, FULFILLED, REJECTED
      requested_by TEXT,
      requested_at TEXT DEFAULT (datetime('now')),
      fulfilled_at TEXT,
      FOREIGN KEY (requesting_facility_id) REFERENCES facilities(id),
      FOREIGN KEY (fulfilling_facility_id) REFERENCES facilities(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);
  console.log('NPDMS Database schema initialized successfully.');
}

module.exports = {
  db,
  initDatabase
};
