// frontend/src/components/DuplicateQueue.jsx
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, GitMerge, UserCheck, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, Clock
} from 'lucide-react';

export default function DuplicateQueue({
  currentFacility, currentUser, onRefresh, t
}) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/duplicates');
      const data = await res.json();
      setDuplicates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleResolve = async (reviewId, action) => {
    setResolvingId(reviewId);
    try {
      const res = await fetch('/api/duplicates/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action,
          notes,
          user_id: currentUser?.id,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role,
          facility_id: currentFacility?.id
        })
      });

      if (res.ok) {
        setNotes('');
        await fetchDuplicates();
        onRefresh();
      }
    } catch (err) {
      alert('Error resolving duplicate: ' + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          {t.duplicateQueueTitle}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t.duplicateDesc}
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Checking duplicate review queue...</div>
      ) : duplicates.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <span className="font-semibold">Review queue is empty!</span>
          <span className="text-slate-400 text-[11px]">All patient demographic registrations have been verified without conflicting duplicates.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map(dup => (
            <div key={dup.id} className="bg-white rounded-2xl border-2 border-amber-200 p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Match Confidence: {Math.round(dup.match_score * 100)}%
                  </span>
                  <span className="font-mono text-xs text-slate-400">{dup.id}</span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {dup.created_at}
                </span>
              </div>

              {/* Match reasons */}
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-950 font-medium">
                <strong>Flag Reason:</strong> {dup.match_reasons}
              </div>

              {/* Side by side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Candidate Record */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    Candidate Registration Record
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {dup.cand_fname} {dup.cand_lname}
                  </div>
                  <div className="text-slate-600 space-y-1">
                    <div>NPDMS ID: <span className="font-mono font-semibold">{dup.candidate_npdms}</span></div>
                    <div>Date of Birth: <span className="font-semibold">{dup.cand_dob}</span></div>
                    <div>Phone: <span className="font-semibold">{dup.cand_phone || 'None'}</span></div>
                  </div>
                </div>

                {/* Master Matched Record */}
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
                  <span className="text-[11px] font-bold text-sky-700 uppercase block">
                    Existing Master Record
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {dup.match_fname} {dup.match_lname}
                  </div>
                  <div className="text-slate-600 space-y-1">
                    <div>NPDMS ID: <span className="font-mono font-semibold text-sky-800">{dup.matched_npdms}</span></div>
                    <div>Date of Birth: <span className="font-semibold">{dup.match_dob}</span></div>
                    <div>Phone: <span className="font-semibold">{dup.match_phone || 'None'}</span></div>
                  </div>
                </div>
              </div>

              {/* Reviewer notes & Decision buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Reviewer justification notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(dup.id, 'SEPARATE')}
                    disabled={resolvingId === dup.id}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition"
                  >
                    {t.markSeparate}
                  </button>
                  <button
                    onClick={() => handleResolve(dup.id, 'MERGE')}
                    disabled={resolvingId === dup.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    {t.mergeRecords}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
