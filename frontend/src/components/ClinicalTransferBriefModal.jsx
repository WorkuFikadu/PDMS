// frontend/src/components/ClinicalTransferBriefModal.jsx
import React from 'react';
import {
  Printer, Download, Building2, Stethoscope, AlertOctagon,
  Pill, FileText, X, CheckCircle2
} from 'lucide-react';

export default function ClinicalTransferBriefModal({
  patient, encounters, currentFacility, currentUser, onClose
}) {
  if (!patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const latestEnc = encounters && encounters.length > 0 ? encounters[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 text-xs animate-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Official Inter-Hospital Clinical Transfer & Referral Brief
            </h3>
            <p className="text-slate-500 text-xs">Printable clinical documentation for hospital ambulance transport and referral continuity</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="p-8 bg-white border-2 border-slate-300 rounded-xl space-y-6 text-slate-800 font-sans print:border-none print:p-0">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</span>
              </div>
              <h4 className="font-bold text-sm text-slate-700 uppercase">Ministry of Health · National Patient Data Management System</h4>
              <p className="text-xs text-slate-500 font-medium">Inter-Hospital Medical Record & Transfer Certificate</p>
            </div>
            <div className="text-right font-mono text-xs space-y-0.5">
              <div className="font-bold text-slate-900">NPDMS ID: {patient.npdms_id}</div>
              <div className="text-slate-600">Fayda FIN: {patient.fayda_fin || 'PROVISIONAL'}</div>
              <div className="text-slate-400">Date: {new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>

          {/* Section 1: Patient Demographics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
              <strong className="text-sm">{patient.first_name} {patient.father_name} {patient.grandfather_name || ''}</strong>
              {patient.first_name_amharic && <span className="block text-slate-500 text-[11px] font-semibold">{patient.first_name_amharic} {patient.father_name_amharic}</span>}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">DOB / Age / Sex</span>
              <strong className="text-slate-800">{patient.date_of_birth} ({patient.gender})</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
              <strong className="text-rose-700 text-sm">{patient.blood_type || 'Unknown'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
              <span className="text-slate-700 font-semibold">{patient.emergency_contact_name} ({patient.emergency_contact_phone})</span>
            </div>
          </div>

          {/* Section 2: Critical Documented Allergies */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-lg text-rose-950 font-semibold space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                CONTRAINDICATIONS & LIFE-THREATENING ALLERGIES
              </span>
              <div className="text-xs">
                {patient.allergies.map((a, i) => (
                  <span key={i} className="mr-3">
                    • <strong>{a.allergen}</strong>: {a.reaction} [{a.severity}]
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Transfer & Origin Facility */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Referring Facility</span>
              <p className="font-bold text-slate-800">{currentFacility?.name} ({currentFacility?.code})</p>
              <p className="text-slate-500 text-[11px]">Region: {currentFacility?.region} · Attending: {currentUser?.full_name}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Receiving Center</span>
              <p className="font-bold text-sky-800">Jimma Medical Center (JMC)</p>
              <p className="text-slate-500 text-[11px]">Specialized Referral Hospital · Oromia, Jimma</p>
            </div>
          </div>

          {/* Section 4: Latest Clinical Findings & Vitals */}
          {latestEnc && (
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1">
                Clinical Course & Recent Findings
              </h5>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Chief Complaint & History:</span>
                  <p className="font-semibold text-slate-900">"{latestEnc.chief_complaint}"</p>
                </div>
                {latestEnc.vitals && (
                  <div className="flex gap-4 text-[11px] font-mono pt-1 border-t border-slate-200">
                    <span>BP: <strong>{latestEnc.vitals.bp || '--'}</strong></span>
                    <span>Pulse: <strong>{latestEnc.vitals.pulse || '--'} bpm</strong></span>
                    <span>Temp: <strong>{latestEnc.vitals.temp || '--'} °C</strong></span>
                    <span>SpO2: <strong>{latestEnc.vitals.spo2 || '--'}%</strong></span>
                  </div>
                )}
                {latestEnc.soapNotes?.plan && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Treatment Plan / Interventions:</span>
                    <p className="text-slate-700">{latestEnc.soapNotes.plan}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Current Active Medications */}
          {patient.activeMedications && patient.activeMedications.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1">
                Active Medications to Continue
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {patient.activeMedications.map((rx, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <strong className="text-slate-900 block">{rx.medication_name}</strong>
                    <span className="text-slate-600 text-[11px]">{rx.dosage} · {rx.frequency} ({rx.duration})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature & Verification Seal Box */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-900 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Transferring Medical Officer</span>
              <p className="font-bold text-slate-900 mt-1">{currentUser?.full_name}</p>
              <p className="text-slate-500">{currentUser?.professional_id || 'ETH-MED-LICENSED'}</p>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
              <span className="text-[10px] text-slate-400 block mt-1">Official Signature & Date</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Receiving Facility Acceptance</span>
              <p className="font-bold text-slate-900 mt-1">Accepting Clinician Signature</p>
              <p className="text-slate-500">Bed / Department Allocated: ____________</p>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
              <span className="text-[10px] text-slate-400 block mt-1">Official Hospital Stamp / Seal</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Transfer Brief
          </button>
        </div>
      </div>
    </div>
  );
}
