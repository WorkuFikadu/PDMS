// frontend/src/components/PatientPortal.jsx
import React, { useState, useEffect } from 'react';
import {
  FileText, Activity, Pill, FlaskConical, Calendar, ShieldCheck,
  Building2, User, Download, Heart
} from 'lucide-react';

export default function PatientPortal({
  currentUser, t
}) {
  const [patientData, setPatientData] = useState(null);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default patient Kemal Mohammed
  const targetPatientId = 'PAT-001';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/patients/${targetPatientId}`),
      fetch(`/api/encounters/patient/${targetPatientId}`)
    ])
      .then(async ([resP, resE]) => {
        const p = await resP.json();
        const e = await resE.json();
        setPatientData(p);
        setEncounters(e);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading || !patientData) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading patient portal...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Patient Welcome Card */}
      <div className="bg-gradient-to-r from-sky-700 to-indigo-800 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <span className="text-xs uppercase font-bold text-sky-200 tracking-wider">
              {t.navPatientPortal}
            </span>
            <h2 className="text-2xl font-black mt-1">
              Welcome, {patientData.first_name} {patientData.father_name}
            </h2>
            {patientData.first_name_amharic && (
              <p className="text-sky-200 text-sm font-semibold">
                እንኳን ደህና መጡ፣ {patientData.first_name_amharic} {patientData.father_name_amharic}
              </p>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-xs space-y-1">
            <div>NPDMS ID: <span className="font-mono font-bold text-sky-200">{patientData.npdms_id}</span></div>
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Fayda FIN: {patientData.fayda_fin}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-white/20">
          <div>
            <span className="text-sky-300 block text-[11px]">Date of Birth</span>
            <span className="font-bold">{patientData.date_of_birth}</span>
          </div>
          <div>
            <span className="text-sky-300 block text-[11px]">Blood Group</span>
            <span className="font-bold">{patientData.blood_type}</span>
          </div>
          <div>
            <span className="text-sky-300 block text-[11px]">Region</span>
            <span className="font-bold">{patientData.region}</span>
          </div>
          <div>
            <span className="text-sky-300 block text-[11px]">Primary Hospital</span>
            <span className="font-bold">{patientData.registered_facility_name}</span>
          </div>
        </div>
      </div>

      {/* Allergies Notice for Patient Safety */}
      {patientData.allergies && patientData.allergies.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-950 space-y-2">
          <div className="font-bold text-rose-800 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" />
            <span>Important Health Alert for Patient: Your Documented Drug Allergies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {patientData.allergies.map(a => (
              <span key={a.id} className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-bold text-rose-700">
                {a.allergen} ({a.reaction})
              </span>
            ))}
          </div>
          <p className="text-[11px] text-rose-700">
            Always inform any doctor or nurse at any hospital across Ethiopia of these allergies before receiving medication.
          </p>
        </div>
      )}

      {/* Active Medications for Patient */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Pill className="w-4 h-4 text-indigo-600" />
          My Current Active Medications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {patientData.activeMedications?.map(rx => (
            <div key={rx.id} className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
              <div className="font-bold text-slate-900">{rx.medication_name}</div>
              <div className="text-indigo-800 font-semibold">{rx.dosage} • {rx.frequency}</div>
              <div className="text-slate-500 text-[11px]">{rx.instructions}</div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-indigo-100">
                Prescribed at {rx.facility_name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Visits Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          My Cross-Facility Visit History
        </h3>

        <div className="space-y-3 text-xs">
          {encounters.map(enc => (
            <div key={enc.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{enc.facility_name}</span>
                  <span className="block text-slate-500 text-[11px]">{enc.started_at} • With {enc.provider_name}</span>
                </div>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md font-bold text-[10px]">
                  {enc.encounter_type.replace('_', ' ')}
                </span>
              </div>

              <div className="text-slate-700 font-medium">
                <strong>Visit Reason:</strong> "{enc.chief_complaint}"
              </div>

              {enc.soapNotes && (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                  <strong className="text-slate-800 block mb-0.5">Doctor's Care Instructions:</strong>
                  {enc.soapNotes.plan}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
