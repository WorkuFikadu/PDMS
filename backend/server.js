// backend/server.js
const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./database');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize DB schema on startup
initDatabase();

// Helper: Audit logging helper
function recordAudit(userId, userName, userRole, facilityId, patientId, action, resourceType, justification, ip = '127.0.0.1') {
  try {
    const id = 'AUD-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, user_role, facility_id, patient_id, action, resource_type, justification, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, userId || 'SYS', userName || 'System User', userRole || 'CLINICIAN', facilityId || 'FAC-JUMC', patientId || null, action, resourceType, justification || '', ip);
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
}

// -------------------------------------------------------------
// 1. HEALTH & DEMO USERS / FACILITIES
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Ethiopia National Patient Data Management System (NPDMS)',
    version: '1.0.0-MVP',
    institution: 'Jimma University - Department of Computer Science',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/facilities', (req, res) => {
  const facilities = db.prepare('SELECT * FROM facilities WHERE is_active = 1').all();
  res.json(facilities);
});

app.get('/api/auth/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, u.facility_id, u.professional_id, u.email, u.phone,
           f.name as facility_name, f.code as facility_code
    FROM users u
    LEFT JOIN facilities f ON u.facility_id = f.id
    WHERE u.is_active = 1
  `).all();
  res.json(users);
});

// -------------------------------------------------------------
// 2. PATIENT REGISTRATION & IDENTITY MANAGEMENT
// -------------------------------------------------------------
app.get('/api/patients', (req, res) => {
  const { query, facilityId } = req.query;
  let sql = `
    SELECT p.*, f.name as registered_facility_name,
      (SELECT COUNT(*) FROM encounters WHERE patient_id = p.id) as encounter_count,
      (SELECT COUNT(*) FROM allergies WHERE patient_id = p.id AND status = 'ACTIVE') as allergy_count
    FROM patients p
    LEFT JOIN facilities f ON p.created_facility_id = f.id
  `;
  const params = [];

  if (query && query.trim() !== '') {
    const q = `%${query.trim()}%`;
    sql += ` WHERE (p.npdms_id LIKE ? OR p.fayda_fin LIKE ? OR p.first_name LIKE ? OR p.father_name LIKE ? OR p.grandfather_name LIKE ? OR p.phone_number LIKE ?)`;
    params.push(q, q, q, q, q, q);
  }

  sql += ` ORDER BY p.created_at DESC`;

  const patients = db.prepare(sql).all(...params);
  res.json(patients);
});

app.get('/api/patients/:id', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, f.name as registered_facility_name
    FROM patients p
    LEFT JOIN facilities f ON p.created_facility_id = f.id
    WHERE p.id = ? OR p.npdms_id = ?
  `).get(req.params.id, req.params.id);

  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found' });
  }

  // Get allergies
  const allergies = db.prepare(`
    SELECT a.*, f.name as facility_name, u.full_name as recorded_by_name
    FROM allergies a
    LEFT JOIN facilities f ON a.facility_id = f.id
    LEFT JOIN users u ON a.recorded_by = u.id
    WHERE a.patient_id = ?
    ORDER BY a.recorded_at DESC
  `).all(patient.id);

  // Get active medications
  const activeMedications = db.prepare(`
    SELECT pr.*, f.name as facility_name
    FROM prescriptions pr
    LEFT JOIN facilities f ON pr.facility_id = f.id
    WHERE pr.patient_id = ? AND pr.status = 'ACTIVE'
    ORDER BY pr.prescribed_at DESC
  `).all(patient.id);

  // Audit view
  recordAudit(
    req.headers['x-user-id'] || 'USR-DOC-01',
    req.headers['x-user-name'] || 'Healthcare Provider',
    req.headers['x-user-role'] || 'DOCTOR',
    req.headers['x-facility-id'] || 'FAC-JUMC',
    patient.id,
    'VIEW_RECORD',
    'PATIENT_FULL_CHART',
    'Routine clinical review or encounter initiation'
  );

  res.json({
    ...patient,
    allergies,
    activeMedications
  });
});

