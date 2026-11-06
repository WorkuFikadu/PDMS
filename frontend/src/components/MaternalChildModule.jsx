// frontend/src/components/MaternalChildModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Baby, Heart, ShieldCheck, CheckCircle2, Calendar, PlusCircle,
  Activity, User, Building2, AlertCircle, Sparkles, X
} from 'lucide-react';

export default function MaternalChildModule({
  currentFacility, currentUser, patients, t
}) {
  const [activeSubTab, setActiveSubTab] = useState('maternal'); // maternal | vaccination
  const [selectedPatientId, setSelectedPatientId] = useState('PAT-002'); // Default Chaltu Desta (Maternal) or Hawi Gudeta (Child)
  const [maternalRecords, setMaternalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  // New ANC Record Modal
  const [showAncModal, setShowAncModal] = useState(false);
  const [ancVisitNum, setAncVisitNum] = useState('ANC Visit 4');
  const [gestationalWeeks, setGestationalWeeks] = useState(36);
  const [fundalHeight, setFundalHeight] = useState(36);
  const [fetalHeartRate, setFetalHeartRate] = useState(140);
  const [bp, setBp] = useState('115/72');
  const [weight, setWeight] = useState(66);
  const [ancNotes, setAncNotes] = useState('');

  // New Vaccine Record Modal
  const [showVacModal, setShowVacModal] = useState(false);
  const [vaccineName, setVaccineName] = useState('Measles Rubella (MR-2)');
  const [doseNumber, setDoseNumber] = useState(2);
  const [batchNum, setBatchNum] = useState('ETH-EPI-2026-B9');

  const fetchPatientMch = async (patId) => {
    setLoading(true);
    try {
      const [resM, resV] = await Promise.all([
        fetch(`/api/maternal/patient/${patId}`),
        fetch(`/api/vaccinations/patient/${patId}`)
      ]);
      const dataM = await resM.json();
      const dataV = await resV.json();
      setMaternalRecords(dataM);
      setVaccinations(dataV);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientMch(selectedPatientId);
  }, [selectedPatientId]);

  const handleRecordAnc = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maternal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          visit_number: ancVisitNum,
          gestational_age_weeks: gestationalWeeks,
          fundal_height_cm: fundalHeight,
          fetal_heart_rate_bpm: fetalHeartRate,
          blood_pressure: bp,
          weight_kg: weight,
          tetanus_toxoid_status: 'UP_TO_DATE',
          iron_folate_given: 1,
          hiv_test_result: 'NON_REACTIVE',
          vdrl_test_result: 'NON_REACTIVE',
          notes: ancNotes || 'Routine 4th ANC review; cephalic presentation confirmed.',
          facility_id: currentFacility?.id || 'FAC-SHENEN',
          provider_id: currentUser?.id || 'USR-DOC-02',
          user_name: currentUser?.full_name,
          user_role: currentUser?.role
        })
      });

      if (res.ok) {
        setShowAncModal(false);
        setAncNotes('');
        await fetchPatientMch(selectedPatientId);
      }
    } catch (err) {
      alert('Error recording ANC: ' + err.message);
    }
  };

  const handleRecordVaccine = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          vaccine_name: vaccineName,
          dose_number: doseNumber,
          date_given: new Date().toISOString().slice(0, 10),
          facility_id: currentFacility?.id || 'FAC-JUMC',
          administered_by: currentUser?.full_name || 'Sr. Fatuma Kedir',
          batch_number: batchNum,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role
        })
      });

      if (res.ok) {
        setShowVacModal(false);
        await fetchPatientMch(selectedPatientId);
      }
    } catch (err) {
      alert('Error recording vaccination: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Baby className="w-5 h-5 text-rose-500" />
            Maternal Health (ANC) & Child Immunization (EPI) Tracker
          </h2>
          <p className="text-xs text-slate-500">
            Aligned with Ethiopian Ministry of Health Antenatal Care guidelines and national childhood vaccination protocols.
          </p>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-600">Patient:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.father_name} ({p.gender}, DOB: {p.date_of_birth})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub Tabs: Maternal ANC vs Child EPI */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('maternal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'maternal' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Heart className="w-4 h-4" />
          Antenatal Care (ANC 1–4)
        </button>
        <button
          onClick={() => setActiveSubTab('vaccination')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeSubTab === 'vaccination' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Baby className="w-4 h-4" />
          Childhood Immunization (EPI Card)
        </button>
      </div>

      {/* TAB 1: MATERNAL ANTENATAL CARE (ANC) */}
      {activeSubTab === 'maternal' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Antenatal Trajectory (ANC 1 - 4 Milestone Protocol)
              </h3>
              <p className="text-xs text-slate-500">
                Monitor fundal height, fetal heart rate, maternal blood pressure, and tetanus prophylaxis.
              </p>
            </div>
            <button
              onClick={() => setShowAncModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              Record ANC Visit
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading ANC records...</div>
          ) : maternalRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No ANC visits recorded for this patient. Click "Record ANC Visit" to log an antenatal observation.
            </div>
          ) : (
            <div className="space-y-4">
              {maternalRecords.map(anc => (
                <div key={anc.id} className="p-4 bg-gradient-to-r from-rose-50/50 to-pink-50/30 rounded-xl border border-rose-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs">
                        {anc.visit_number}
                      </span>
                      <span>{anc.gestational_age_weeks} Weeks Gestational Age</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{anc.recorded_at} · {anc.facility_name}</span>
                  </div>

                  {/* Vitals Grid for ANC */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-rose-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Fundal Height</span>
                      <span className="font-bold text-slate-800">{anc.fundal_height_cm || '--'} cm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-rose-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Fetal Heart Rate</span>
                      <span className="font-bold text-rose-700">{anc.fetal_heart_rate_bpm || '--'} bpm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-rose-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Maternal BP</span>
                      <span className="font-bold text-slate-800 font-mono">{anc.blood_pressure || '--'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-rose-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tetanus Toxoid</span>
                      <span className="font-bold text-emerald-700">{anc.tetanus_toxoid_status}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-rose-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Iron / Folate</span>
                      <span className="font-bold text-indigo-700">{anc.iron_folate_given ? 'Dispensed' : 'No'}</span>
                    </div>
                  </div>

                  {anc.notes && (
                    <div className="p-2.5 bg-white rounded-lg border border-rose-100 text-slate-700">
                      <strong className="text-rose-900 block mb-0.5">Clinical Remarks & Birth Plan:</strong>
                      {anc.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHILDHOOD IMMUNIZATION (EPI CARD) */}
      {activeSubTab === 'vaccination' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Childhood Immunization Record (Ethiopian EPI Card)
              </h3>
              <p className="text-xs text-slate-500">
                Official vaccination card for preventable diseases (BCG, Polio, Pentavalent, PCV, Rotavirus, Measles).
              </p>
            </div>
            <button
              onClick={() => setShowVacModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              Administer Vaccine
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading immunization records...</div>
          ) : vaccinations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No vaccination records on file for this patient. Click "Administer Vaccine" to record an immunization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <th className="py-3 px-4">Vaccine Name</th>
                    <th className="py-3 px-4">Dose</th>
                    <th className="py-3 px-4">Date Administered</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Facility & Clinician</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vaccinations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{v.vaccine_name}</td>
                      <td className="py-3 px-4 font-semibold text-indigo-700">Dose #{v.dose_number}</td>
                      <td className="py-3 px-4 text-slate-700 font-mono">{v.date_given}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{v.batch_number || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{v.facility_name}</div>
                        <div className="text-[10px] text-slate-400">By {v.administered_by}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Complete
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECORD ANC MODAL */}
      {showAncModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Record Antenatal Care (ANC) Observation</h3>

            <form onSubmit={handleRecordAnc} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Visit Protocol</label>
                  <select
                    value={ancVisitNum}
                    onChange={(e) => setAncVisitNum(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="ANC Visit 1">ANC Visit 1 (Trimester 1)</option>
                    <option value="ANC Visit 2">ANC Visit 2 (Week 20)</option>
                    <option value="ANC Visit 3">ANC Visit 3 (Week 32)</option>
                    <option value="ANC Visit 4">ANC Visit 4 (Week 36+)</option>
                    <option value="Postnatal Care">Postnatal Checkup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Gestational Age (Weeks) *</label>
                  <input
                    type="number"
                    required
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Fundal Ht (cm)</label>
                  <input
                    type="number"
                    value={fundalHeight}
                    onChange={(e) => setFundalHeight(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">FHR (bpm)</label>
                  <input
                    type="number"
                    value={fetalHeartRate}
                    onChange={(e) => setFetalHeartRate(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Clinical Remarks & Birth Preparedness Plan</label>
                <textarea
                  rows="3"
                  value={ancNotes}
                  onChange={(e) => setAncNotes(e.target.value)}
                  placeholder="Fetal presentation, maternal counseling, danger signs reviewed, delivery facility plan..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save ANC Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD VACCINE MODAL */}
      {showVacModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Administer Childhood Vaccine (EPI)</h3>

            <form onSubmit={handleRecordVaccine} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Vaccine Name *</label>
                <select
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="BCG (Tuberculosis)">BCG (Tuberculosis) - At Birth</option>
                  <option value="Oral Polio Vaccine (OPV)">Oral Polio Vaccine (OPV)</option>
                  <option value="Pentavalent (DTP-HepB-Hib)">Pentavalent (DTP-HepB-Hib)</option>
                  <option value="Pneumococcal Conjugate (PCV)">Pneumococcal Conjugate (PCV)</option>
                  <option value="Rotavirus Vaccine (Rota)">Rotavirus Vaccine (Rota)</option>
                  <option value="Inactivated Polio Vaccine (IPV)">Inactivated Polio Vaccine (IPV)</option>
                  <option value="Measles Rubella (MR)">Measles Rubella (MR)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Dose Number</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={doseNumber}
                    onChange={(e) => setDoseNumber(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Vaccine Batch / Lot No.</label>
                  <input
                    type="text"
                    value={batchNum}
                    onChange={(e) => setBatchNum(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVacModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Record Administration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
