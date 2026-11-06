// frontend/src/components/AdmissionsModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Building2, User, Clock, CheckCircle2, AlertTriangle, PlusCircle,
  Search, ArrowRight, Bed, LogOut, FileText, X
} from 'lucide-react';

export default function AdmissionsModule({
  currentFacility, currentUser, patients, t
}) {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Admit Form State
  const [patientId, setPatientId] = useState('');
  const [wardName, setWardName] = useState('Medical Ward 1');
  const [bedNumber, setBedNumber] = useState('Bed 01');
  const [admissionReason, setAdmissionReason] = useState('');
  const [submittingAdmit, setSubmittingAdmit] = useState(false);

  // Discharge Form State
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [postDischargeInstructions, setPostDischargeInstructions] = useState('');
  const [conditionOnDischarge, setConditionOnDischarge] = useState('IMPROVED');
  const [submittingDischarge, setSubmittingDischarge] = useState(false);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admissions');
      const data = await res.json();
      setAdmissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [currentFacility]);

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !admissionReason) return;

    setSubmittingAdmit(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          facility_id: currentFacility?.id || 'FAC-JUMC',
          admitting_doctor_id: currentUser?.id || 'USR-DOC-01',
          ward_name: wardName,
          bed_number: bedNumber,
          admission_reason: admissionReason,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role
        })
      });

      if (res.ok) {
        setShowAdmitModal(false);
        setAdmissionReason('');
        await fetchAdmissions();
      }
    } catch (err) {
      alert('Error admitting patient: ' + err.message);
    } finally {
      setSubmittingAdmit(false);
    }
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    setSubmittingDischarge(true);
    try {
      const res = await fetch(`/api/admissions/${selectedAdmission.id}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discharge_summary: dischargeSummary,
          post_discharge_instructions: postDischargeInstructions,
          condition_on_discharge: conditionOnDischarge,
          user_id: currentUser?.id,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role,
          facility_id: currentFacility?.id
        })
      });

      if (res.ok) {
        setShowDischargeModal(false);
        setSelectedAdmission(null);
        setDischargeSummary('');
        setPostDischargeInstructions('');
        await fetchAdmissions();
      }
    } catch (err) {
      alert('Error discharging patient: ' + err.message);
    } finally {
      setSubmittingDischarge(false);
    }
  };

  const filtered = admissions.filter(a => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Inpatient Admissions & Discharge Management
          </h2>
          <p className="text-xs text-slate-500">
            Track inpatient bed allocation, clinical progress in hospital wards, and comprehensive discharge summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ADMITTED')}
              className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'ADMITTED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'}`}
            >
              Currently Admitted
            </button>
            <button
              onClick={() => setStatusFilter('DISCHARGED')}
              className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'DISCHARGED' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600'}`}
            >
              Discharged
            </button>
          </div>

          <button
            onClick={() => {
              if (patients.length > 0) setPatientId(patients[0].id);
              setShowAdmitModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            Admit Patient
          </button>
        </div>
      </div>

      {/* Admissions List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading inpatient admissions...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          No admission records matching filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(adm => {
            const isAdmitted = adm.status === 'ADMITTED';

            return (
              <div key={adm.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{adm.first_name} {adm.father_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isAdmitted ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                        {adm.status}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-sky-700">
                      {adm.npdms_id}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold">
                    {adm.ward_name} · {adm.bed_number}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Reason</span>
                  <p className="text-slate-800 font-semibold">{adm.admission_reason}</p>
                </div>

                <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1">
                  <span>Admitted: {adm.admitted_at}</span>
                  <span>Doctor: {adm.doctor_name}</span>
                </div>

                {/* Discharge info if already discharged */}
                {adm.discharge_summary && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-700 font-bold">
                      <span>Discharge Summary</span>
                      <span className="text-emerald-700 font-semibold">Condition: {adm.condition_on_discharge}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{adm.discharge_summary}</p>
                    {adm.post_discharge_instructions && (
                      <p className="text-sky-800 text-[11px] font-medium pt-1 border-t border-slate-200">
                        Instructions: {adm.post_discharge_instructions}
                      </p>
                    )}
                  </div>
                )}

                {/* Discharge action button if still admitted */}
                {isAdmitted && (
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedAdmission(adm);
                        setShowDischargeModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Discharge & Write Summary
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIT PATIENT MODAL */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Admit Patient to Inpatient Ward</h3>

            <form onSubmit={handleAdmitSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Patient *</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.father_name} ({p.npdms_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Ward Name</label>
                  <select
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Medical Ward 1">Medical Ward 1</option>
                    <option value="Medical Ward 2">Medical Ward 2</option>
                    <option value="Surgical Ward A">Surgical Ward A</option>
                    <option value="Orthopedic Ward B">Orthopedic Ward B</option>
                    <option value="Pediatric Ward">Pediatric Ward</option>
                    <option value="Maternity / Delivery Ward">Maternity / Delivery Ward</option>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    placeholder="e.g. Bed 04, ICU-02"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Admission Indication / Reason *</label>
                <textarea
                  rows="3"
                  required
                  value={admissionReason}
                  onChange={(e) => setAdmissionReason(e.target.value)}
                  placeholder="Primary clinical reasons requiring inpatient observation, IV medications, or surgical care..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submittingAdmit ? 'Admitting...' : 'Admit Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCHARGE PATIENT MODAL */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">
              Discharge Patient: {selectedAdmission.first_name} {selectedAdmission.father_name}
            </h3>
            <p className="text-slate-500">
              {selectedAdmission.ward_name} · {selectedAdmission.bed_number} · Admitted on {selectedAdmission.admitted_at}
            </p>

            <form onSubmit={handleDischargeSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Condition on Discharge</label>
                <select
                  value={conditionOnDischarge}
                  onChange={(e) => setConditionOnDischarge(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="RECOVERED">RECOVERED</option>
                  <option value="IMPROVED">IMPROVED / STABILIZED</option>
                  <option value="UNCHANGED">UNCHANGED</option>
                  <option value="TRANSFERRED">TRANSFERRED TO SPECIALIZED CENTER</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Discharge Summary & Hospital Course *</label>
                <textarea
                  rows="3"
                  required
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  placeholder="Summarize hospital course, treatments given, clinical improvements, and final discharge status..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Post-Discharge Instructions & Medication Plan *</label>
                <textarea
                  rows="3"
                  required
                  value={postDischargeInstructions}
                  onChange={(e) => setPostDischargeInstructions(e.target.value)}
                  placeholder="Medications to continue, wound care, red flag warning symptoms, follow-up appointment date..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDischarge}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submittingDischarge ? 'Discharging...' : 'Finalize Discharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