// Patient Registration with Duplicate Detection
app.post('/api/patients', (req, res) => {
  const {
    first_name, father_name, grandfather_name,
    first_name_amharic, father_name_amharic,
    date_of_birth, gender, phone_number,
    region, zone_woreda, kebele, house_number,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    blood_type, fayda_fin, fayda_status, is_emergency_provisional,
    facility_id, user_id, user_name, user_role
  } = req.body;

  if (!first_name || !father_name || !date_of_birth || !gender || !region) {
    return res.status(400).json({ error: 'Missing mandatory demographic fields' });
  }

  // Generate unique NPDMS ID: ETH-NPDMS-2026-XXXXXX
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const npdms_id = `ETH-NPDMS-2026-${randomSuffix}`;
  const patient_id = 'PAT-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  // Check for potential duplicate demographic match
  const potentialMatches = db.prepare(`
    SELECT id, npdms_id, first_name, father_name, grandfather_name, date_of_birth, phone_number
    FROM patients
    WHERE (LOWER(first_name) = LOWER(?) AND LOWER(father_name) = LOWER(?) AND date_of_birth = ?)
       OR (phone_number = ? AND phone_number IS NOT NULL AND phone_number != '')
  `).all(first_name, father_name, date_of_birth, phone_number || 'NONE');

  const insertStmt = db.prepare(`
    INSERT INTO patients (
      id, npdms_id, fayda_fin, fayda_status, first_name, father_name, grandfather_name,
      first_name_amharic, father_name_amharic, date_of_birth, gender, phone_number,
      region, zone_woreda, kebele, house_number,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      blood_type, is_emergency_provisional, created_facility_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  insertStmt.run(
    patient_id,
    npdms_id,
    fayda_fin || null,
    fayda_status || 'UNLINKED',
    first_name.trim(),
    father_name.trim(),
    (grandfather_name || '').trim(),
    first_name_amharic || null,
    father_name_amharic || null,
    date_of_birth,
    gender,
    phone_number || null,
    region,
    zone_woreda || 'N/A',
    kebele || 'N/A',
    house_number || 'N/A',
    emergency_contact_name || null,
    emergency_contact_phone || null,
    emergency_contact_relation || null,
    blood_type || 'Unknown',
    is_emergency_provisional ? 1 : 0,
    facility_id || 'FAC-JUMC'
  );

  let duplicateFlagged = null;
  if (potentialMatches.length > 0) {
    const matched = potentialMatches[0];
    const dupId = 'DUP-' + crypto.randomUUID().slice(0, 6).toUpperCase();
    db.prepare(`
      INSERT INTO duplicate_reviews (id, candidate_patient_id, matched_patient_id, match_score, match_reasons, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING_REVIEW')
    `).run(
      dupId,
      patient_id,
      matched.id,
      0.92,
      `Matched existing patient ${matched.npdms_id} (${matched.first_name} ${matched.father_name}) on demographics/phone`
    );
    duplicateFlagged = {
      review_id: dupId,
      matched_id: matched.id,
      matched_npdms_id: matched.npdms_id,
      matched_name: `${matched.first_name} ${matched.father_name}`
    };
  }

  recordAudit(
    user_id || 'USR-REG-01',
    user_name || 'Registration Officer',
    user_role || 'REGISTRATION_OFFICER',
    facility_id || 'FAC-JUMC',
    patient_id,
    'CREATE_PATIENT',
    'PATIENT_RECORD',
    `Registered new patient with NPDMS ID ${npdms_id}${fayda_fin ? ' (Linked to Fayda: ' + fayda_fin + ')' : ''}`
  );

  res.status(201).json({
    message: 'Patient registered successfully',
    id: patient_id,
    npdms_id,
    fayda_status: fayda_status || 'UNLINKED',
    duplicateFlagged
  });
});

// -------------------------------------------------------------
// 3. FAYDA ETHIOPIAN NATIONAL DIGITAL ID INTEGRATION SERVICE (MOCK)
// -------------------------------------------------------------
// Mock database of Fayda records representing national identity authority
const MOCK_FAYDA_REGISTRY = {
  '1985-7821-4923': {
    fin: '1985-7821-4923',
    first_name: 'Kemal',
    father_name: 'Mohammed',
    grandfather_name: 'Abba-Dula',
    first_name_amharic: 'ከማል',
    father_name_amharic: 'መሀመድ',
    date_of_birth: '1974-05-12',
    gender: 'MALE',
    phone_number: '+251-91-765-4321',
    region: 'Oromia',
    zone: 'Jimma',
    woreda: 'Jimma City',
    kebele: '04',
    photo_url: null,
    status: 'ACTIVE_VERIFIED'
  },
  '2001-3847-1920': {
    fin: '2001-3847-1920',
    first_name: 'Chaltu',
    father_name: 'Desta',
    grandfather_name: 'Tolosa',
    first_name_amharic: 'ጫልቱ',
    father_name_amharic: 'ደስታ',
    date_of_birth: '2001-08-20',
    gender: 'FEMALE',
    phone_number: '+251-93-112-2334',
    region: 'Oromia',
    zone: 'Jimma',
    woreda: 'Kersa',
    kebele: '02',
    photo_url: null,
    status: 'ACTIVE_VERIFIED'
  },
  '1990-1124-9981': {
    fin: '1990-1124-9981',
    first_name: 'Almaz',
    father_name: 'Hailu',
    grandfather_name: 'Girma',
    first_name_amharic: 'አልማዝ',
    father_name_amharic: 'ኃይሉ',
    date_of_birth: '1990-11-04',
    gender: 'FEMALE',
    phone_number: '+251-91-887-7665',
    region: 'Addis Ababa',
    zone: 'Lideta',
    woreda: 'Woreda 04',
    kebele: '04',
    photo_url: null,
    status: 'ACTIVE_VERIFIED'
  },
  '1992-6612-4410': {
    fin: '1992-6612-4410',
    first_name: 'Gudeta',
    father_name: 'Tulu',
    grandfather_name: 'Wako',
    first_name_amharic: 'ጉደታ',
    father_name_amharic: 'ቱሉ',
    date_of_birth: '1992-04-18',
    gender: 'MALE',
    phone_number: '+251-94-556-7788',
    region: 'Oromia',
    zone: 'Jimma',
    woreda: 'Mana',
    kebele: 'Yabu',
    photo_url: null,
    status: 'ACTIVE_VERIFIED'
  }
};

app.post('/api/fayda/lookup', (req, res) => {
  const { fin } = req.body;
  if (!fin) {
    return res.status(400).json({ error: 'Fayda ID (FIN) is required' });
  }

  const cleanFin = fin.trim();
  const faydaRecord = MOCK_FAYDA_REGISTRY[cleanFin];

  if (!faydaRecord) {
    // Return simulated failure or dynamic demo profile
    return res.status(404).json({
      error: 'Fayda ID not found in National Registry. Please verify the 12-digit FIN number or proceed with provisional internal registration.'
    });
  }

  // Check if already linked to another patient in NPDMS
  const existingPatient = db.prepare('SELECT id, npdms_id, first_name, father_name FROM patients WHERE fayda_fin = ?').get(cleanFin);

  res.json({
    verified: true,
    data: faydaRecord,
    alreadyLinkedPatient: existingPatient || null
  });
});

app.post('/api/fayda/link/:patientId', (req, res) => {
  const { fin, user_id, user_name, user_role, facility_id } = req.body;
  const { patientId } = req.params;

  const faydaRecord = MOCK_FAYDA_REGISTRY[fin];
  if (!faydaRecord) {
    return res.status(400).json({ error: 'Invalid Fayda FIN' });
  }

  // Update patient record
  db.prepare(`
    UPDATE patients
    SET fayda_fin = ?, fayda_status = 'VERIFIED', updated_at = datetime('now')
    WHERE id = ?
  `).run(fin, patientId);

  recordAudit(
    user_id || 'USR-REG-01',
    user_name || 'Registration Officer',
    user_role || 'REGISTRATION_OFFICER',
    facility_id || 'FAC-JUMC',
    patientId,
    'UPDATE_PATIENT',
    'FAYDA_IDENTITY_LINK',
    `Verified and linked National Digital ID (FIN: ${fin}) to patient record.`
  );

  res.json({ success: true, message: 'Fayda National ID linked successfully!' });
});

// -------------------------------------------------------------
// 4. DUPLICATE PATIENT REVIEW QUEUE
// -------------------------------------------------------------
app.get('/api/duplicates', (req, res) => {
  const list = db.prepare(`
    SELECT d.*,
      p1.npdms_id as candidate_npdms, p1.first_name as cand_fname, p1.father_name as cand_lname, p1.date_of_birth as cand_dob, p1.phone_number as cand_phone,
      p2.npdms_id as matched_npdms, p2.first_name as match_fname, p2.father_name as match_lname, p2.date_of_birth as match_dob, p2.phone_number as match_phone
    FROM duplicate_reviews d
    JOIN patients p1 ON d.candidate_patient_id = p1.id
    JOIN patients p2 ON d.matched_patient_id = p2.id
    WHERE d.status = 'PENDING_REVIEW'
    ORDER BY d.created_at DESC
  `).all();
  res.json(list);
});

app.post('/api/duplicates/resolve', (req, res) => {
  const { reviewId, action, notes, user_id, user_name, user_role, facility_id } = req.body;
  // action: 'MERGE' or 'SEPARATE'

  const review = db.prepare('SELECT * FROM duplicate_reviews WHERE id = ?').get(reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review item not found' });
  }

  if (action === 'MERGE') {
    // Re-assign encounters, prescriptions, allergies from candidate to matched
    db.prepare('UPDATE encounters SET patient_id = ? WHERE patient_id = ?').run(review.matched_patient_id, review.candidate_patient_id);
    db.prepare('UPDATE allergies SET patient_id = ? WHERE patient_id = ?').run(review.matched_patient_id, review.candidate_patient_id);
    db.prepare('UPDATE prescriptions SET patient_id = ? WHERE patient_id = ?').run(review.matched_patient_id, review.candidate_patient_id);
    db.prepare('UPDATE lab_investigations SET patient_id = ? WHERE patient_id = ?').run(review.matched_patient_id, review.candidate_patient_id);
    db.prepare('UPDATE referrals SET patient_id = ? WHERE patient_id = ?').run(review.matched_patient_id, review.candidate_patient_id);

    // Mark candidate patient as merged / inactive
    db.prepare("UPDATE patients SET npdms_id = npdms_id || '-MERGED', updated_at = datetime('now') WHERE id = ?").run(review.candidate_patient_id);

    db.prepare(`
      UPDATE duplicate_reviews
      SET status = 'RESOLVED_MERGED', resolution_notes = ?, reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(notes || 'Approved merge into primary master record', user_name || 'Admin', reviewId);

    recordAudit(user_id, user_name, user_role, facility_id, review.matched_patient_id, 'UPDATE_PATIENT', 'DUPLICATE_MERGE', `Merged duplicate record ${review.candidate_patient_id} into primary record.`);
  } else {
    db.prepare(`
      UPDATE duplicate_reviews
      SET status = 'RESOLVED_SEPARATE', resolution_notes = ?, reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(notes || 'Confirmed distinct individuals', user_name || 'Admin', reviewId);
  }

  res.json({ success: true, message: `Record resolution ${action} completed successfully.` });
});

// -------------------------------------------------------------
// 5. LONGITUDINAL EHR: ENCOUNTERS & TIMELINE
// -------------------------------------------------------------
app.get('/api/encounters/patient/:patientId', (req, res) => {
  const encounters = db.prepare(`
    SELECT e.*,
      f.name as facility_name, f.code as facility_code, f.region as facility_region,
      u.full_name as provider_name, u.role as provider_role
    FROM encounters e
    JOIN facilities f ON e.facility_id = f.id
    JOIN users u ON e.provider_id = u.id
    WHERE e.patient_id = ?
    ORDER BY e.started_at DESC
  `).all(req.params.patientId);

  // Attach diagnoses, prescriptions, and lab orders for each encounter
  const enriched = encounters.map(enc => {
    const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE encounter_id = ?').all(enc.id);
    const prescriptions = db.prepare('SELECT * FROM prescriptions WHERE encounter_id = ?').all(enc.id);
    const labs = db.prepare('SELECT * FROM lab_investigations WHERE encounter_id = ?').all(enc.id);
    const procedures = db.prepare('SELECT * FROM procedures WHERE encounter_id = ?').all(enc.id);

    let vitals = null;
    let soapNotes = null;
    try { vitals = enc.vitals_json ? JSON.parse(enc.vitals_json) : null; } catch (e) {}
    try { soapNotes = enc.soap_notes_json ? JSON.parse(enc.soap_notes_json) : null; } catch (e) {}

    return {
      ...enc,
      vitals,
      soapNotes,
      diagnoses,
      prescriptions,
      labs,
      procedures
    };
  });

  res.json(enriched);
});

// Create New Encounter
app.post('/api/encounters', (req, res) => {
  const {
    patient_id, facility_id, provider_id, encounter_type, chief_complaint,
    vitals, soap_notes, parent_encounter_id, treatment_rationale,
    diagnoses, prescriptions, labs,
    user_name, user_role
  } = req.body;

  if (!patient_id || !facility_id || !provider_id || !chief_complaint) {
    return res.status(400).json({ error: 'Missing mandatory encounter fields' });
  }

  const encId = 'ENC-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  db.prepare(`
    INSERT INTO encounters (
      id, patient_id, facility_id, provider_id, encounter_type, chief_complaint,
      vitals_json, soap_notes_json, status, parent_encounter_id, treatment_rationale, started_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, datetime('now'), datetime('now'))
  `).run(
    encId,
    patient_id,
    facility_id,
    provider_id,
    encounter_type || 'OUTPATIENT',
    chief_complaint,
    vitals ? JSON.stringify(vitals) : null,
    soap_notes ? JSON.stringify(soap_notes) : null,
    parent_encounter_id || null,
    treatment_rationale || null
  );

  // Insert diagnoses
  if (Array.isArray(diagnoses)) {
    const insertDx = db.prepare(`
      INSERT INTO diagnoses (id, encounter_id, patient_id, icd10_code, condition_name, diagnosis_type, notes, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    diagnoses.forEach(d => {
      const dxId = 'DX-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      insertDx.run(dxId, encId, patient_id, d.icd10_code || 'R69', d.condition_name, d.diagnosis_type || 'CONFIRMED', d.notes || '');
    });
  }

  // Insert prescriptions
  if (Array.isArray(prescriptions)) {
    const insertRx = db.prepare(`
      INSERT INTO prescriptions (id, encounter_id, patient_id, facility_id, prescribed_by, medication_name, dosage, route, frequency, duration, instructions, status, prescribed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
    `);
    prescriptions.forEach(p => {
      const rxId = 'RX-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      insertRx.run(rxId, encId, patient_id, facility_id, provider_id, p.medication_name, p.dosage, p.route || 'ORAL', p.frequency, p.duration, p.instructions || '');
    });
  }

  // Insert lab orders
  if (Array.isArray(labs)) {
    const insertLab = db.prepare(`
      INSERT INTO lab_investigations (id, encounter_id, patient_id, ordered_facility_id, ordered_by, test_name, category, specimen, status, ordered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ORDERED', datetime('now'))
    `);
    labs.forEach(l => {
      const labId = 'LAB-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      insertLab.run(labId, encId, patient_id, facility_id, provider_id, l.test_name, l.category || 'BIOCHEMISTRY', l.specimen || 'Blood');
    });
  }

  recordAudit(
    provider_id,
    user_name || 'Clinician',
    user_role || 'DOCTOR',
    facility_id,
    patient_id,
    'CREATE_ENCOUNTER',
    'CLINICAL_ENCOUNTER',
    `Documented ${encounter_type} encounter: ${chief_complaint.slice(0, 60)}`
  );

  res.status(201).json({ success: true, encounter_id: encId, message: 'Encounter registered successfully' });
});

// Document New Allergy
app.post('/api/allergies', (req, res) => {
  const { patient_id, allergen, reaction, severity, facility_id, user_id, user_name, user_role } = req.body;
  if (!patient_id || !allergen || !severity) {
    return res.status(400).json({ error: 'Patient ID, allergen, and severity are required' });
  }

  const id = 'ALG-' + crypto.randomUUID().slice(0, 6).toUpperCase();
  db.prepare(`
    INSERT INTO allergies (id, patient_id, allergen, reaction, severity, status, facility_id, recorded_by, recorded_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, datetime('now'))
  `).run(id, patient_id, allergen, reaction || '', severity, facility_id || 'FAC-JUMC', user_id || 'USR-DOC-01');

  recordAudit(user_id, user_name, user_role, facility_id, patient_id, 'UPDATE_PATIENT', 'ALLERGY_RECORD', `Documented ${severity} allergy to ${allergen}`);

  res.status(201).json({ success: true, allergy_id: id });
});

// -------------------------------------------------------------
// 6. PRESCRIPTION & PHARMACY MODULE WITH CLINICAL SAFETY ALERTS
// -------------------------------------------------------------
app.get('/api/prescriptions/patient/:patientId', (req, res) => {
  const list = db.prepare(`
    SELECT pr.*, f.name as facility_name, u.full_name as prescriber_name,
      d.full_name as dispenser_name
    FROM prescriptions pr
    JOIN facilities f ON pr.facility_id = f.id
    JOIN users u ON pr.prescribed_by = u.id
    LEFT JOIN users d ON pr.dispensed_by = d.id
    WHERE pr.patient_id = ?
    ORDER BY pr.prescribed_at DESC
  `).all(req.params.patientId);
  res.json(list);
});

// Safety Check Endpoint: Detects Allergies & Duplicate Active Drugs Before Prescribing
app.post('/api/prescriptions/safety-check', (req, res) => {
  const { patient_id, medication_name } = req.body;
  const warnings = [];

  // 1. Check allergies
  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ? AND status = 'ACTIVE'").all(patient_id);
  const medLower = (medication_name || '').toLowerCase();

  for (const alg of allergies) {
    const algLower = alg.allergen.toLowerCase();
    if (
      (medLower.includes('penicillin') || medLower.includes('amoxicillin') || medLower.includes('ampicillin')) &&
      (algLower.includes('penicillin') || algLower.includes('amoxicillin'))
    ) {
      warnings.push({
        type: 'ALLERGY_ALERT',
        level: 'CRITICAL',
        title: 'Documented Severe Allergy Alert!',
        message: `Patient has a documented ${alg.severity} allergy to '${alg.allergen}'. Known reaction: '${alg.reaction}'. Prescribing '${medication_name}' carries high anaphylaxis risk!`
      });
    } else if (
      (medLower.includes('bactrim') || medLower.includes('sulfonamide') || medLower.includes('cotrimoxazole')) &&
      algLower.includes('sulf')
    ) {
      warnings.push({
        type: 'ALLERGY_ALERT',
        level: 'CRITICAL',
        title: 'Sulfa Allergy Warning!',
        message: `Patient has documented allergy to '${alg.allergen}'. Reaction: '${alg.reaction}'.`
      });
    } else if (
      (medLower.includes('diclofenac') || medLower.includes('ibuprofen') || medLower.includes('indomethacin')) &&
      (algLower.includes('nsaid') || algLower.includes('aspirin') || algLower.includes('diclofenac'))
    ) {
      warnings.push({
        type: 'ALLERGY_ALERT',
        level: 'WARNING',
        title: 'NSAID Sensitivity Alert',
        message: `Patient has documented sensitivity to '${alg.allergen}'.`
      });
    }
  }

  // 2. Check for duplicate active medication
  const activeMeds = db.prepare("SELECT * FROM prescriptions WHERE patient_id = ? AND status = 'ACTIVE'").all(patient_id);
  for (const act of activeMeds) {
    if (act.medication_name.toLowerCase().includes(medLower) || medLower.includes(act.medication_name.toLowerCase())) {
      warnings.push({
        type: 'DUPLICATE_THERAPY',
        level: 'WARNING',
        title: 'Duplicate Active Therapy Detected',
        message: `Patient already has active prescription for '${act.medication_name}' (${act.dosage}, ${act.frequency}) prescribed at ${act.prescribed_at}.`
      });
    }
  }

  res.json({ safe: warnings.length === 0, warnings });
});

// Pharmacy Dispense Action
app.post('/api/prescriptions/:id/dispense', (req, res) => {
  const { user_id, user_name, user_role, facility_id } = req.body;
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);

  if (!rx) {
    return res.status(404).json({ error: 'Prescription not found' });
  }

  db.prepare(`
    UPDATE prescriptions
    SET status = 'DISPENSED', dispensed_by = ?, dispensed_at = datetime('now')
    WHERE id = ?
  `).run(user_id || 'USR-PHARM-01', req.params.id);

  recordAudit(
    user_id || 'USR-PHARM-01',
    user_name || 'Pharmacist',
    user_role || 'PHARMACIST',
    facility_id || 'FAC-JUMC',
    rx.patient_id,
    'DISPENSE_MED',
    'PRESCRIPTION',
    `Dispensed ${rx.medication_name} ${rx.dosage} (${rx.frequency})`
  );

  res.json({ success: true, message: 'Prescription dispensed successfully' });
});

app.get('/api/pharmacy/queue', (req, res) => {
  const queue = db.prepare(`
    SELECT pr.*, p.npdms_id, p.first_name, p.father_name, p.phone_number, f.name as facility_name, u.full_name as prescriber_name
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN facilities f ON pr.facility_id = f.id
    JOIN users u ON pr.prescribed_by = u.id
    WHERE pr.status = 'ACTIVE'
    ORDER BY pr.prescribed_at DESC
  `).all();
  res.json(queue);
});

// -------------------------------------------------------------
// 7. DIAGNOSTIC LAB & IMAGING MODULE
// -------------------------------------------------------------
app.get('/api/labs/queue', (req, res) => {
  const queue = db.prepare(`
    SELECT l.*, p.npdms_id, p.first_name, p.father_name, f.name as facility_name, u.full_name as ordering_clinician
    FROM lab_investigations l
    JOIN patients p ON l.patient_id = p.id
    JOIN facilities f ON l.ordered_facility_id = f.id
    JOIN users u ON l.ordered_by = u.id
    ORDER BY l.ordered_at DESC
  `).all();
  res.json(queue);
});

app.post('/api/labs/:id/publish', (req, res) => {
  const { result_value, normal_range, units, interpretation, findings_notes, user_id, user_name, user_role, facility_id } = req.body;
  const lab = db.prepare('SELECT * FROM lab_investigations WHERE id = ?').get(req.params.id);

  if (!lab) {
    return res.status(404).json({ error: 'Investigation order not found' });
  }

  db.prepare(`
    UPDATE lab_investigations
    SET status = 'COMPLETED', result_value = ?, normal_range = ?, units = ?, interpretation = ?,
        findings_notes = ?, verified_by = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(
    result_value,
    normal_range || 'Reference range',
    units || '',
    interpretation || 'NORMAL',
    findings_notes || '',
    user_id || 'USR-LAB-01',
    req.params.id
  );

  recordAudit(
    user_id || 'USR-LAB-01',
    user_name || 'Lab Technologist',
    user_role || 'LAB_TECH',
    facility_id || 'FAC-JUMC',
    lab.patient_id,
    'PUBLISH_LAB',
    'DIAGNOSTIC_RESULT',
    `Published ${lab.test_name} result: ${result_value} ${units} (${interpretation})`
  );

  res.json({ success: true, message: 'Investigation result verified and published.' });
});

// -------------------------------------------------------------
// 8. INTER-FACILITY REFERRALS & CONTINUITY HUB
// -------------------------------------------------------------
app.get('/api/referrals', (req, res) => {
  const referrals = db.prepare(`
    SELECT r.*,
      p.npdms_id, p.first_name, p.father_name, p.gender, p.date_of_birth,
      f1.name as from_facility_name, f1.code as from_facility_code,
      f2.name as to_facility_name, f2.code as to_facility_code,
      u.full_name as referring_clinician_name
    FROM referrals r
    JOIN patients p ON r.patient_id = p.id
    JOIN facilities f1 ON r.from_facility_id = f1.id
    JOIN facilities f2 ON r.to_facility_id = f2.id
    JOIN users u ON r.referring_clinician_id = u.id
    ORDER BY r.created_at DESC
  `).all();
  res.json(referrals);
});

app.post('/api/referrals', (req, res) => {
  const {
    patient_id, from_facility_id, to_facility_id, referring_clinician_id,
    urgency, referral_reason, clinical_summary,
    user_name, user_role
  } = req.body;

  if (!patient_id || !to_facility_id || !referral_reason) {
    return res.status(400).json({ error: 'Missing mandatory referral fields' });
  }

  const refId = 'REF-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO referrals (
      id, patient_id, from_facility_id, to_facility_id, referring_clinician_id,
      urgency, referral_reason, clinical_summary, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
  `).run(
    refId,
    patient_id,
    from_facility_id || 'FAC-AGARO',
    to_facility_id,
    referring_clinician_id || 'USR-DOC-03',
    urgency || 'PRIORITY',
    referral_reason,
    clinical_summary || ''
  );

  recordAudit(
    referring_clinician_id,
    user_name || 'Clinician',
    user_role || 'DOCTOR',
    from_facility_id,
    patient_id,
    'CREATE_REFERRAL',
    'REFERRAL_RECORD',
    `Created ${urgency} referral to facility ${to_facility_id}: ${referral_reason}`
  );

  res.status(201).json({ success: true, referral_id: refId, message: 'Referral dispatched successfully' });
});

app.post('/api/referrals/:id/respond', (req, res) => {
  const { status, counter_referral_summary, user_id, user_name, user_role, facility_id } = req.body;
  const ref = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id);

  if (!ref) {
    return res.status(404).json({ error: 'Referral not found' });
  }

  db.prepare(`
    UPDATE referrals
    SET status = ?, counter_referral_summary = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status || 'COUNTER_REFERRED', counter_referral_summary || '', req.params.id);

  recordAudit(
    user_id,
    user_name,
    user_role,
    facility_id,
    ref.patient_id,
    'UPDATE_PATIENT',
    'REFERRAL_RESPONSE',
    `Updated referral status to ${status}. Counter-referral guidance provided.`
  );

  res.json({ success: true, message: 'Referral updated successfully' });
});

// -------------------------------------------------------------
// 8B. SURGICAL & OPERATION MANAGEMENT MODULE
// -------------------------------------------------------------
app.get('/api/procedures', (req, res) => {
  const { patient_id } = req.query;
  let sql = `
    SELECT pr.*, p.first_name, p.father_name, p.npdms_id, f.name as facility_name, f.code as facility_code, u.full_name as surgeon_name
    FROM procedures pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN facilities f ON pr.facility_id = f.id
    JOIN users u ON pr.surgeon_id = u.id
  `;
  const params = [];
  if (patient_id) {
    sql += ' WHERE pr.patient_id = ?';
    params.push(patient_id);
  }
  sql += ' ORDER BY pr.performed_at DESC';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

app.post('/api/procedures', (req, res) => {
  const {
    patient_id, facility_id, surgeon_id, procedure_name, indication,
    surgical_team, anesthesia_type, operative_notes, outcome, complications,
    post_op_treatment, recovery_progress, future_recommendations,
    user_name, user_role
  } = req.body;

  if (!patient_id || !procedure_name || !indication) {
    return res.status(400).json({ error: 'Patient ID, procedure name, and indication are mandatory.' });
  }

  const procId = 'PROC-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO procedures (
      id, patient_id, facility_id, surgeon_id, procedure_name, indication,
      surgical_team, anesthesia_type, operative_notes, outcome, complications,
      post_op_treatment, recovery_progress, future_recommendations, performed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    procId,
    patient_id,
    facility_id || 'FAC-JUMC',
    surgeon_id || 'USR-DOC-01',
    procedure_name,
    indication,
    surgical_team || 'Surgical Team JUMC',
    anesthesia_type || 'GENERAL',
    operative_notes || '',
    outcome || 'SUCCESSFUL',
    complications || 'None reported',
    post_op_treatment || '',
    recovery_progress || 'Stable recovery',
    future_recommendations || 'Routine wound inspection in 7 days'
  );

  recordAudit(
    surgeon_id,
    user_name || 'Surgeon',
    user_role || 'DOCTOR',
    facility_id,
    patient_id,
    'CREATE_PROCEDURE',
    'SURGICAL_RECORD',
    `Documented surgical operation: ${procedure_name} (${outcome})`
  );

  res.status(201).json({ success: true, procedure_id: procId, message: 'Surgical record documented successfully.' });
});

// -------------------------------------------------------------
// 8C. INPATIENT ADMISSIONS & DISCHARGE MANAGEMENT MODULE
// -------------------------------------------------------------
app.get('/api/admissions', (req, res) => {
  const { status, patient_id } = req.query;
  let sql = `
    SELECT a.*, p.first_name, p.father_name, p.npdms_id, p.date_of_birth, p.gender,
      f.name as facility_name, f.code as facility_code, u.full_name as doctor_name
    FROM admissions a
    JOIN patients p ON a.patient_id = p.id
    JOIN facilities f ON a.facility_id = f.id
    JOIN users u ON a.admitting_doctor_id = u.id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (patient_id) {
    conditions.push('a.patient_id = ?');
    params.push(patient_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.admitted_at DESC';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

app.post('/api/admissions', (req, res) => {
  const {
    patient_id, facility_id, admitting_doctor_id, ward_name, bed_number, admission_reason,
    user_name, user_role
  } = req.body;

  if (!patient_id || !ward_name || !bed_number || !admission_reason) {
    return res.status(400).json({ error: 'Patient ID, ward, bed number, and reason are required.' });
  }

  const admId = 'ADM-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO admissions (
      id, patient_id, facility_id, admitting_doctor_id, ward_name, bed_number,
      admission_reason, status, admitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ADMITTED', datetime('now'))
  `).run(
    admId,
    patient_id,
    facility_id || 'FAC-JUMC',
    admitting_doctor_id || 'USR-DOC-01',
    ward_name,
    bed_number,
    admission_reason
  );

  recordAudit(
    admitting_doctor_id,
    user_name || 'Admitting Clinician',
    user_role || 'DOCTOR',
    facility_id,
    patient_id,
    'CREATE_ADMISSION',
    'INPATIENT_ADMISSION',
    `Admitted patient to ${ward_name}, Bed ${bed_number}. Indication: ${admission_reason}`
  );

  res.status(201).json({ success: true, admission_id: admId, message: 'Patient admitted successfully.' });
});

app.post('/api/admissions/:id/discharge', (req, res) => {
  const { discharge_summary, post_discharge_instructions, condition_on_discharge, user_id, user_name, user_role, facility_id } = req.body;
  const adm = db.prepare('SELECT * FROM admissions WHERE id = ?').get(req.params.id);

  if (!adm) {
    return res.status(404).json({ error: 'Admission record not found' });
  }

  db.prepare(`
    UPDATE admissions
    SET status = 'DISCHARGED', discharge_date = datetime('now'),
        discharge_summary = ?, post_discharge_instructions = ?, condition_on_discharge = ?
    WHERE id = ?
  `).run(
    discharge_summary || 'Discharged in stable condition',
    post_discharge_instructions || 'Routine outpatient follow-up',
    condition_on_discharge || 'IMPROVED',
    req.params.id
  );

  recordAudit(
    user_id,
    user_name,
    user_role,
    facility_id,
    adm.patient_id,
    'DISCHARGE_PATIENT',
    'INPATIENT_DISCHARGE',
    `Discharged from ${adm.ward_name}. Condition: ${condition_on_discharge || 'IMPROVED'}`
  );

  res.json({ success: true, message: 'Patient discharged and discharge summary archived to longitudinal record.' });
});

// -------------------------------------------------------------
// 8D. APPOINTMENTS & VISIT SCHEDULING MODULE
// -------------------------------------------------------------
app.get('/api/appointments', (req, res) => {
  const { patient_id } = req.query;
  let sql = `
    SELECT ap.*, p.first_name, p.father_name, p.npdms_id, p.phone_number,
      f.name as facility_name, f.code as facility_code, u.full_name as doctor_name
    FROM appointments ap
    JOIN patients p ON ap.patient_id = p.id
    JOIN facilities f ON ap.facility_id = f.id
    LEFT JOIN users u ON ap.doctor_id = u.id
  `;
  const params = [];
  if (patient_id) {
    sql += ' WHERE ap.patient_id = ?';
    params.push(patient_id);
  }
  sql += ' ORDER BY ap.appointment_date ASC, ap.appointment_time ASC';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

app.post('/api/appointments', (req, res) => {
  const {
    patient_id, facility_id, doctor_id, department,
    appointment_date, appointment_time, reason,
    user_name, user_role
  } = req.body;

  if (!patient_id || !department || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Patient ID, department, date, and time are required.' });
  }

  const aptId = 'APT-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO appointments (
      id, patient_id, facility_id, doctor_id, department, appointment_date, appointment_time, reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
  `).run(
    aptId,
    patient_id,
    facility_id || 'FAC-JUMC',
    doctor_id || 'USR-DOC-01',
    department,
    appointment_date,
    appointment_time,
    reason || 'Routine clinical follow-up'
  );

  recordAudit(
    doctor_id,
    user_name || 'Scheduling Staff',
    user_role || 'REGISTRATION_OFFICER',
    facility_id,
    patient_id,
    'SCHEDULE_APPOINTMENT',
    'APPOINTMENT_RECORD',
    `Scheduled appointment for ${department} on ${appointment_date} at ${appointment_time}`
  );

  res.status(201).json({ success: true, appointment_id: aptId, message: 'Appointment scheduled successfully.' });
});

// -------------------------------------------------------------
// 8E. AI CLINICAL COPILOT & LONGITUDINAL RECORD SUMMARIZER
// -------------------------------------------------------------
app.post('/api/ai/summarize', (req, res) => {
  const { patient_id, language = 'en', user_name, user_role, facility_id } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  const patient = db.prepare(`
    SELECT p.*, f.name as facility_name
    FROM patients p LEFT JOIN facilities f ON p.created_facility_id = f.id
    WHERE p.id = ? OR p.npdms_id = ?
  `).get(patient_id, patient_id);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ? AND status = 'ACTIVE'").all(patient.id);
  const encounters = db.prepare(`
    SELECT e.*, f.name as facility_name, u.full_name as provider_name
    FROM encounters e
    JOIN facilities f ON e.facility_id = f.id
    JOIN users u ON e.provider_id = u.id
    WHERE e.patient_id = ?
    ORDER BY e.started_at DESC
  `).all(patient.id);
  const diagnoses = db.prepare("SELECT * FROM diagnoses WHERE patient_id = ?").all(patient.id);
  const activeRx = db.prepare("SELECT * FROM prescriptions WHERE patient_id = ? AND status = 'ACTIVE'").all(patient.id);
  const labs = db.prepare("SELECT * FROM lab_investigations WHERE patient_id = ? AND status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 6").all(patient.id);
  const procedures = db.prepare("SELECT * FROM procedures WHERE patient_id = ? ORDER BY performed_at DESC").all(patient.id);

  // Synthesize intelligent clinical analysis
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  const criticalAllergies = allergies.filter(a => a.severity === 'LIFE_THREATENING' || a.severity === 'SEVERE');
  const abnormalLabs = labs.filter(l => l.interpretation === 'ABNORMAL' || l.interpretation === 'CRITICAL');

  let summaryContent = {};

  if (language === 'om') {
    summaryContent = {
      executiveDigest: `Dhukkubsataan ${patient.first_name} ${patient.father_name} (${age} waggaa, ${patient.gender}) galmee yaalaa dhaabbilee ${encounters.length} keessatti qaba. Jalqaba Hospitaala Agarootti qorannoo dhiibbaa dhiigaa olka'aa fi sukkaara dhiigaatiin qabamee yaalli eegalame. Itti aansuudhaan JUMC keessatti qorannoon bal'aan taasifamee doozii qorichaa foyya'eera.`,
      criticalAlerts: criticalAllergies.length > 0
        ? `⚠️ AKE EKKACHIISA ALARJII: Dhukkubsataan alarjii cimaa qoricha '${criticalAllergies.map(a => a.allergen).join(', ')}' irratti qaba. Anaphylaxis fiduu danda'a.`
        : 'Alarjiin balaa qabu hin galmoofne.',
      activeRegimen: `Qorichoota ammaa: ${activeRx.map(r => `${r.medication_name} (${r.dosage}, ${r.frequency})`).join('; ') || 'Qorichi hin jiru'}.`,
      labInsights: abnormalLabs.length > 0
        ? `Bu'aa qorannoo xiyyeeffannaa barbaadu: ${abnormalLabs.map(l => `${l.test_name}: ${l.result_value} ${l.units} (${l.interpretation})`).join(' | ')}.`
        : 'Qorannoon laabii hundi idileedha.',
      recommendedPlan: "Hordoffii dhiibbaa dhiigaa itti fufuu, qorannoo sukkaaraa (HbA1c) ji'oota 3 keessatti irra deebiin qorachuu, fi gorsa soorataa kennuu."
    };
  } else if (language === 'am') {
    summaryContent = {
      executiveDigest: `ታካሚ ${patient.first_name} ${patient.father_name} (ዕድሜ ${age}፣ ${patient.gender === 'MALE' ? 'ወንድ' : 'ሴት'}) በ${encounters.length} የተለያዩ የጤና ተቋማት የህክምና ታሪክ አላቸው። በአጋሮ የመጀመሪያ ደረጃ ሆስፒታል ለደም ግፊት እና ስኳር ምርመራ ከተደረገ በኋላ ወደ ጅማ ዩኒቨርሲቲ ስፔሻላይዝድ ሆስፒታል ተልከው የተሟላ ምርመራ እና የመድኃኒት ማስተካከያ ተደርጎላቸዋል።`,
      criticalAlerts: criticalAllergies.length > 0
        ? `⚠️ አስቸኳይ የአለርጂ ማስጠንቀቂያ፡ ታካሚው ለ'${criticalAllergies.map(a => a.allergen).join('፣ ')}' ከፍተኛ አለርጂ (Anaphylaxis) አለባቸው። መታዘዝ የለበትም።`
        : 'የከፋ አለርጂ አልተመዘገበም።',
      activeRegimen: `ወቅታዊ መድኃኒቶች፡ ${activeRx.map(r => `${r.medication_name} (${r.dosage}፣ ${r.frequency})`).join('፤ ') || 'ምንም አልታዘዘም'}።`,
      labInsights: abnormalLabs.length > 0
        ? `ክትትል የሚሹ የላብ ውጤቶች፡ ${abnormalLabs.map(l => `${l.test_name}፡ ${l.result_value} ${l.units} (${l.interpretation})`).join(' | ')}።`
        : 'ሁሉም የላብ ውጤቶች በመደበኛ ክልል ውስጥ ናቸው።',
      recommendedPlan: 'የደም ግፊት ክትትልን መቀጠል፤ የኩላሊት ተግባር እና የስኳር (HbA1c) ምርመራ በ3 ወራት ውስጥ መደገም፤ የአመጋገብ ምክክር መቀጠል።'
    };
  } else {
    summaryContent = {
      executiveDigest: `${patient.first_name} ${patient.father_name} (${age}yo ${patient.gender}) has a longitudinal care trajectory across ${encounters.length} participating health facilities. Initially diagnosed with uncontrolled Stage 2 Hypertension and Type 2 Diabetes at Agaro Primary Hospital; subsequently stepped-up on dual antihypertensive therapy and monitored at Jimma University Medical Center (JUMC).`,
      criticalAlerts: criticalAllergies.length > 0
        ? `⚠️ CRITICAL ALLERGY ALERT: Patient has documented ${criticalAllergies[0].severity} allergy to '${criticalAllergies.map(a => a.allergen).join(', ')}' (${criticalAllergies[0].reaction}). Contraindicated for all Beta-lactam antibiotic therapies.`
        : 'No life-threatening allergies documented.',
      activeRegimen: `Active Pharmacotherapy: ${activeRx.map(r => `${r.medication_name} ${r.dosage} (${r.frequency})`).join('; ') || 'None active'}.`,
      labInsights: abnormalLabs.length > 0
        ? `Key Diagnostic Alerts: ${abnormalLabs.map(l => `${l.test_name}: ${l.result_value} ${l.units} [${l.interpretation}]`).join(' | ')}.`
        : 'All recent laboratory observations are within physiological limits.',
      recommendedPlan: 'Continue Amlodipine/Losartan combination. Target BP < 130/80 mmHg. Repeat HbA1c and Serum Creatinine at 3 months. Maintain counter-referral communication with primary health center.'
    };
  }

  recordAudit(
    req.headers['x-user-id'] || 'USR-DOC-01',
    user_name || 'Clinician',
    user_role || 'DOCTOR',
    facility_id || 'FAC-JUMC',
    patient.id,
    'AI_CLINICAL_SUMMARY',
    'LONGITUDINAL_AI_DIGEST',
    `Generated AI-assisted clinical summary in language: ${language}`
  );

  res.json({
    patient_id: patient.id,
    patient_name: `${patient.first_name} ${patient.father_name}`,
    npdms_id: patient.npdms_id,
    language,
    generated_at: new Date().toISOString(),
    aiModel: 'NPDMS Clinical Health Engine (Ethiopian MOH Clinical Guidelines)',
    ...summaryContent
  });
});

// -------------------------------------------------------------
// 8F. CHILD IMMUNIZATION (EPI) & VACCINATION MODULE
// -------------------------------------------------------------
app.get('/api/vaccinations', (req, res) => {
  const patientId = req.query.patient_id;
  let query = `
    SELECT v.*, f.name as facility_name, f.code as facility_code,
           p.first_name, p.father_name, p.npdms_id
    FROM vaccinations v
    JOIN facilities f ON v.facility_id = f.id
    JOIN patients p ON v.patient_id = p.id
  `;
  const params = [];
  if (patientId) {
    query += ` WHERE v.patient_id = ? `;
    params.push(patientId);
  }
  query += ` ORDER BY v.date_given DESC `;
  const list = db.prepare(query).all(...params);
  res.json(list);
});

app.get('/api/vaccinations/patient/:patientId', (req, res) => {
  const list = db.prepare(`
    SELECT v.*, f.name as facility_name, f.code as facility_code
    FROM vaccinations v
    JOIN facilities f ON v.facility_id = f.id
    WHERE v.patient_id = ?
    ORDER BY v.date_given DESC
  `).all(req.params.patientId);
  res.json(list);
});

app.post('/api/vaccinations', (req, res) => {
  const { patient_id, vaccine_name, dose_number, date_given, facility_id, administered_by, batch_number, next_due_date, user_name, user_role } = req.body;

  if (!patient_id || !vaccine_name || !dose_number) {
    return res.status(400).json({ error: 'Patient ID, vaccine name, and dose number are required.' });
  }

  const id = 'VAC-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO vaccinations (id, patient_id, vaccine_name, dose_number, date_given, facility_id, administered_by, batch_number, next_due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id, patient_id, vaccine_name, dose_number, date_given || new Date().toISOString().slice(0, 10),
    facility_id || 'FAC-JUMC', administered_by || 'Nurse Fatuma Kedir', batch_number || 'ETH-EPI-2026', next_due_date || null
  );

  recordAudit(administered_by, user_name || 'Vaccination Nurse', user_role || 'NURSE', facility_id, patient_id, 'RECORD_VACCINE', 'EPI_IMMUNIZATION', `Administered ${vaccine_name} Dose ${dose_number}`);

  res.status(201).json({ success: true, vaccination_id: id });
});

// -------------------------------------------------------------
// 8G. MATERNAL HEALTH & ANTENATAL CARE (ANC) MODULE
// -------------------------------------------------------------
app.get('/api/maternal', (req, res) => {
  const patientId = req.query.patient_id;
  let query = `
    SELECT m.*, f.name as facility_name, u.full_name as provider_name,
           p.first_name, p.father_name, p.npdms_id
    FROM maternal_records m
    JOIN facilities f ON m.facility_id = f.id
    JOIN users u ON m.provider_id = u.id
    JOIN patients p ON m.patient_id = p.id
  `;
  const params = [];
  if (patientId) {
    query += ` WHERE m.patient_id = ? `;
    params.push(patientId);
  }
  query += ` ORDER BY m.recorded_at DESC `;
  const list = db.prepare(query).all(...params);
  res.json(list);
});

app.get('/api/maternal/patient/:patientId', (req, res) => {
  const list = db.prepare(`
    SELECT m.*, f.name as facility_name, u.full_name as provider_name
    FROM maternal_records m
    JOIN facilities f ON m.facility_id = f.id
    JOIN users u ON m.provider_id = u.id
    WHERE m.patient_id = ?
    ORDER BY m.recorded_at DESC
  `).all(req.params.patientId);
  res.json(list);
});

app.post('/api/maternal', (req, res) => {
  const {
    patient_id, visit_number, gestational_age_weeks, fundal_height_cm,
    fetal_heart_rate_bpm, blood_pressure, weight_kg, tetanus_toxoid_status,
    iron_folate_given, hiv_test_result, vdrl_test_result, notes,
    facility_id, provider_id, user_name, user_role
  } = req.body;

  if (!patient_id || !visit_number || !gestational_age_weeks) {
    return res.status(400).json({ error: 'Patient ID, visit number, and gestational age are required.' });
  }

  const id = 'ANC-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO maternal_records (
      id, patient_id, visit_number, gestational_age_weeks, fundal_height_cm,
      fetal_heart_rate_bpm, blood_pressure, weight_kg, tetanus_toxoid_status,
      iron_folate_given, hiv_test_result, vdrl_test_result, notes, facility_id, provider_id, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id, patient_id, visit_number, gestational_age_weeks, fundal_height_cm || null,
    fetal_heart_rate_bpm || null, blood_pressure || '120/80', weight_kg || null,
    tetanus_toxoid_status || 'GIVEN', iron_folate_given ? 1 : 0, hiv_test_result || 'NON_REACTIVE',
    vdrl_test_result || 'NON_REACTIVE', notes || '', facility_id || 'FAC-SHENEN', provider_id || 'USR-DOC-02'
  );

  recordAudit(provider_id, user_name || 'Midwife/Clinician', user_role || 'DOCTOR', facility_id, patient_id, 'RECORD_ANC', 'MATERNAL_HEALTH', `Documented ${visit_number} at ${gestational_age_weeks} weeks GA`);

  res.status(201).json({ success: true, maternal_id: id });
});

// -------------------------------------------------------------
// 8H. SIMULATED ETHIO TELECOM SMS NOTIFICATIONS DISPATCHER
// -------------------------------------------------------------
app.get('/api/notifications', (req, res) => {
  const { patient_id } = req.query;
  let sql = `
    SELECT n.*, p.first_name, p.father_name, p.npdms_id
    FROM notifications n
    JOIN patients p ON n.patient_id = p.id
  `;
  const params = [];
  if (patient_id) {
    sql += ' WHERE n.patient_id = ?';
    params.push(patient_id);
  }
  sql += ' ORDER BY n.sent_at DESC LIMIT 50';
  const list = db.prepare(sql).all(...params);
  res.json(list);
});

app.post('/api/notifications/send', (req, res) => {
  const { patient_id, phone_number, message_type, message_text, language = 'en' } = req.body;

  if (!patient_id || !message_text) {
    return res.status(400).json({ error: 'Patient ID and message text required' });
  }

  const id = 'SMS-' + crypto.randomUUID().slice(0, 6).toUpperCase();

  db.prepare(`
    INSERT INTO notifications (id, patient_id, phone_number, message_type, message_text, language, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, 'DELIVERED', datetime('now'))
  `).run(id, patient_id, phone_number || '+251-91-000-0000', message_type || 'APPOINTMENT_REMINDER', message_text, language);

  console.log(`\n[ETHIO TELECOM SIMULATED SMS GATEWAY]`);
  console.log(`To: ${phone_number}`);
  console.log(`Text: "${message_text}"`);
  console.log(`Status: 200 OK Delivered via Ethio Telecom Shortcode 8282\n`);

  res.status(201).json({ success: true, notification_id: id, status: 'DELIVERED' });
});

// -------------------------------------------------------------
// 8I. OFFLINE BATCH SYNCHRONIZATION API
// -------------------------------------------------------------
app.post('/api/sync/batch', (req, res) => {
  const { items, facility_id, user_id, user_name } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No offline items provided for synchronization' });
  }

  const syncedResults = [];

  for (const item of items) {
    if (item.type === 'ENCOUNTER') {
      const encId = 'ENC-OFFLINE-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      db.prepare(`
        INSERT INTO encounters (
          id, patient_id, facility_id, provider_id, encounter_type, chief_complaint,
          vitals_json, soap_notes_json, status, started_at, ended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, datetime('now'))
      `).run(
        encId, item.patient_id, facility_id || 'FAC-JUMC', user_id || 'USR-DOC-01',
        item.encounter_type || 'OUTPATIENT', item.chief_complaint || 'Offline captured consultation',
        item.vitals ? JSON.stringify(item.vitals) : null,
        item.soap_notes ? JSON.stringify(item.soap_notes) : null,
        item.created_at || new Date().toISOString()
      );
      syncedResults.push({ id: encId, status: 'SYNCED', type: 'ENCOUNTER' });
    }
  }

  recordAudit(
    user_id,
    user_name || 'Field Clinician',
    'DOCTOR',
    facility_id,
    null,
    'BATCH_SYNC',
    'OFFLINE_QUEUE',
    `Successfully synchronized ${items.length} records captured in offline mode.`
  );

  res.json({
    success: true,
    message: `Batch sync complete: ${items.length} records successfully written to national database.`,
    synced: syncedResults
  });
});

// -------------------------------------------------------------
// 9. EMERGENCY "BREAK-GLASS" PROTOCOL
// -------------------------------------------------------------
app.post('/api/emergency/break-glass', (req, res) => {
  const { patient_id, justification, user_id, user_name, user_role, facility_id } = req.body;

  if (!patient_id || !justification) {
    return res.status(400).json({ error: 'Patient ID and mandatory clinical justification are required for Break-Glass access.' });
  }

  // Emergency Audit Log Entry with high visibility
  recordAudit(
    user_id || 'USR-DOC-01',
    user_name || 'Emergency Physician',
    user_role || 'DOCTOR',
    facility_id || 'FAC-JUMC',
    patient_id,
    'BREAK_GLASS',
    'EMERGENCY_OVERRIDE',
    `[BREAK-GLASS EMERGENCY OVERRIDE] Justification: ${justification}`
  );

  // Return full emergency clinical summary
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id);
  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ? AND status = 'ACTIVE'").all(patient_id);
  const activeMeds = db.prepare("SELECT * FROM prescriptions WHERE patient_id = ? AND status = 'ACTIVE'").all(patient_id);
  const recentEncounters = db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY started_at DESC LIMIT 3').all(patient_id);

  res.json({
    status: 'AUTHORIZED_BREAK_GLASS',
    warning: 'EMERGENCY OVERRIDE GRANTED. All actions are strictly logged for hospital governance review.',
    patient,
    allergies,
    activeMeds,
    recentEncounters
  });
});

// -------------------------------------------------------------
// 10. AUDIT TRAIL & GOVERNANCE EXPLORER
// -------------------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  const { patient_id, limit = 50 } = req.query;
  let sql = `
    SELECT a.*, f.name as facility_name
    FROM audit_logs a
    LEFT JOIN facilities f ON a.facility_id = f.id
  `;
  const params = [];

  if (patient_id) {
    sql += ' WHERE a.patient_id = ?';
    params.push(patient_id);
  }

  sql += ` ORDER BY a.created_at DESC LIMIT ?`;
  params.push(parseInt(limit, 10));

  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

// -------------------------------------------------------------
// 11. HL7 FHIR R4 INTEROPERABILITY ADAPTER
// -------------------------------------------------------------
app.get('/api/fhir/Patient/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ? OR npdms_id = ?').get(req.params.id, req.params.id);

  if (!patient) {
    return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }] });
  }

  // Map to HL7 FHIR R4 Patient Resource
  const fhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [
      {
        use: 'official',
        system: 'https://health.gov.et/npdms/patient-id',
        value: patient.npdms_id
      },
      patient.fayda_fin ? {
        use: 'official',
        system: 'https://fayda.et/identity/fin',
        value: patient.fayda_fin
      } : null
    ].filter(Boolean),
    active: true,
    name: [
      {
        use: 'official',
        family: `${patient.father_name} ${patient.grandfather_name || ''}`.trim(),
        given: [patient.first_name]
      },
      patient.first_name_amharic ? {
        use: 'official',
        text: `${patient.first_name_amharic} ${patient.father_name_amharic || ''}`.trim()
      } : null
    ].filter(Boolean),
    telecom: patient.phone_number ? [
      { system: 'phone', value: patient.phone_number, use: 'mobile' }
    ] : [],
    gender: patient.gender.toLowerCase(),
    birthDate: patient.date_of_birth,
    address: [
      {
        use: 'home',
        state: patient.region,
        district: patient.zone_woreda,
        line: [patient.kebele ? `Kebele ${patient.kebele}` : null, patient.house_number ? `H.No ${patient.house_number}` : null].filter(Boolean),
        country: 'ETH'
      }
    ]
  };

  recordAudit(req.headers['x-user-id'] || 'USR-INT-01', 'HIE FHIR Client', 'SYSTEM_ADMIN', 'FAC-JUMC', patient.id, 'EXPORT_FHIR', 'FHIR_PATIENT', 'HL7 FHIR R4 Patient exchange query');

  res.setHeader('Content-Type', 'application/fhir+json');
  res.json(fhirPatient);
});

// FHIR R4 Complete Patient Record Bundle
app.get('/api/fhir/Bundle/:patientId', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ? OR npdms_id = ?').get(req.params.patientId, req.params.patientId);
  if (!patient) {
    return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });
  }

  const encounters = db.prepare('SELECT * FROM encounters WHERE patient_id = ?').all(patient.id);
  const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE patient_id = ?').all(patient.id);
  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ?').all(patient.id);
  const prescriptions = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ?').all(patient.id);

  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [{ system: 'https://health.gov.et/npdms/patient-id', value: patient.npdms_id }],
          name: [{ family: patient.father_name, given: [patient.first_name] }],
          birthDate: patient.date_of_birth,
          gender: patient.gender.toLowerCase()
        }
      },
      ...allergies.map(a => ({
        resource: {
          resourceType: 'AllergyIntolerance',
          id: a.id,
          clinicalStatus: { coding: [{ code: 'active' }] },
          criticality: a.severity === 'LIFE_THREATENING' ? 'high' : 'low',
          code: { text: a.allergen },
          reaction: [{ manifestion: [{ text: a.reaction }] }]
        }
      })),
      ...diagnoses.map(d => ({
        resource: {
          resourceType: 'Condition',
          id: d.id,
          clinicalStatus: { coding: [{ code: 'active' }] },
          code: {
            coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: d.icd10_code, display: d.condition_name }],
            text: d.condition_name
          }
        }
      })),
      ...prescriptions.map(p => ({
        resource: {
          resourceType: 'MedicationRequest',
          id: p.id,
          status: p.status === 'ACTIVE' ? 'active' : 'completed',
          medicationCodeableConcept: { text: p.medication_name },
          dosageInstruction: [{ text: `${p.dosage}, ${p.frequency} for ${p.duration}` }]
        }
      }))
    ]
  };

  res.setHeader('Content-Type', 'application/fhir+json');
  res.json(bundle);
});

// -------------------------------------------------------------
// 12. OPERATIONAL ANALYTICS & HOSPITAL DASHBOARD
// -------------------------------------------------------------
app.get('/api/analytics/dashboard', (req, res) => {
  const patientTotal = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
  const faydaVerified = db.prepare("SELECT COUNT(*) as count FROM patients WHERE fayda_status = 'VERIFIED'").get().count;
  const encounterTotal = db.prepare('SELECT COUNT(*) as count FROM encounters').get().count;
  const referralTotal = db.prepare('SELECT COUNT(*) as count FROM referrals').get().count;
  const pendingLabs = db.prepare("SELECT COUNT(*) as count FROM lab_investigations WHERE status = 'ORDERED'").get().count;
  const activeRx = db.prepare("SELECT COUNT(*) as count FROM prescriptions WHERE status = 'ACTIVE'").get().count;
  const pendingDuplicates = db.prepare("SELECT COUNT(*) as count FROM duplicate_reviews WHERE status = 'PENDING_REVIEW'").get().count;
  const emergencyBreakGlassCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'BREAK_GLASS'").get().count;

  // Breakdown by facility
  const facilityBreakdown = db.prepare(`
    SELECT f.name, f.code, COUNT(e.id) as encounter_count
    FROM facilities f
    LEFT JOIN encounters e ON f.id = e.facility_id
    GROUP BY f.id
  `).all();

  res.json({
    metrics: {
      patientTotal,
      faydaVerified,
      faydaVerificationRate: patientTotal > 0 ? Math.round((faydaVerified / patientTotal) * 100) : 0,
      encounterTotal,
      referralTotal,
      pendingLabs,
      activeRx,
      pendingDuplicates,
      emergencyBreakGlassCount
    },
    facilityBreakdown
  });
});

// =============================================================
// 13. OTP AUTHORIZATION GATEWAY — Cross-Hospital Record Sharing
// =============================================================

// OTP utility: generate a random 6-digit code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Mask phone number for display: +251-91-765-4321 → +251-91-***-4321
function maskPhone(phone) {
  if (!phone) return '***';
  const parts = phone.split('-');
  if (parts.length >= 4) {
    return parts.slice(0, 2).join('-') + '-***-' + parts[parts.length - 1];
  }
  return phone.slice(0, 7) + '***' + phone.slice(-3);
}

// STEP 1: Request OTP — called when a NEW hospital wants to access an existing patient's records
// Triggers OTP generation, records the request, and simulates SMS delivery to patient
app.post('/api/otp/request', (req, res) => {
  const {
    patient_id, fayda_fin,
    requesting_facility_id, requesting_user_id, requesting_user_name,
    access_scope
  } = req.body;

  // Resolve patient by NPDMS ID, Fayda FIN, or internal ID
  let patient = null;
  if (patient_id) {
    patient = db.prepare('SELECT * FROM patients WHERE id = ? OR npdms_id = ?').get(patient_id, patient_id);
  } else if (fayda_fin) {
    patient = db.prepare('SELECT * FROM patients WHERE fayda_fin = ?').get(fayda_fin);
  }

  if (!patient) {
    return res.status(404).json({
      error: 'Patient not found in NPDMS. Please verify the Fayda FIN or NPDMS ID and ensure the patient is registered.'
    });
  }

  if (!patient.phone_number) {
    return res.status(422).json({
      error: 'Patient has no verified mobile number on record. OTP cannot be delivered. Use the Break-Glass emergency protocol or manual registration.',
      fallback: 'BREAK_GLASS_OR_MANUAL'
    });
  }

  // Check whether a pending OTP already exists for this patient from same requesting facility
  const existingPending = db.prepare(`
    SELECT * FROM otp_requests
    WHERE patient_id = ? AND requesting_facility_id = ? AND status = 'PENDING' AND expires_at > datetime('now')
  `).get(patient.id, requesting_facility_id);

  if (existingPending) {
    // Return existing pending OTP context (don't re-generate within 2 minutes)
    const timeSinceCreation = new Date() - new Date(existingPending.created_at);
    if (timeSinceCreation < 2 * 60 * 1000) {
      return res.json({
        status: 'PENDING',
        otp_request_id: existingPending.id,
        message: 'An OTP was already sent to this patient. Please wait for them to provide the code.',
        phone_sent_to: existingPending.phone_number_sent_to,
        expires_at: existingPending.expires_at,
        demo_otp: existingPending.otp_code // DEMO MODE ONLY — shows OTP in response
      });
    }
  }

  // Generate new OTP
  const otpCode = generateOTP();
  const otpId = 'OTP-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  // Expiry: 5 minutes from now per security requirements (stored in UTC)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const maskedPhone = maskPhone(patient.phone_number);

  db.prepare(`
    INSERT INTO otp_requests (
      id, patient_id, requesting_facility_id, requesting_user_id, requesting_user_name,
      otp_code, otp_purpose, phone_number_sent_to, status, expires_at, patient_notified, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'CROSS_HOSPITAL_RECORD_ACCESS', ?, 'PENDING', ?, 1, datetime('now'))
  `).run(
    otpId,
    patient.id,
    requesting_facility_id,
    requesting_user_id || 'USR-REG-01',
    requesting_user_name || 'Registration Officer',
    otpCode,
    maskedPhone,
    expiresAt
  );

  // Audit this request
  recordAudit(
    requesting_user_id,
    requesting_user_name,
    'REGISTRATION_OFFICER',
    requesting_facility_id,
    patient.id,
    'OTP_REQUEST',
    'CROSS_HOSPITAL_ACCESS',
    `OTP generated for cross-hospital record sharing. Requesting facility: ${requesting_facility_id}. OTP sent to ${maskedPhone}.`
  );

  // === SIMULATED SMS DELIVERY ===
  // In production: integrate Ethiopia's Ethio Telecom SMS Gateway / Fayda Identity Platform notification service
  console.log(`\n[OTP SERVICE - SIMULATED SMS DELIVERY]`);
  console.log(`To: ${patient.phone_number} (${patient.first_name} ${patient.father_name})`);
  console.log(`Message: "NPDMS Ethiopia: Your one-time authorization code for sharing your medical records with ${requesting_user_name} at the requesting hospital is: ${otpCode}. Valid for 10 minutes. Do NOT share this code. If you did not request this, call 8282."`);
  console.log(`OTP Request ID: ${otpId}\n`);

  res.status(201).json({
    status: 'PENDING',
    otp_request_id: otpId,
    patient_name: `${patient.first_name} ${patient.father_name}`,
    npdms_id: patient.npdms_id,
    fayda_status: patient.fayda_status,
    phone_sent_to: maskedPhone,
    expires_at: expiresAt,
    message: `A 6-digit OTP has been sent to the patient's verified Fayda-linked mobile number (${maskedPhone}). Ask the patient to provide the code they received.`,
    // DEMO MODE: expose OTP in response so it can be shown in the UI sandbox
    demo_otp: otpCode,
    demo_note: 'In production, the OTP is only sent via SMS and never returned in the API response.'
  });
});

// STEP 2: Verify OTP — patient hands the code to the registration officer
// If valid: grants a time-limited access session token and creates consent record
app.post('/api/otp/verify', (req, res) => {
  const { otp_request_id, otp_code, requesting_user_id, requesting_user_name, requesting_facility_id } = req.body;

  if (!otp_request_id || !otp_code) {
    return res.status(400).json({ error: 'OTP request ID and OTP code are both required.' });
  }

  const otpRecord = db.prepare('SELECT * FROM otp_requests WHERE id = ?').get(otp_request_id);

  if (!otpRecord) {
    return res.status(404).json({ error: 'OTP request not found.' });
  }

  // Check status
  if (otpRecord.status === 'VERIFIED' || otpRecord.status === 'USED') {
    return res.status(409).json({
      error: 'This OTP has already been used. Please request a new authorization code.',
      status: otpRecord.status
    });
  }

  if (otpRecord.status === 'LOCKED') {
    return res.status(429).json({
      error: 'This OTP authorization request has been LOCKED due to too many failed attempts (3/3). Please initiate a fresh OTP request.',
      status: 'LOCKED'
    });
  }

  if (otpRecord.status === 'EXPIRED') {
    return res.status(410).json({
      error: 'This OTP has expired. Please request a new code (OTPs are valid for 5 minutes only).',
      status: 'EXPIRED'
    });
  }

  if (otpRecord.status === 'CANCELLED') {
    return res.status(410).json({ error: 'This OTP request was cancelled.', status: 'CANCELLED' });
  }

  // Check expiry (belt-and-suspenders check against current time)
  const now = new Date();
  // Parse stored UTC timestamp (stored without 'Z' suffix — append it for correct comparison)
  const expiresAt = new Date(otpRecord.expires_at.replace(' ', 'T') + 'Z');
  if (now > expiresAt) {
    db.prepare("UPDATE otp_requests SET status = 'EXPIRED' WHERE id = ?").run(otp_request_id);
    return res.status(410).json({
      error: `OTP has expired at ${otpRecord.expires_at}. Please request a fresh authorization code.`,
      status: 'EXPIRED'
    });
  }

  // Validate the OTP code
  if (otp_code.trim() !== otpRecord.otp_code) {
    const attempts = (otpRecord.failed_attempts || 0) + 1;
    if (attempts >= 3) {
      db.prepare("UPDATE otp_requests SET failed_attempts = ?, status = 'LOCKED' WHERE id = ?").run(attempts, otp_request_id);
      recordAudit(
        requesting_user_id,
        requesting_user_name,
        'REGISTRATION_OFFICER',
        requesting_facility_id,
        otpRecord.patient_id,
        'OTP_LOCKED',
        'CROSS_HOSPITAL_ACCESS',
        `OTP authorization locked after 3 consecutive failed attempts on request ${otp_request_id}. Access suspended.`
      );
      return res.status(429).json({
        error: 'Too many incorrect attempts (3/3). This OTP authorization request has been LOCKED for patient security. Please generate a new code.',
        status: 'LOCKED',
        attempts
      });
    } else {
      db.prepare("UPDATE otp_requests SET failed_attempts = ? WHERE id = ?").run(attempts, otp_request_id);
      recordAudit(
        requesting_user_id,
        requesting_user_name,
        'REGISTRATION_OFFICER',
        requesting_facility_id,
        otpRecord.patient_id,
        'OTP_FAILED',
        'CROSS_HOSPITAL_ACCESS',
        `Incorrect OTP entered for request ${otp_request_id} (Attempt ${attempts}/3).`
      );
      return res.status(401).json({
        error: `Incorrect OTP code. Attempt ${attempts} of 3. Please check the SMS and try again.`,
        status: 'INVALID',
        attempts_remaining: 3 - attempts
      });
    }
  }

  // OTP is VALID → generate a 60-minute session access token
  const sessionToken = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  // Mark OTP as verified and store the session token
  db.prepare(`
    UPDATE otp_requests
    SET status = 'VERIFIED', verified_at = datetime('now'),
        access_session_token = ?, session_expires_at = ?
    WHERE id = ?
  `).run(sessionToken, sessionExpiresAt, otp_request_id);

  // Create consent record
  const consentId = 'CONSENT-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const accessScope = JSON.stringify([
    'DEMOGRAPHICS', 'ALLERGIES', 'DIAGNOSES', 'PRESCRIPTIONS',
    'LAB_RESULTS', 'PROCEDURES', 'ENCOUNTER_NOTES', 'REFERRALS', 'DISCHARGE_SUMMARIES'
  ]);

  db.prepare(`
    INSERT INTO record_access_consents (
      id, otp_request_id, patient_id, authorized_facility_id, authorized_user_id,
      access_scope, granted_at, expires_at, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, 1)
  `).run(
    consentId,
    otp_request_id,
    otpRecord.patient_id,
    requesting_facility_id,
    requesting_user_id || otpRecord.requesting_user_id,
    accessScope,
    sessionExpiresAt
  );

  // Audit the successful authorization
  recordAudit(
    requesting_user_id || otpRecord.requesting_user_id,
    requesting_user_name || otpRecord.requesting_user_name,
    'REGISTRATION_OFFICER',
    requesting_facility_id,
    otpRecord.patient_id,
    'OTP_VERIFIED',
    'CROSS_HOSPITAL_ACCESS',
    `Patient authorized cross-hospital record sharing. Session token issued. Session valid until ${sessionExpiresAt}. Consent ID: ${consentId}.`
  );

  // Retrieve full patient record now that consent is granted
  const patient = db.prepare(`
    SELECT p.*, f.name as registered_facility_name
    FROM patients p LEFT JOIN facilities f ON p.created_facility_id = f.id
    WHERE p.id = ?
  `).get(otpRecord.patient_id);

  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ? AND status = 'ACTIVE'").all(otpRecord.patient_id);
  const activeMeds = db.prepare("SELECT * FROM prescriptions WHERE patient_id = ? AND status = 'ACTIVE'").all(otpRecord.patient_id);
  const encounters = db.prepare(`
    SELECT e.*, f.name as facility_name, f.code as facility_code, u.full_name as provider_name
    FROM encounters e
    JOIN facilities f ON e.facility_id = f.id
    JOIN users u ON e.provider_id = u.id
    WHERE e.patient_id = ?
    ORDER BY e.started_at DESC
  `).all(otpRecord.patient_id);

  const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE patient_id = ? ORDER BY recorded_at DESC').all(otpRecord.patient_id);
  const labs = db.prepare("SELECT * FROM lab_investigations WHERE patient_id = ? AND status = 'COMPLETED' ORDER BY completed_at DESC").all(otpRecord.patient_id);
  const procedures = db.prepare('SELECT * FROM procedures WHERE patient_id = ? ORDER BY performed_at DESC').all(otpRecord.patient_id);
  const referrals = db.prepare('SELECT * FROM referrals WHERE patient_id = ? ORDER BY created_at DESC').all(otpRecord.patient_id);

  // Parse JSON fields
  const enrichedEncounters = encounters.map(enc => {
    let vitals = null;
    let soapNotes = null;
    try { vitals = enc.vitals_json ? JSON.parse(enc.vitals_json) : null; } catch (e) {}
    try { soapNotes = enc.soap_notes_json ? JSON.parse(enc.soap_notes_json) : null; } catch (e) {}
    return { ...enc, vitals, soapNotes };
  });

  res.json({
    authorization: {
      status: 'AUTHORIZED',
      consent_id: consentId,
      session_token: sessionToken,
      session_expires_at: sessionExpiresAt,
      access_scope: JSON.parse(accessScope),
      message: 'Patient has successfully authorized access to their medical records. Access session is valid for 60 minutes.'
    },
    patient: {
      ...patient,
      allergies,
      activeMedications: activeMeds
    },
    medicalRecord: {
      encounters: enrichedEncounters,
      diagnoses,
      labs,
      procedures,
      referrals
    }
  });
});

