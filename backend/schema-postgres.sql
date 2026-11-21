-- =====================================================================
-- FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA - MINISTRY OF HEALTH (FDRE-MOH)
-- NATIONAL PATIENT DATA MANAGEMENT SYSTEM (NPDMS)
-- PRODUCTION POSTGRESQL / NEON / SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 14+, Neon Serverless, Supabase, and AWS RDS
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Healthcare Facilities (Hospitals, Health Centers, Posts)
CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) UNIQUE NOT NULL,
    type VARCHAR(64) NOT NULL, -- SPECIALIZED_HOSPITAL, GENERAL_HOSPITAL, PRIMARY_HOSPITAL, HEALTH_CENTER, HEALTH_POST
    region VARCHAR(64) NOT NULL,
    zone VARCHAR(128) NOT NULL,
    woreda VARCHAR(128) NOT NULL,
    phone VARCHAR(32),
    email VARCHAR(128),
    address TEXT,
    bed_capacity INTEGER DEFAULT 0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    director_name VARCHAR(255),
    fayda_connected BOOLEAN DEFAULT TRUE,
    nhdis_connected BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff & Practitioners
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL, -- REGISTRATION_OFFICER, DOCTOR, NURSE, LAB_TECH, PHARMACIST, FACILITY_ADMIN, SYSTEM_ADMIN, PATIENT
    facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    professional_id VARCHAR(64),
    email VARCHAR(128),
    phone VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Master Patient Index (MPI)
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    npdms_id VARCHAR(64) UNIQUE NOT NULL,
    fayda_fin VARCHAR(64) UNIQUE,
    fayda_status VARCHAR(32) DEFAULT 'UNLINKED', -- VERIFIED, UNLINKED, PENDING_REVIEW
    first_name VARCHAR(128) NOT NULL,
    father_name VARCHAR(128) NOT NULL,
    grandfather_name VARCHAR(128) NOT NULL,
    first_name_amharic VARCHAR(128),
    father_name_amharic VARCHAR(128),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(16) NOT NULL,
    phone_number VARCHAR(32),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(32),
    region VARCHAR(64) NOT NULL,
    zone VARCHAR(128) NOT NULL,
    woreda VARCHAR(128) NOT NULL,
    kebele VARCHAR(64),
    house_number VARCHAR(64),
    blood_group VARCHAR(8),
    registered_facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Allergies
