// frontend/src/components/DiagnosticsModule.jsx
import React, { useState, useEffect } from 'react';
import {
  FlaskConical, CheckCircle2, AlertOctagon, User, Building2,
  Clock, Search, FileText, Check
} from 'lucide-react';

export default function DiagnosticsModule({
  currentFacility, currentUser, t
}) {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Publish Form State
  const [resultVal, setResultVal] = useState('');
  const [normalRange, setNormalRange] = useState('');
  const [units, setUnits] = useState('');
  const [interpretation, setInterpretation] = useState('NORMAL');
  const [findingsNotes, setFindingsNotes] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/labs/queue');
      const data = await res.json();
      setLabs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [currentFacility]);

  const handleOpenPublish = (lab) => {
    setSelectedLab(lab);
    setResultVal(lab.result_value || '');
    setNormalRange(lab.normal_range || '');
    setUnits(lab.units || '');
    setInterpretation(lab.interpretation || 'NORMAL');
    setFindingsNotes(lab.findings_notes || '');
    setShowPublishModal(true);
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLab) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/labs/${selectedLab.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_value: resultVal,
          normal_range: normalRange,
          units,
          interpretation,
          findings_notes: findingsNotes,
          user_id: currentUser?.id || 'USR-LAB-01',
          user_name: currentUser?.full_name || 'Dawit Yohannes',
          user_role: currentUser?.role || 'LAB_TECH',
          facility_id: currentFacility?.id || 'FAC-JUMC'
        })
      });

      if (res.ok) {
        setShowPublishModal(false);
        await fetchLabs();
      }
    } catch (err) {
      alert('Failed to publish lab result');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            {t.navDiagnostics}
          </h2>
          <p className="text-xs text-slate-500">
            Publish verified laboratory observations and radiological findings accessible across participating facilities.
          </p>
        </div>
      </div>

      {/* Lab investigations table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading laboratory investigations...</div>
        ) : labs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No pending or completed diagnostic orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Test Name & Category</th>
                  <th className="py-3 px-4">Status & Result</th>
                  <th className="py-3 px-4">Interpretation</th>
                  <th className="py-3 px-4">Facility & Ordering Clinician</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labs.map(lab => (
                  <tr key={lab.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{lab.first_name} {lab.father_name}</div>
                      <div className="font-mono text-[10px] text-sky-700 font-semibold">{lab.npdms_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{lab.test_name}</div>
                      <div className="text-slate-500 text-[11px]">{lab.category} • Specimen: {lab.specimen || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {lab.status === 'COMPLETED' ? (
                        <div>
                          <span className="font-bold font-mono text-slate-900 text-sm">
                            {lab.result_value} {lab.units}
                          </span>
                          <span className="block text-[10px] text-slate-400">Ref: {lab.normal_range}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          {lab.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lab.interpretation ? (
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${lab.interpretation === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : lab.interpretation === 'ABNORMAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {lab.interpretation}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Awaiting analysis</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{lab.facility_name}</div>
                      <div className="text-slate-500 text-[11px]">By {lab.ordering_clinician}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenPublish(lab)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white font-semibold rounded-lg transition text-xs"
                      >
                        {lab.status === 'COMPLETED' ? 'Edit Result' : 'Publish Result'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PUBLISH MODAL */}
      {showPublishModal && selectedLab && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">
              Verify & Publish Result: {selectedLab.test_name}
            </h3>
            <p className="text-slate-600">
              Patient: <strong>{selectedLab.first_name} {selectedLab.father_name}</strong> ({selectedLab.npdms_id})
            </p>

            <form onSubmit={handlePublishSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Result Value *</label>
                  <input
                    type="text"
                    required
                    value={resultVal}
                    onChange={(e) => setResultVal(e.target.value)}
                    placeholder="e.g. 145"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Units</label>
                  <input
                    type="text"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="e.g. mg/dL, %, g/dL"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Normal Reference Range</label>
                  <input
                    type="text"
                    value={normalRange}
                    onChange={(e) => setNormalRange(e.target.value)}
                    placeholder="e.g. 70 - 140"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Clinical Interpretation</label>
                  <select
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="ABNORMAL">ABNORMAL</option>
                    <option value="CRITICAL">CRITICAL VALUE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Findings Notes / Remarks</label>
                <textarea
                  rows="3"
                  value={findingsNotes}
                  onChange={(e) => setFindingsNotes(e.target.value)}
                  placeholder="Clinical notes, morphology, or radiologist narrative..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {publishing ? 'Publishing...' : 'Verify & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
