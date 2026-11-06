// frontend/src/components/SurgeryModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Hospital, Scissors, Activity, User, Building2, Clock, CheckCircle2,
  AlertTriangle, PlusCircle, Search, ShieldCheck, Heart, FileText, X
} from 'lucide-react';

export default function SurgeryModule({
  currentFacility, currentUser, patients, t
}) {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');

  // Form State for new operation
  const [patientId, setPatientId] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [indication, setIndication] = useState('');
  const [surgicalTeam, setSurgicalTeam] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState('GENERAL');
  const [operativeNotes, setOperativeNotes] = useState('');
  const [outcome, setOutcome] = useState('SUCCESSFUL');
  const [complications, setComplications] = useState('None reported');
  const [postOpTreatment, setPostOpTreatment] = useState('');
  const [recoveryProgress, setRecoveryProgress] = useState('Stable recovery in PACU/Ward');
  const [futureRecommendations, setFutureRecommendations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procedures');
      const data = await res.json();
      setProcedures(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, [currentFacility]);

  const handleCreateProcedure = async (e) => {
    e.preventDefault();
    if (!patientId || !procedureName || !indication) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          facility_id: currentFacility?.id || 'FAC-JUMC',
          surgeon_id: currentUser?.id || 'USR-DOC-01',
          procedure_name: procedureName,
          indication,
          surgical_team: surgicalTeam || `${currentUser?.full_name} (Lead Surgeon)`,
          anesthesia_type: anesthesiaType,
          operative_notes: operativeNotes,
          outcome,
          complications,
          post_op_treatment: postOpTreatment,
          recovery_progress: recoveryProgress,
          future_recommendations: futureRecommendations,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role
        })
      });

      if (res.ok) {
        setShowNewModal(false);
        setProcedureName('');
        setIndication('');
        setOperativeNotes('');
        setPostOpTreatment('');
        setFutureRecommendations('');
        await fetchProcedures();
      }
    } catch (err) {
      alert('Error registering procedure: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = procedures.filter(p =>
    p.procedure_name?.toLowerCase().includes(filterPatient.toLowerCase()) ||
    p.first_name?.toLowerCase().includes(filterPatient.toLowerCase()) ||
    p.npdms_id?.toLowerCase().includes(filterPatient.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Hospital className="w-5 h-5 text-sky-600" />
            Operation & Surgery Management
          </h2>
          <p className="text-xs text-slate-500">
            Surgical records, operative reports, anesthesia protocols, recovery progress, and cross-hospital procedural history.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search surgery or patient..."
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => {
              if (patients.length > 0) setPatientId(patients[0].id);
              setShowNewModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Record Surgery
          </button>
        </div>
      </div>

      {/* Procedures Cards List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading surgical histories...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          No surgical records on file.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((proc) => (
            <div key={proc.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-sky-300 transition">
              {/* Top row: Hospital, Date, Patient, Outcome */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">{proc.procedure_name}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${proc.outcome === 'SUCCESSFUL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {proc.outcome}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 font-bold text-sky-800">
                      <Building2 className="w-3.5 h-3.5" />
                      {proc.facility_name} ({proc.facility_code})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Surgeon: {proc.surgeon_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {proc.performed_at}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-900 text-sm block">
                    {proc.first_name} {proc.father_name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-sky-700">
                    {proc.npdms_id}
                  </span>
                </div>
              </div>

              {/* Surgical Team & Anesthesia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Surgical Team</span>
                  <p className="font-medium text-slate-800">{proc.surgical_team || 'Standard Surgical Staff'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Anesthesia Type</span>
                  <p className="font-bold text-indigo-700">{proc.anesthesia_type}</p>
                </div>
              </div>

              {/* Indication & Operative Notes */}
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Clinical Indication</span>
                  <p className="text-slate-800 font-semibold">{proc.indication}</p>
                </div>

                {proc.operative_notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Operative Report</span>
                    <p className="text-slate-700 leading-relaxed text-xs">{proc.operative_notes}</p>
                  </div>
                )}
              </div>

              {/* Recovery & Post-Op Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Complications</span>
                  <p className="font-semibold text-slate-700">{proc.complications || 'None'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Post-Op Care & Regimen</span>
                  <p className="font-medium text-slate-700">{proc.post_op_treatment || 'Standard post-op protocols'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase block">Future Recommendations</span>
                  <p className="font-medium text-sky-900">{proc.future_recommendations || 'Routine outpatient follow-up'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECORD OPERATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Hospital className="w-5 h-5 text-sky-600" />
                Document Surgical Operation
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProcedure} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Procedure Name *</label>
                  <input
                    type="text"
                    required
                    value={procedureName}
                    onChange={(e) => setProcedureName(e.target.value)}
                    placeholder="e.g. Open Appendectomy, Cholecystectomy, ORIF Tibia"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Anesthesia Type</label>
                  <select
                    value={anesthesiaType}
                    onChange={(e) => setAnesthesiaType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="GENERAL">General Anesthesia</option>
                    <option value="SPINAL">Spinal / Epidural</option>
                    <option value="LOCAL">Local Infiltration</option>
                    <option value="SEDATION">IV Conscious Sedation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Surgical Indication *</label>
                <input
                  type="text"
                  required
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g. Acute appendicitis with localized peritonitis"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Surgical Team & Assistants</label>
                  <input
                    type="text"
                    value={surgicalTeam}
                    onChange={(e) => setSurgicalTeam(e.target.value)}
                    placeholder="e.g. Dr. Abebe Tadesse (Lead), Sr. Fatuma (Scrub)"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="SUCCESSFUL">SUCCESSFUL</option>
                    <option value="PARTIAL">PARTIAL RESECTION / PALLIATIVE</option>
                    <option value="COMPLICATED">COMPLICATIONS ENCOUNTERED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Operative Report & Findings</label>
                <textarea
                  rows="3"
                  value={operativeNotes}
                  onChange={(e) => setOperativeNotes(e.target.value)}
                  placeholder="Detailed surgical steps, incisions, anatomy visualized, specimens resected, hemostasis achieved..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Complications (if any)</label>
                  <input
                    type="text"
                    value={complications}
                    onChange={(e) => setComplications(e.target.value)}
                    placeholder="e.g. None, or 200mL blood loss"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Post-Operative Treatment / Rx</label>
                  <input
                    type="text"
                    value={postOpTreatment}
                    onChange={(e) => setPostOpTreatment(e.target.value)}
                    placeholder="e.g. IV Ceftriaxone 1g, Tramadol 50mg, wound dressing"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Future Recommendations / Follow-up Surgery</label>
                <input
                  type="text"
                  value={futureRecommendations}
                  onChange={(e) => setFutureRecommendations(e.target.value)}
                  placeholder="e.g. Suture removal in 10 days; implant hardware removal in 12 months"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Surgical Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