// STEP 3: Check OTP Request Status (for polling)
app.get('/api/otp/status/:otpRequestId', (req, res) => {
  const record = db.prepare('SELECT id, status, expires_at, verified_at, phone_number_sent_to, patient_id FROM otp_requests WHERE id = ?').get(req.params.otpRequestId);
  if (!record) return res.status(404).json({ error: 'OTP request not found' });
  res.json(record);
});

// STEP 4: Cancel an OTP Request (patient denies consent)
app.post('/api/otp/cancel/:otpRequestId', (req, res) => {
  const { user_id, user_name, facility_id } = req.body;
  const record = db.prepare('SELECT * FROM otp_requests WHERE id = ?').get(req.params.otpRequestId);

  if (!record) return res.status(404).json({ error: 'OTP request not found' });

  db.prepare("UPDATE otp_requests SET status = 'CANCELLED' WHERE id = ?").run(req.params.otpRequestId);

  recordAudit(
    user_id,
    user_name,
    'REGISTRATION_OFFICER',
    facility_id,
    record.patient_id,
    'OTP_CANCELLED',
    'CROSS_HOSPITAL_ACCESS',
    'Patient denied consent or officer cancelled the cross-hospital record sharing request.'
  );

  res.json({ success: true, message: 'OTP request cancelled. Patient consent not granted.' });
});

