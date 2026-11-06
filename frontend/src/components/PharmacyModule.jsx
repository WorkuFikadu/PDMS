// frontend/src/components/PharmacyModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Pill, CheckCircle2, AlertOctagon, User, Building2, Clock,
  Search, ShieldAlert, Sparkles, Filter
} from 'lucide-react';

export default function PharmacyModule({
  currentFacility, currentUser, t
}) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState('');
  const [dispensingId, setDispensingId] = useState(null);

  // Quick Safety Test Simulator in Pharmacy
  const [testPatientId, setTestPatientId] = useState('PAT-001');
  const [testDrug, setTestDrug] = useState('Amoxicillin');
  const [safetyCheckResult, setSafetyCheckResult] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  const fetchPharmacyQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacy/queue');
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacyQueue();
  }, [currentFacility]);

  const handleDispense = async (prescriptionId) => {
    setDispensingId(prescriptionId);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id || 'USR-PHARM-01',
          user_name: currentUser?.full_name || 'Tigist Haile',
          user_role: currentUser?.role || 'PHARMACIST',
          facility_id: currentFacility?.id || 'FAC-JUMC'
        })
      });

      if (res.ok) {
        await fetchPharmacyQueue();
      }
    } catch (err) {
      alert('Dispensing failed');
    } finally {
      setDispensingId(null);
    }
  };

  const handleRunSafetyTest = async () => {
    setCheckingSafety(true);
    setSafetyCheckResult(null);
    try {
      const res = await fetch('/api/prescriptions/safety-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: testPatientId,
          medication_name: testDrug
        })
      });
      const data = await res.json();
      setSafetyCheckResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingSafety(false);
    }
  };

  const filteredQueue = queue.filter(item =>
    item.medication_name.toLowerCase().includes(filterPatient.toLowerCase()) ||
    item.first_name.toLowerCase().includes(filterPatient.toLowerCase()) ||
    item.npdms_id.toLowerCase().includes(filterPatient.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-indigo-600" />
            {t.navPharmacy}
          </h2>
          <p className="text-xs text-slate-500">
            Real-time dispensing verification, active drug interactions, and cross-facility allergy safety checks.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter medication or patient..."
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
          />
        </div>
      </div>

      {/* Safety Engine Simulation Bar */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-indigo-950">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Interactive Drug Safety & Allergy Engine (Test Simulation)</span>
          </div>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
            Live Clinical Decision Support
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="text-slate-600 font-medium">Test Drug on Kemal Mohammed (PAT-001):</label>
          <input
            type="text"
            value={testDrug}
            onChange={(e) => setTestDrug(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-xs"
            placeholder="e.g. Amoxicillin, Penicillin, Bactrim, Amlodipine"
          />
          <button
            onClick={handleRunSafetyTest}
            disabled={checkingSafety}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition"
          >
            {checkingSafety ? 'Checking...' : 'Run Safety Scan'}
          </button>
        </div>

        {safetyCheckResult && (
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
            {safetyCheckResult.safe ? (
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Drug is safe! No documented allergies or active duplicate therapies detected.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {safetyCheckResult.warnings.map((w, idx) => (
                  <div key={idx} className="p-2 bg-rose-50 border border-rose-300 rounded-md text-rose-950 font-medium">
                    <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                      <AlertOctagon className="w-4 h-4 text-rose-600" />
                      <span>{w.title}</span>
                    </div>
                    <p className="mt-0.5 text-[11px]">{w.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescriptions Pending Dispensation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
          Pending Prescriptions ({filteredQueue.length})
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading pharmacy queue...</div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No active prescriptions pending dispensing.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Medication & Dosage</th>
                  <th className="py-3 px-4">Frequency / Duration</th>
                  <th className="py-3 px-4">Prescribed At</th>
                  <th className="py-3 px-4">Prescribing Doctor</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.first_name} {item.father_name}</div>
                      <div className="font-mono text-[10px] text-sky-700 font-semibold">{item.npdms_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-indigo-900 text-sm">{item.medication_name}</div>
                      <div className="text-slate-500 font-medium">{item.dosage} ({item.route})</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{item.frequency}</div>
                      <div className="text-slate-500 text-[11px]">{item.duration}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{item.facility_name}</div>
                      <div className="text-[10px] text-slate-400">{item.prescribed_at}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.prescriber_name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDispense(item.id)}
                        disabled={dispensingId === item.id}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-2xs transition text-xs"
                      >
                        {dispensingId === item.id ? 'Dispensing...' : t.dispense}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
