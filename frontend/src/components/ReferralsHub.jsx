// frontend/src/components/ReferralsHub.jsx
import React, { useState, useEffect } from 'react';
import {
  Share2, Building2, User, Clock, ArrowRight, CheckCircle2,
  AlertTriangle, PlusCircle, MessageSquare, Filter, Send
} from 'lucide-react';

export default function ReferralsHub({
  currentFacility, currentUser, patients, t
}) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedRef, setSelectedRef] = useState(null);

  // New Referral State
  const [patientId, setPatientId] = useState('');
  const [toFacilityId, setToFacilityId] = useState('FAC-JUMC');
  const [urgency, setUrgency] = useState('PRIORITY');
  const [referralReason, setReferralReason] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');

  // Counter-referral State
  const [counterSummary, setCounterSummary] = useState('');
  const [newStatus, setNewStatus] = useState('COUNTER_REFERRED');

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referrals');
      const data = await res.json();
      setReferrals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [currentFacility]);

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!patientId || !referralReason) return;

    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          from_facility_id: currentFacility?.id || 'FAC-AGARO',
          to_facility_id: toFacilityId,
          referring_clinician_id: currentUser?.id || 'USR-DOC-03',
          user_name: currentUser?.full_name || 'Clinician',
          user_role: currentUser?.role || 'DOCTOR',
          urgency,
          referral_reason: referralReason,
          clinical_summary: clinicalSummary
        })
      });

      if (res.ok) {
        setShowNewModal(false);
        setReferralReason('');
        setClinicalSummary('');
        fetchReferrals();
      }
    } catch (err) {
      alert('Error creating referral');
    }
  };

  const handleRespondReferral = async (e) => {
    e.preventDefault();
    if (!selectedRef) return;

    try {
      const res = await fetch(`/api/referrals/${selectedRef.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          counter_referral_summary: counterSummary,
          user_id: currentUser?.id,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role,
          facility_id: currentFacility?.id
        })
      });

      if (res.ok) {
        setShowRespondModal(false);
        setCounterSummary('');
        setSelectedRef(null);
        fetchReferrals();
      }
    } catch (err) {
      alert('Error updating referral');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-sky-600" />
            {t.navReferrals}
          </h2>
          <p className="text-xs text-slate-500">
            Coordinated patient transfer, shared clinical summaries, and counter-referral care continuity.
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0) setPatientId(patients[0].id);
            setShowNewModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          {t.newReferral}
        </button>
      </div>

      {/* Referrals Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading referrals...</div>
      ) : referrals.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          No referrals on record.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {referrals.map((ref) => {
            const isCritical = ref.urgency === 'EMERGENCY';
            const isPriority = ref.urgency === 'PRIORITY';

            return (
              <div
                key={ref.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-sky-300 transition"
              >
                {/* Header: Urgency & Status */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isCritical ? 'bg-rose-100 text-rose-800' : isPriority ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                        {ref.urgency}
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-700">
                        {ref.npdms_id}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {ref.first_name} {ref.father_name}
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${ref.status === 'COUNTER_REFERRED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                    {ref.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Transfer route */}
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-700 font-medium">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase">From</span>
                    <span className="font-bold">{ref.from_facility_name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">To</span>
                    <span className="font-bold text-sky-800">{ref.to_facility_name}</span>
                  </div>
                </div>

                {/* Referral reason */}
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    Referral Indication
                  </span>
                  <p className="text-slate-800 font-semibold">{ref.referral_reason}</p>
                  {ref.clinical_summary && (
                    <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-md border border-slate-100">
                      {ref.clinical_summary}
                    </p>
                  )}
                </div>

                {/* Counter Referral Feedback */}
                {ref.counter_referral_summary && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px] uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Receiving Facility Counter-Referral:
                    </span>
                    <p className="text-emerald-950 font-medium">{ref.counter_referral_summary}</p>
                  </div>
                )}

                {/* Action button */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    By {ref.referring_clinician_name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRef(ref);
                      setCounterSummary(ref.counter_referral_summary || '');
                      setShowRespondModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-600 hover:text-white font-semibold rounded-lg transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t.respondReferral}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW REFERRAL MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">{t.newReferral}</h3>

            <form onSubmit={handleCreateReferral} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Patient</label>
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
                  <label className="block text-slate-600 font-medium mb-1">{t.targetFacility}</label>
                  <select
                    value={toFacilityId}
                    onChange={(e) => setToFacilityId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FAC-JUMC">Jimma Univ. Medical Center</option>
                    <option value="FAC-SHENEN">Shenen Gibe Hospital</option>
                    <option value="FAC-AGARO">Agaro Primary Hospital</option>
                    <option value="FAC-TASH">Tikur Anbessa Hospital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{t.urgency}</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="PRIORITY">Priority</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">{t.referralReason} *</label>
                <input
                  type="text"
                  required
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="e.g. Specialized cardiology evaluation for refractory hypertension"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">{t.clinicalSummary}</label>
                <textarea
                  rows="3"
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  placeholder="Summarize key diagnoses, current medications, investigations performed..."
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
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Send Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUNTER-REFERRAL RESPONSE MODAL */}
      {showRespondModal && selectedRef && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">{t.respondReferral}</h3>
            <p className="text-slate-600">
              Patient: <strong>{selectedRef.first_name} {selectedRef.father_name}</strong> ({selectedRef.npdms_id})
            </p>

            <form onSubmit={handleRespondReferral} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Referral Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ACCEPTED">Accepted / Patient Arrived</option>
                  <option value="COUNTER_REFERRED">Completed & Counter-Referred to Origin</option>
                  <option value="REJECTED">Declined / Capacity Limit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">{t.counterReferralSummary} *</label>
                <textarea
                  rows="4"
                  required
                  value={counterSummary}
                  onChange={(e) => setCounterSummary(e.target.value)}
                  placeholder="Document findings, changes in treatment regimen, and instructions for continuing care at referring health center..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRespondModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Submit Counter-Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