// STEP 5: List all OTP requests (for Audit / Administrative oversight)
app.get('/api/otp/history', (req, res) => {
  const { patient_id, limit = 50 } = req.query;
  let sql = `
    SELECT o.*,
      p.first_name, p.father_name, p.npdms_id,
      f.name as requesting_facility_name, f.code as requesting_facility_code
    FROM otp_requests o
    JOIN patients p ON o.patient_id = p.id
    JOIN facilities f ON o.requesting_facility_id = f.id
  `;
  const params = [];

  if (patient_id) {
    sql += ' WHERE o.patient_id = ?';
    params.push(patient_id);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const records = db.prepare(sql).all(...params);
  res.json(records);
});

// STEP 6: Validate a session token (middleware-style check for protected record access)
app.get('/api/otp/validate-session', (req, res) => {
  const { token, patient_id } = req.query;
  if (!token) return res.status(400).json({ valid: false, error: 'Session token required' });

  const session = db.prepare(`
    SELECT o.*, p.first_name, p.father_name, p.npdms_id
    FROM otp_requests o
    JOIN patients p ON o.patient_id = p.id
    WHERE o.access_session_token = ?
      AND o.status = 'VERIFIED'
      AND o.session_expires_at > datetime('now')
      ${patient_id ? "AND o.patient_id = '" + patient_id + "'" : ''}
  `).get(token);

  if (!session) {
    return res.json({ valid: false, reason: 'Session expired or not found. Please re-authorize.' });
  }

  res.json({
    valid: true,
    patient_id: session.patient_id,
    patient_name: `${session.first_name} ${session.father_name}`,
    npdms_id: session.npdms_id,
    session_expires_at: session.session_expires_at,
    requesting_facility: session.requesting_facility_id
  });
});

// =============================================================
// API HEALTH & DOCUMENTATION ROOT
// =============================================================
app.get('/api/routes', (req, res) => {
  res.json({
    service: 'Ethiopian NPDMS Backend API',
    version: '1.0.0-MVP',
    modules: {
      health: 'GET /api/health',
      facilities: 'GET /api/facilities',
      patients: 'GET /api/patients | POST /api/patients | GET /api/patients/:id',
      fayda: 'POST /api/fayda/lookup | POST /api/fayda/link/:patientId',
      otp: {
        step1_request: 'POST /api/otp/request',
        step2_verify: 'POST /api/otp/verify',
        step3_status: 'GET /api/otp/status/:id',
        step4_cancel: 'POST /api/otp/cancel/:id',
        history: 'GET /api/otp/history',
        validate_session: 'GET /api/otp/validate-session'
      },
      encounters: 'GET /api/encounters/patient/:id | POST /api/encounters',
      allergies: 'POST /api/allergies',
      prescriptions: 'GET /api/prescriptions/patient/:id | POST /api/prescriptions/safety-check | POST /api/prescriptions/:id/dispense',
      pharmacy: 'GET /api/pharmacy/queue',
      labs: 'GET /api/labs/queue | POST /api/labs/:id/publish',
      referrals: 'GET /api/referrals | POST /api/referrals | POST /api/referrals/:id/respond',
      emergency: 'POST /api/emergency/break-glass',
      duplicates: 'GET /api/duplicates | POST /api/duplicates/resolve',
      audit: 'GET /api/audit-logs',
      fhir: 'GET /api/fhir/Patient/:id | GET /api/fhir/Bundle/:id',
      analytics: 'GET /api/analytics/dashboard'
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Ethiopian National Patient Data Management System (NPDMS)`);
  console.log(` Backend Service running on port ${PORT}`);
  console.log(` HL7 FHIR R4 Ready | Fayda Mock Service Active`);
  console.log(` OTP Cross-Hospital Authorization Gateway ENABLED`);
  console.log(`=======================================================`);
});
