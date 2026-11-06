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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Ethiopian National Patient Data Management System (NPDMS)`);
  console.log(` Backend Service running on port ${PORT}`);
  console.log(` HL7 FHIR R4 Ready | Fayda Mock Service Active`);
  console.log(`=======================================================`);
});