CREATE TABLE IF NOT EXISTS allergies (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    substance VARCHAR(255) NOT NULL,
    category VARCHAR(64), -- MEDICATION, FOOD, ENVIRONMENTAL
    severity VARCHAR(32) NOT NULL, -- MILD, MODERATE, SEVERE, LIFE_THREATENING
    reaction TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Encounters
CREATE TABLE IF NOT EXISTS encounters (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    practitioner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encounter_type VARCHAR(64) NOT NULL, -- OUTPATIENT, INPATIENT, EMERGENCY, MATERNAL, VACCINATION
    department VARCHAR(128),
    chief_complaint TEXT,
    history_of_presenting_illness TEXT,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    temperature_celsius NUMERIC(4,1),
    respiratory_rate INTEGER,
    oxygen_saturation NUMERIC(4,1),
    weight_kg NUMERIC(5,1),
    height_cm NUMERIC(5,1),
    physical_examination TEXT,
    clinical_notes TEXT,
    status VARCHAR(32) DEFAULT 'COMPLETED',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ
);

-- 6. Diagnoses
CREATE TABLE IF NOT EXISTS diagnoses (
    id VARCHAR(64) PRIMARY KEY,
    encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    icd11_code VARCHAR(32) NOT NULL,
    icd11_title VARCHAR(255) NOT NULL,
    diagnosis_type VARCHAR(32) NOT NULL, -- PRIMARY, SECONDARY, ADMISSION, DISCHARGE
    certainty VARCHAR(32) DEFAULT 'CONFIRMED',
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(64) PRIMARY KEY,
    encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(128) NOT NULL,
    route VARCHAR(64) NOT NULL,
    frequency VARCHAR(64) NOT NULL,
    duration_days INTEGER NOT NULL,
    dispense_quantity INTEGER,
    status VARCHAR(32) DEFAULT 'ACTIVE', -- ACTIVE, DISPENSED, CANCELLED, COMPLETED
    dispensed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    dispensed_at TIMESTAMPTZ,
    dispense_notes TEXT,
    prescribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Lab Investigations
CREATE TABLE IF NOT EXISTS lab_investigations (
    id VARCHAR(64) PRIMARY KEY,
    encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    loinc_code VARCHAR(32),
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- HEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY, PARASITOLOGY, SEROLOGY
    status VARCHAR(32) DEFAULT 'REQUESTED', -- REQUESTED, IN_PROGRESS, COMPLETED, CANCELLED
    specimen_type VARCHAR(64),
    specimen_collected_at TIMESTAMPTZ,
    result_numeric NUMERIC(10,2),
    result_text TEXT,
    result_unit VARCHAR(32),
    reference_range_low NUMERIC(10,2),
    reference_range_high NUMERIC(10,2),
    is_critical BOOLEAN DEFAULT FALSE,
    technician_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Procedures & Surgeries
CREATE TABLE IF NOT EXISTS procedures (
    id VARCHAR(64) PRIMARY KEY,
    encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    lead_surgeon_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    procedure_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- GENERAL_SURGERY, ORTHOPEDIC, OB_GYN, NEUROSURGERY, OPHTHALMIC, MINOR
    icd11_pcs_code VARCHAR(32),
    pre_op_diagnosis TEXT,
    post_op_diagnosis TEXT,
    surgical_findings TEXT,
    anesthesia_type VARCHAR(64),
    complications TEXT,
    outcome VARCHAR(64) DEFAULT 'SUCCESSFUL',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    scheduled_date DATE,
    status VARCHAR(32) DEFAULT 'COMPLETED'
);

-- 10. Inpatient Admissions
CREATE TABLE IF NOT EXISTS admissions (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    admitting_doctor_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ward_name VARCHAR(128) NOT NULL,
    bed_number VARCHAR(32) NOT NULL,
    admission_reason TEXT NOT NULL,
    admission_type VARCHAR(32) DEFAULT 'ELECTIVE',
    status VARCHAR(32) DEFAULT 'ADMITTED',
    discharge_doctor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    discharge_summary TEXT,
    admitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMPTZ
);

-- 11. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    practitioner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(16) NOT NULL,
    department VARCHAR(128),
    reason TEXT,
    status VARCHAR(32) DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Cross-Hospital Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referring_facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    referred_facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    referring_clinician_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    urgency VARCHAR(32) NOT NULL,
    reason_for_referral TEXT NOT NULL,
    clinical_summary TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'SUBMITTED',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs (Statutory Compliance Proclamation 1110/2019)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(64),
    justification TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Duplicate Patient Reviews
CREATE TABLE IF NOT EXISTS duplicate_reviews (
    id VARCHAR(64) PRIMARY KEY,
    patient_id_1 VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_id_2 VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    resolution_notes TEXT,
    resolved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Cross-Hospital Access OTP Requests
CREATE TABLE IF NOT EXISTS otp_requests (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requesting_facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    requesting_clinician_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(32) NOT NULL,
    otp_code VARCHAR(16) NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Record Access Consents
CREATE TABLE IF NOT EXISTS record_access_consents (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    granted_facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    granted_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    consent_type VARCHAR(32) NOT NULL,
    purpose TEXT,
    valid_until TIMESTAMPTZ NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Immunizations / Vaccinations
CREATE TABLE IF NOT EXISTS vaccinations (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    dose_number INTEGER NOT NULL,
    batch_number VARCHAR(64),
    expiration_date DATE,
    site VARCHAR(64),
    administered_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    administered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Maternal Health Records (ANC/PNC)
CREATE TABLE IF NOT EXISTS maternal_records (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    gravida INTEGER,
    para INTEGER,
    last_menstrual_period DATE,
    estimated_delivery_date DATE,
    gestational_age_weeks INTEGER,
    anc_visit_number INTEGER,
    risk_factors TEXT,
    hiv_status VARCHAR(32),
    syphilis_status VARCHAR(32),
    hemoglobin_level NUMERIC(4,1),
    blood_group_rh VARCHAR(8),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE CASCADE,
    phone_number VARCHAR(32),
    message_type VARCHAR(64) NOT NULL,
    message_text TEXT NOT NULL,
    language VARCHAR(8) DEFAULT 'en',
    status VARCHAR(32) DEFAULT 'SENT',
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 20. Emergency Blood Inventory
CREATE TABLE IF NOT EXISTS blood_inventory (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    blood_group VARCHAR(8) NOT NULL,
    units_available INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 21. Cross-Hospital Blood Transfusion Requests
CREATE TABLE IF NOT EXISTS blood_requests (
    id VARCHAR(64) PRIMARY KEY,
    requesting_facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    supplying_facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    blood_group VARCHAR(8) NOT NULL,
    units_requested INTEGER NOT NULL,
    urgency VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 22. National Cyber Defense Sentinel Threat Ledger
CREATE TABLE IF NOT EXISTS security_threats (
    id VARCHAR(64) PRIMARY KEY,
    threat_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    source_ip VARCHAR(64),
    endpoint VARCHAR(255),
    method VARCHAR(16),
    user_agent TEXT,
    payload_snippet TEXT,
    action_taken VARCHAR(64),
    reported_to_governance BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 23. Outbound SMS Gateway Logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    to_phone VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'GENERAL',
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    message_id VARCHAR(64),
    cost VARCHAR(32),
    simulated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Strategic Indices for Ultra-Fast Search across 100M+ Records
CREATE INDEX IF NOT EXISTS idx_patients_fayda ON patients(fayda_fin);
CREATE INDEX IF NOT EXISTS idx_patients_npdms ON patients(npdms_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_facility ON encounters(facility_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_encounter ON diagnoses(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_labs_patient ON lab_investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_threats ON security_threats(created_at DESC);
