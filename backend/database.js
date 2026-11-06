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
      type TEXT NOT NULL, -- SPECIALIZED_HOSPITAL, GENERAL_HOSPITAL, PRIMARY_HOSPITAL, HEALTH_CENTER
      region TEXT NOT NULL,
      zone TEXT NOT NULL,
      woreda TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER DEFAULT 1
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
      encounter_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      surgeon_id TEXT NOT NULL,
      procedure_name TEXT NOT NULL,
      indication TEXT NOT NULL,
      operative_notes TEXT,
      outcome TEXT,
      complications TEXT,
      performed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (surgeon_id) REFERENCES users(id)
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
  `);
  console.log('NPDMS Database schema initialized successfully.');
}

module.exports = {
  db,
  initDatabase
};
