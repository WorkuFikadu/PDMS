// frontend/src/components/LongitudinalEHR.jsx
import React, { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, ShieldAlert, FileText, PlusCircle,
  Building2, Calendar, User, Pill, FlaskConical, Stethoscope,
  Heart, Download, ShieldCheck, CheckCircle2, ChevronRight,
  Clock, AlertOctagon, ArrowRightCircle, Sparkles, X, QrCode, Printer
} from 'lucide-react';
import AiCopilotModal from './AiCopilotModal';
import DigitalHealthCardModal from './DigitalHealthCardModal';
import ClinicalTransferBriefModal from './ClinicalTransferBriefModal';

export default function LongitudinalEHR({
  patientId, currentFacility, currentUser, onRefresh, t
}) {
  const [patientData, setPatientData] = useState(null);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [fhirData, setFhirData] = useState(null);

  // New Encounter Form
  const [encounterType, setEncounterType] = useState('OUTPATIENT');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState({ bp: '120/80', pulse: 78, temp: 36.6, resp_rate: 16, spo2: 98, weight: 70, height: 170 });
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [dxInput, setDxInput] = useState({ icd10: 'I10', condition: 'Essential Hypertension', type: 'CONFIRMED' });
  const [rxInput, setRxInput] = useState({ medication: 'Amlodipine Besylate', dosage: '10 mg', route: 'ORAL', frequency: 'Once daily', duration: '30 days' });
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [diagnosesList, setDiagnosesList] = useState([]);
  const [treatmentRationale, setTreatmentRationale] = useState('');
  const [parentEncounterId, setParentEncounterId] = useState('');

  // Real-time Drug Safety Alerts State
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [submittingEncounter, setSubmittingEncounter] = useState(false);

  // Break-glass form
  const [breakGlassReason, setBreakGlassReason] = useState('');

  // Fetch full patient data & encounters
  const fetchPatientChart = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [resPat, resEnc] = await Promise.all([
        fetch(`/api/patients/${patientId}`, {
          headers: {
            'x-user-id': currentUser?.id || 'USR-DOC-01',
            'x-user-name': currentUser?.full_name || 'Dr. Abebe Tadesse',
            'x-user-role': currentUser?.role || 'DOCTOR',
            'x-facility-id': currentFacility?.id || 'FAC-JUMC'
          }
        }),
        fetch(`/api/encounters/patient/${patientId}`)
      ]);

      const dataPat = await resPat.json();
      const dataEnc = await resEnc.json();

      setPatientData(dataPat);
      setEncounters(dataEnc);
      if (dataEnc.length > 0) {
        setParentEncounterId(dataEnc[0].id);
      }
    } catch (err) {
      console.error('Failed to load chart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientChart();
  }, [patientId, currentUser, currentFacility]);

  // Safety Check when adding prescription
  const handleCheckAndAddPrescription = async () => {
    if (!rxInput.medication.trim()) return;

    try {
      const res = await fetch('/api/prescriptions/safety-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          medication_name: rxInput.medication
        })
      });
      const data = await res.json();

      if (!data.safe) {
        setSafetyAlerts(data.warnings);
      } else {
        setSafetyAlerts([]);
      }

      // Add to staged prescriptions list
      setPrescriptionsList([...prescriptionsList, {
        medication_name: rxInput.medication,
        dosage: rxInput.dosage,
        route: rxInput.route,
        frequency: rxInput.frequency,
        duration: rxInput.duration,
        safetyWarnings: data.warnings
      }]);

      setRxInput({ medication: '', dosage: '500 mg', route: 'ORAL', frequency: 'Once daily', duration: '30 days' });
    } catch (err) {
      console.error('Safety check failed:', err);
    }
  };

  // Submit New Encounter
  const handleSubmitEncounter = async (e) => {
    e.preventDefault();
    setSubmittingEncounter(true);

    try {
      const payload = {
        patient_id: patientId,
        facility_id: currentFacility?.id || 'FAC-JUMC',
        provider_id: currentUser?.id || 'USR-DOC-01',
        user_name: currentUser?.full_name || 'Dr. Abebe Tadesse',
        user_role: currentUser?.role || 'DOCTOR',
        encounter_type: encounterType,
        chief_complaint: chiefComplaint,
        vitals,
        soap_notes: soapNotes,
        parent_encounter_id: parentEncounterId || null,
        treatment_rationale: treatmentRationale || null,
        diagnoses: diagnosesList.length > 0 ? diagnosesList : [
          { icd10_code: dxInput.icd10, condition_name: dxInput.condition, diagnosis_type: dxInput.type }
        ],
        prescriptions: prescriptionsList,
        labs: []
      };

      const res = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEncounterModal(false);
        // Reset staging
        setChiefComplaint('');
        setPrescriptionsList([]);
        setSafetyAlerts([]);
        await fetchPatientChart();
        onRefresh();
      }
    } catch (err) {
      alert('Error submitting encounter: ' + err.message);
    } finally {
      setSubmittingEncounter(false);
    }
  };

  // Execute Break-Glass Emergency Access
  const handleBreakGlassConfirm = async () => {
    if (!breakGlassReason.trim()) {
      alert('Mandatory clinical reason is required for Break-Glass override.');
      return;
    }

    try {
      const res = await fetch('/api/emergency/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          justification: breakGlassReason,
          user_id: currentUser?.id,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role,
          facility_id: currentFacility?.id
        })
      });
      const data = await res.json();
      alert(`AUTHORIZED: ${data.warning}`);
      setShowBreakGlassModal(false);
      await fetchPatientChart();
    } catch (err) {
      alert('Break-glass failure: ' + err.message);
    }
  };

  // Fetch HL7 FHIR Bundle
  const handleExportFhir = async () => {
    try {
      const res = await fetch(`/api/fhir/Bundle/${patientId}`);
      const data = await res.json();
      setFhirData(data);
      setShowFhirModal(true);
    } catch (err) {
      alert('FHIR bundle export error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <Activity className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
        <p className="font-semibold text-sm">Loading longitudinal patient health record...</p>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p className="text-sm">Please select a patient from the registry to view their longitudinal EHR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CRITICAL ALLERGY ALERT BANNER */}
      {patientData.allergies && patientData.allergies.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl shadow-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-lg">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900 text-sm tracking-tight flex items-center gap-2">
                  {t.activeAllergyAlert}
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    High Risk
                  </span>
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {patientData.allergies.map(alg => (
                    <div
                      key={alg.id}
                      className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-rose-950 font-medium shadow-2xs"
                    >
                      <span className="font-bold text-rose-700">{alg.allergen}</span>: {alg.reaction}
                      <span className="ml-2 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800">
                        {alg.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PATIENT PROFILE BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Demographic & Identity Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {patientData.first_name} {patientData.father_name} {patientData.grandfather_name || ''}
              </h2>
              {patientData.first_name_amharic && (
                <span className="text-base text-slate-500 font-semibold">
                  ({patientData.first_name_amharic} {patientData.father_name_amharic || ''})
                </span>
              )}

              {/* Fayda Badge */}
              {patientData.fayda_status === 'VERIFIED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Fayda FIN: {patientData.fayda_fin}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  Provisional Internal ID
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
              <span className="font-mono bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200 font-bold">
                {patientData.npdms_id}
              </span>
              <span>•</span>
              <span>{patientData.gender}</span>
              <span>•</span>
              <span>DOB: {patientData.date_of_birth}</span>
              <span>•</span>
              <span>Blood Group: <strong className="text-slate-900">{patientData.blood_type || 'Unknown'}</strong></span>
              <span>•</span>
              <span>Region: {patientData.region} ({patientData.zone_woreda})</span>
            </div>

            {/* Emergency Contact */}
            {patientData.emergency_contact_name && (
              <div className="text-xs text-slate-500">
                Next of Kin: <strong className="text-slate-700">{patientData.emergency_contact_name}</strong> ({patientData.emergency_contact_relation}) - {patientData.emergency_contact_phone}
              </div>
            )}
          </div>

          {/* Action Buttons: Consult, AI Copilot, Health Card, Transfer Brief, Break-Glass, FHIR */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-xs shadow-xs transition"
              title="Generate trilingual AI longitudinal clinical summary"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={() => setShowCardModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded-xl text-xs transition"
              title="View and print National Digital Health Card with QR code"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Health Card</span>
            </button>

            <button
              onClick={() => setShowBriefModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-xl text-xs transition"
              title="Print inter-hospital transfer brief for ambulance or referral"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Transfer Brief</span>
            </button>

            <button
              onClick={() => setShowEncounterModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              {t.documentEncounter}
            </button>

            <button
              onClick={() => setShowBreakGlassModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold rounded-xl text-xs transition"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {t.breakGlassButton}
            </button>

            <button
              onClick={handleExportFhir}
              className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              <Download className="w-4 h-4" />
              {t.exportFhir}
            </button>
          </div>
        </div>

        {/* Active Medications Quick Bar */}
        {patientData.activeMedications && patientData.activeMedications.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-indigo-600" />
              {t.activeMeds}:
            </span>
            {patientData.activeMedications.map(rx => (
              <span
                key={rx.id}
                className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-medium"
              >
                {rx.medication_name} ({rx.dosage}, {rx.frequency})
                <span className="text-[10px] text-indigo-500 ml-1.5">[{rx.facility_name}]</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2B. NATIONAL FAYDA CROSS-HOSPITAL CARE TRAIL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/60 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide text-white">
                  National Cross-Hospital Care Journey
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Fayda Anchored
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Core Principle: <strong className="text-emerald-300">"Treated Everywhere in Ethiopia — Stored in One Master Record"</strong> via Fayda FIN: <span className="font-mono text-amber-300 font-bold">{patientData.fayda_fin || 'Provisional NPDMS ID'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 font-medium">
              <strong className="text-sky-400 font-bold">{[...new Set(encounters.map(e => e.facility_name))].length}</strong> Facilities Involved
            </span>
            <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 font-medium">
              <strong className="text-emerald-400 font-bold">{encounters.length}</strong> Encounters Linked
            </span>
          </div>
        </div>

        {/* Visual Hospital Pathway */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* List of distinct hospitals where patient was treated */}
          {[...new Set(encounters.map(e => e.facility_name))].map((facName, idx) => {
            const facEncounters = encounters.filter(e => e.facility_name === facName);
            const latestVisit = facEncounters[0];
            return (
              <div
                key={facName}
                className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
                    Hospital #{idx + 1}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Synchronized
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white truncate">{facName}</h4>
                  <p className="text-[11px] text-slate-400">
                    {facEncounters.length} consultation{facEncounters.length > 1 ? 's' : ''} • Last: {latestVisit.started_at?.slice(0, 10)}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2 flex items-center justify-between">
                  <span>Treating Doctor:</span>
                  <span className="text-slate-200 font-medium truncate ml-1">{latestVisit.provider_name}</span>
                </div>
              </div>
            );
          })}

          {/* Current Facility Active Integration Card */}
          <div className="bg-sky-950/40 border border-sky-600/40 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  Active Now
                </span>
                <span className="text-[10px] text-sky-300 font-bold">Current Session</span>
              </div>
              <h4 className="font-bold text-xs text-sky-200 mt-2 truncate">
                {currentFacility?.name || 'Local Hospital'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                New diagnoses, surgeries, or prescriptions recorded today will seamlessly persist into this same national Fayda record.
              </p>
            </div>
            <button
              onClick={() => setShowEncounterModal(true)}
              className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add New Treatment Here</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. LONGITUDINAL CROSS-FACILITY TIMELINE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            {t.chronologicalEncounters} ({encounters.length})
          </h3>
          <span className="text-xs text-slate-500">
            Source facilities: JUMC, Shenen Gibe, Agaro Primary Hospital, Tikur Anbessa
          </span>
        </div>

        {encounters.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No clinical encounters recorded yet. Click "Start Consultation Encounter" to document the first visit.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {encounters.map((enc) => {
              return (
                <div key={enc.id} className="relative bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-[27px] top-6 w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow-xs"></div>

                  {/* Header: Facility, Date, Provider, Encounter Type */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5" />
                          {enc.facility_name} ({enc.facility_code})
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {enc.encounter_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {enc.provider_name} ({enc.provider_role.replace('_', ' ')})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {enc.started_at}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-xs text-slate-400 font-medium">
                      {enc.id}
                    </span>
                  </div>

                  {/* Chief Complaint */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {t.chiefComplaint}
                    </span>
                    <p className="text-xs text-slate-800 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      "{enc.chief_complaint}"
                    </p>
                  </div>

                  {/* Vitals Grid */}
                  {enc.vitals && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">BP</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.bp || '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Pulse</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.pulse ? `${enc.vitals.pulse} bpm` : '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Temp</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.temp ? `${enc.vitals.temp} °C` : '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Resp</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.resp_rate ? `${enc.vitals.resp_rate} /min` : '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">SpO2</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.spo2 ? `${enc.vitals.spo2}%` : '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Weight</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.weight ? `${enc.vitals.weight} kg` : '--'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">BMI</span>
                        <span className="font-bold text-slate-800 font-mono">{enc.vitals.bmi || '--'}</span>
                      </div>
                    </div>
                  )}

                  {/* SOAP Clinical Notes */}
                  {enc.soapNotes && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-600 block text-[11px] uppercase">Subjective History</span>
                        <p className="text-slate-700 whitespace-pre-line text-xs">{enc.soapNotes.subjective}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-600 block text-[11px] uppercase">Objective Findings</span>
                        <p className="text-slate-700 whitespace-pre-line text-xs">{enc.soapNotes.objective}</p>
                      </div>
                      <div className="space-y-1 md:col-span-2 pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-600 block text-[11px] uppercase">Assessment & Plan</span>
                        <p className="text-slate-800 font-medium whitespace-pre-line text-xs">{enc.soapNotes.assessment}</p>
                        <p className="text-slate-600 whitespace-pre-line text-xs mt-1">{enc.soapNotes.plan}</p>
                      </div>
                    </div>
                  )}

                  {/* Continuity of Care Rationale */}
                  {enc.treatment_rationale && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px] uppercase">
                        <ArrowRightCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Continuity Rationale & Cross-Facility Justification:</span>
                      </div>
                      <p className="text-amber-950 font-medium">{enc.treatment_rationale}</p>
                    </div>
                  )}

                  {/* Diagnoses List */}
                  {enc.diagnoses && enc.diagnoses.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Diagnoses (ICD-10)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {enc.diagnoses.map(dx => (
                          <div
                            key={dx.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                          >
                            <span className="font-mono font-bold text-sky-700">{dx.icd10_code}</span>
                            <span>{dx.condition_name}</span>
                            <span className="text-[10px] text-slate-400">({dx.diagnosis_type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prescriptions in Encounter */}
                  {enc.prescriptions && enc.prescriptions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Prescribed Medications
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {enc.prescriptions.map(rx => (
                          <div
                            key={rx.id}
                            className="p-2.5 bg-sky-50/50 border border-sky-100 rounded-lg text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{rx.medication_name}</div>
                              <div className="text-slate-500 text-[11px]">
                                {rx.dosage} • {rx.route} • {rx.frequency} ({rx.duration})
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rx.status === 'DISPENSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                              {rx.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab Results in Encounter */}
                  {enc.labs && enc.labs.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Diagnostic Investigations
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {enc.labs.map(lab => (
                          <div
                            key={lab.id}
                            className={`p-2.5 rounded-lg border text-xs ${lab.interpretation === 'CRITICAL' ? 'bg-rose-50 border-rose-300' : lab.interpretation === 'ABNORMAL' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{lab.test_name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${lab.interpretation === 'CRITICAL' ? 'bg-rose-600 text-white' : lab.interpretation === 'ABNORMAL' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                {lab.result_value ? `${lab.result_value} ${lab.units}` : lab.status}
                              </span>
                            </div>
                            {lab.findings_notes && (
                              <p className="text-[11px] text-slate-600 mt-1">{lab.findings_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. NEW CONSULTATION ENCOUNTER MODAL */}
      {showEncounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">{t.documentEncounter}</h3>
                <p className="text-xs text-slate-400">
                  Facility: <strong>{currentFacility?.name}</strong> | Clinician: <strong>{currentUser?.full_name}</strong>
                </p>
              </div>
              <button onClick={() => setShowEncounterModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEncounter} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Encounter Type & Chief Complaint */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{t.encounterType}</label>
                  <select
                    value={encounterType}
                    onChange={(e) => setEncounterType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="OUTPATIENT">Outpatient Consultation</option>
                    <option value="REFERRAL_CONTINUATION">Referral Follow-up / Continuation</option>
                    <option value="INPATIENT">Inpatient Admission Round</option>
                    <option value="EMERGENCY">Emergency Triage</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">{t.chiefComplaint} *</label>
                  <input
                    type="text"
                    required
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Follow-up for uncontrolled hypertension, routine review..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Vitals Form */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block text-[11px] uppercase">{t.vitals}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="BP (e.g. 130/85)"
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Pulse (bpm)"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Temp (°C)"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="SpO2 (%)"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* SOAP Notes */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 block text-[11px] uppercase">SOAP Documentation</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Subjective (Symptoms & History)</label>
                    <textarea
                      rows="3"
                      value={soapNotes.subjective}
                      onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                      placeholder="Patient reports improvement with..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Objective (Physical Exam & Labs)</label>
                    <textarea
                      rows="3"
                      value={soapNotes.objective}
                      onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                      placeholder="Chest clear, heart sounds normal, no pedal edema..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Clinical Assessment & Plan</label>
                    <textarea
                      rows="2"
                      value={soapNotes.assessment}
                      onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                      placeholder="1. Essential Hypertension, well-controlled\n2. Continue lifestyle counseling..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Continuity of Care Justification (Required if continuing/changing therapy) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <label className="block font-bold text-amber-900 text-[11px] uppercase">
                  Continuity Rationale & Prior Facility Treatment Adjustment:
                </label>
                <input
                  type="text"
                  value={treatmentRationale}
                  onChange={(e) => setTreatmentRationale(e.target.value)}
                  placeholder="e.g. Dose adjusted from Agaro Primary Hospital baseline due to systolic BP >150 mmHg"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>

              {/* Medication Staging & REAL-TIME DRUG ALLERGY SAFETY CHECK */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-sky-700" />
                    Prescription & Safety Interaction Engine
                  </span>
                  <span className="text-[10px] text-sky-700">
                    Try prescribing 'Amoxicillin' or 'Penicillin' to test allergy detection!
                  </span>
                </div>

                {/* Staged Prescriptions Table */}
                {prescriptionsList.length > 0 && (
                  <div className="space-y-1">
                    {prescriptionsList.map((p, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="font-semibold text-slate-900">{p.medication_name} ({p.dosage}, {p.frequency})</span>
                        <button
                          type="button"
                          onClick={() => setPrescriptionsList(prescriptionsList.filter((_, i) => i !== idx))}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* SAFETY ALERT WARNING BOX */}
                {safetyAlerts.length > 0 && (
                  <div className="space-y-2">
                    {safetyAlerts.map((alt, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs ${alt.level === 'CRITICAL' ? 'bg-rose-100 border-rose-400 text-rose-950 font-semibold' : 'bg-amber-100 border-amber-400 text-amber-950'}`}
                      >
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0" />
                          <span>{alt.title}</span>
                        </div>
                        <p>{alt.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Medication Name"
                    value={rxInput.medication}
                    onChange={(e) => setRxInput({ ...rxInput, medication: e.target.value })}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded-md sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 10mg)"
                    value={rxInput.dosage}
                    onChange={(e) => setRxInput({ ...rxInput, dosage: e.target.value })}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleCheckAndAddPrescription}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition"
                  >
                    Check & Add
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEncounterModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submittingEncounter}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition"
                >
                  {submittingEncounter ? 'Saving...' : t.submitEncounter}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. BREAK-GLASS EMERGENCY ACCESS MODAL */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 bg-rose-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border-2 border-rose-500 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center gap-3 text-rose-700">
              <ShieldAlert className="w-8 h-8 shrink-0 animate-bounce" />
              <div>
                <h3 className="font-bold text-base text-rose-900">{t.breakGlassTitle}</h3>
                <p className="text-[11px] text-rose-600">Immediate Trauma Access Protocol</p>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed">
              {t.breakGlassDesc}
            </p>

            <div className="space-y-1">
              <label className="block font-bold text-slate-800 uppercase text-[11px]">
                {t.breakGlassJustification} *
              </label>
              <textarea
                rows="3"
                required
                value={breakGlassReason}
                onChange={(e) => setBreakGlassReason(e.target.value)}
                placeholder="e.g. Unconscious RTA trauma patient with severe head injury requiring emergency intubation and surgical intervention..."
                className="w-full p-2.5 border-2 border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBreakGlassModal(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBreakGlassConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
              >
                {t.confirmBreakGlass}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. HL7 FHIR R4 JSON BUNDLE VIEWER MODAL */}
      {showFhirModal && fhirData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 rounded-2xl max-w-3xl w-full border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  HL7 FHIR R4 JSON Bundle Export
                </h3>
                <p className="text-xs text-slate-400">Interoperable National Health Information Exchange Standard</p>
              </div>
              <button onClick={() => setShowFhirModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="flex-1 overflow-y-auto p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800">
              {JSON.stringify(fhirData, null, 2)}
            </pre>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(fhirData, null, 2));
                  alert('FHIR JSON copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
              >
                Copy JSON
              </button>
              <button
                onClick={() => setShowFhirModal(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. AI CLINICAL COPILOT MODAL */}
      {showAiModal && patientData && (
        <AiCopilotModal
          patientId={patientId}
          patientName={patientData.full_name}
          currentFacility={currentFacility}
          currentUser={currentUser}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {/* 8. DIGITAL HEALTH CARD MODAL */}
      {showCardModal && patientData && (
        <DigitalHealthCardModal
          patient={patientData}
          onClose={() => setShowCardModal(false)}
        />
      )}

      {/* 9. CLINICAL TRANSFER BRIEF MODAL */}
      {showBriefModal && patientData && (
        <ClinicalTransferBriefModal
          patient={patientData}
          encounters={encounters}
          currentFacility={currentFacility}
          currentUser={currentUser}
          onClose={() => setShowBriefModal(false)}
        />
      )}
    </div>
  );
}
