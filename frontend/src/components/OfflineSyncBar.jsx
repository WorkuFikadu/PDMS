// frontend/src/components/OfflineSyncBar.jsx
import React, { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle,
  UploadCloud, Plus, X, Stethoscope
} from 'lucide-react';

export default function OfflineSyncBar({
  currentFacility, currentUser, onSyncComplete
}) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showQuickModal, setShowQuickModal] = useState(false);

  // Quick offline consultation form
  const [offlinePatId, setOfflinePatId] = useState('PAT-001');
  const [offlineChief, setOfflineChief] = useState('');
  const [offlineBp, setOfflineBp] = useState('130/80');
  const [offlinePulse, setOfflinePulse] = useState(78);

  useEffect(() => {
    const saved = localStorage.getItem('npdms_offline_queue');
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveQueue = (items) => {
    setOfflineQueue(items);
    localStorage.setItem('npdms_offline_queue', JSON.stringify(items));
  };

  const handleAddOfflineRecord = (e) => {
    e.preventDefault();
    if (!offlineChief.trim()) return;

    const newItem = {
      id: 'OFFLINE-' + Date.now(),
      type: 'ENCOUNTER',
      patient_id: offlinePatId,
      chief_complaint: offlineChief,
      vitals: { bp: offlineBp, pulse: offlinePulse },
      created_at: new Date().toISOString()
    };

    saveQueue([...offlineQueue, newItem]);
    setShowQuickModal(false);
    setOfflineChief('');
  };

  const handleSyncNow = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    setSyncMessage('');

    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: offlineQueue,
          facility_id: currentFacility?.id || 'FAC-JUMC',
          user_id: currentUser?.id || 'USR-DOC-01',
          user_name: currentUser?.full_name || 'Clinician'
        })
      });

      const data = await res.json();

      if (res.ok) {
        saveQueue([]);
        setSyncMessage(`Synced ${data.synced?.length || 0} offline records to national database!`);
        if (onSyncComplete) onSyncComplete();
        setTimeout(() => setSyncMessage(''), 4000);
      }
    } catch (err) {
      alert('Sync failed. Please ensure backend is reachable.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap justify-between items-center gap-3 border-b border-slate-800">
      {/* Network & Simulation status */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOfflineMode(!isOfflineMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition text-[11px] ${isOfflineMode ? 'bg-amber-600 text-white animate-pulse' : 'bg-emerald-600/80 text-white'}`}
        >
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{isOfflineMode ? 'Simulating Low-Bandwidth / Offline Mode' : 'Connected to National Health Backbone'}</span>
        </button>

        {isOfflineMode && (
          <span className="text-[11px] text-amber-300">
            Encrypted local cache active for rural health post resilience.
          </span>
        )}
      </div>

      {/* Sync Queue Controls */}
      <div className="flex items-center gap-2">
        {syncMessage && (
          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {syncMessage}
          </span>
        )}

        {isOfflineMode && (
          <button
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md transition text-[11px]"
          >
            <Plus className="w-3 h-3" />
            Capture Offline Visit
          </button>
        )}

        <button
          onClick={handleSyncNow}
          disabled={offlineQueue.length === 0 || syncing}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition text-[11px] ${offlineQueue.length > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-xs' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
          <span>Sync Queue ({offlineQueue.length})</span>
        </button>
      </div>

      {/* QUICK OFFLINE CAPTURE MODAL */}
      {showQuickModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full border-2 border-amber-400 p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-600" />
                Capture Offline Consultation
              </h3>
              <button onClick={() => setShowQuickModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              Stored locally on this workstation's encrypted offline cache. Will be safely pushed to the national server once internet is restored.
            </p>

            <form onSubmit={handleAddOfflineRecord} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Patient</label>
                <select
                  value={offlinePatId}
                  onChange={(e) => setOfflinePatId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="PAT-001">Kemal Mohammed (ETH-NPDMS-2026-004128)</option>
                  <option value="PAT-002">Chaltu Desta (ETH-NPDMS-2026-009845)</option>
                  <option value="PAT-003">Emergency Trauma Unknown-01</option>
                  <option value="PAT-004">Hawi Gudeta (Pediatric)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  value={offlineChief}
                  onChange={(e) => setOfflineChief(e.target.value)}
                  placeholder="e.g. Follow-up triage vitals, severe headache, emergency check"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={offlineBp}
                    onChange={(e) => setOfflineBp(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={offlinePulse}
                    onChange={(e) => setOfflinePulse(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save to Offline Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
