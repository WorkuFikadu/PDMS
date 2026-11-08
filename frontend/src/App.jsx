// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import AppNavbar from './components/AppNavbar';
import AppSidebar from './components/AppSidebar';
import PatientRegistry from './components/PatientRegistry';
import CrossHospitalAccess from './components/CrossHospitalAccess';
import LongitudinalEHR from './components/LongitudinalEHR';
import SurgeryModule from './components/SurgeryModule';
import AdmissionsModule from './components/AdmissionsModule';
import ReferralsHub from './components/ReferralsHub';
import PharmacyModule from './components/PharmacyModule';
import DiagnosticsModule from './components/DiagnosticsModule';
import DuplicateQueue from './components/DuplicateQueue';
import AuditTrail from './components/AuditTrail';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PatientPortal from './components/PatientPortal';
import AppointmentsModule from './components/AppointmentsModule';
import MaternalChildModule from './components/MaternalChildModule';
import AiClinicalHub from './components/AiClinicalHub';
import HospitalNetworkModule from './components/HospitalNetworkModule';
import EmergencyBloodBank from './components/EmergencyBloodBank';
import { translations } from './i18n';
import { CheckCircle2, Stethoscope, X } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('patients');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [facilities, setFacilities] = useState([]);
  const [currentFacility, setCurrentFacility] = useState(null);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('PAT-001');
  const [loading, setLoading] = useState(true);

  // Offline Resilience State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState('');
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // Quick offline consultation inputs
  const [offlinePatId, setOfflinePatId] = useState('PAT-001');
  const [offlineChief, setOfflineChief] = useState('');
  const [offlineBp, setOfflineBp] = useState('130/80');
  const [offlinePulse, setOfflinePulse] = useState(78);

  const t = translations[lang] || translations.en;

  // Restore offline queue from local cache
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
    setShowOfflineModal(false);
    setOfflineChief('');
  };

  const handleSyncNow = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    setSyncToast('');

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
        setSyncToast(`Synced ${data.synced?.length || 0} offline record(s) to National Health Spine!`);
        handleRefreshPatients();
        setTimeout(() => setSyncToast(''), 4500);
      }
    } catch (err) {
      alert('Sync failed. Please ensure the backend service is running.');
    } finally {
      setSyncing(false);
    }
  };

  // Initial load
  const loadInitialData = async () => {
    try {
      const [resF, resU, resP] = await Promise.all([
        fetch('/api/facilities'),
        fetch('/api/auth/users'),
        fetch('/api/patients')
      ]);

      const dataF = await resF.json();
      const dataU = await resU.json();
      const dataP = await resP.json();

      setFacilities(dataF);
      if (dataF.length > 0 && !currentFacility) {
        setCurrentFacility(dataF[0]); // Jimma Medical Center (JMC)
      }

      setUsers(dataU);
      if (dataU.length > 0 && !currentUser) {
        // Default to Dr. Abebe Tadesse (Specialist / Doctor)
        const doctorUser = dataU.find(u => u.role === 'DOCTOR') || dataU[0];
        setCurrentUser(doctorUser);
      }

      setPatients(dataP);
      if (dataP.length > 0 && !selectedPatientId) {
        setSelectedPatientId(dataP[0].id);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('timeline');
  };

  const handleRefreshPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* 1. Slim 56px Top Header with Omnisearch & Switchers */}
      <AppNavbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        lang={lang}
        setLang={setLang}
        t={t}
        currentFacility={currentFacility}
        setCurrentFacility={setCurrentFacility}
        facilities={facilities}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={users}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        offlineQueue={offlineQueue}
        handleSyncNow={handleSyncNow}
        syncing={syncing}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenOfflineModal={() => setShowOfflineModal(true)}
      />

      {/* Sync Success Toast */}
      {syncToast && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2 font-bold animate-in fade-in slide-in-from-top-1 z-40 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* 2. Main Shell: Collapsible Sidebar + Dynamic View Area */}
      <div className="flex-1 flex overflow-hidden">
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          t={t}
          isOfflineMode={isOfflineMode}
          setIsOfflineMode={setIsOfflineMode}
          offlineQueue={offlineQueue}
          onOpenOfflineModal={() => setShowOfflineModal(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70">
          <div className="max-w-7xl mx-auto space-y-4">
            {loading ? (
              <div className="p-16 text-center text-slate-500 font-medium text-sm">
                Connecting to Ethiopian National Patient Data Management System...
              </div>
            ) : (
              <>
                {activeTab === 'patients' && (
                  <PatientRegistry
                    patients={patients}
                    loading={loading}
                    onSelectPatient={handleSelectPatient}
                    onRefresh={handleRefreshPatients}
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    t={t}
                  />
                )}

                {/* OTP-Based Cross-Hospital Medical Record Sharing Gateway */}
                {activeTab === 'cross-hospital' && (
                  <CrossHospitalAccess
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    t={t}
                  />
                )}

                {/* AI Clinical Intelligence Hub */}
                {activeTab === 'ai-hub' && (
                  <AiClinicalHub
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    initialPatientId={selectedPatientId}
                    t={t}
                  />
                )}

                {activeTab === 'timeline' && (
                  <LongitudinalEHR
                    patientId={selectedPatientId}
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    onRefresh={handleRefreshPatients}
                    t={t}
                  />
                )}

                {activeTab === 'surgeries' && (
                  <SurgeryModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'admissions' && (
                  <AdmissionsModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'referrals' && (
                  <ReferralsHub
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'appointments' && (
                  <AppointmentsModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'maternal-child' && (
                  <MaternalChildModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'pharmacy' && (
                  <PharmacyModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    t={t}
                  />
                )}

                {activeTab === 'diagnostics' && (
                  <DiagnosticsModule
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    t={t}
                  />
                )}

                {activeTab === 'blood-bank' && (
                  <EmergencyBloodBank
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    patients={patients}
                    t={t}
                  />
                )}

                {activeTab === 'duplicates' && (
                  <DuplicateQueue
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    onRefresh={handleRefreshPatients}
                    t={t}
                  />
                )}

                {activeTab === 'audit' && (
                  <AuditTrail
                    currentFacility={currentFacility}
                    currentUser={currentUser}
                    t={t}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsDashboard
                    currentFacility={currentFacility}
                    t={t}
                  />
                )}

                {activeTab === 'patient-portal' && (
                  <PatientPortal
                    currentUser={currentUser}
                    t={t}
                  />
                )}

                {activeTab === 'hospital-network' && (
                  <HospitalNetworkModule
                    currentUser={currentUser}
                    t={t}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* QUICK OFFLINE CONSULTATION MODAL */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full border-2 border-amber-400 p-6 space-y-4 text-xs shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-amber-600" />
                  Rural Health Clinic Offline Consultation
                </h3>
                <p className="text-[11px] text-slate-500">Local Cache: Stored safely in browser until spine reconnection</p>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOfflineRecord} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Patient (NPDMS Master)
                </label>
                <select
                  value={offlinePatId}
                  onChange={(e) => setOfflinePatId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold bg-slate-50 focus:bg-white"
                >
                  <option value="PAT-001">Kemal Mohammed (ETH-NPDMS-2026-004128)</option>
                  <option value="PAT-002">Chaltu Desta (ETH-NPDMS-2026-009845)</option>
                  <option value="PAT-003">Emergency Trauma (ETH-NPDMS-2026-000911)</option>
                  <option value="PAT-004">Hawi Gudeta (ETH-NPDMS-2026-003319)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Clinical Chief Complaint & Presentation
                </label>
                <textarea
                  required
                  rows={3}
                  value={offlineChief}
                  onChange={(e) => setOfflineChief(e.target.value)}
                  placeholder="e.g. Mild fever, persistent cough for 4 days, prescribed supportive rehydration..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    value={offlineBp}
                    onChange={(e) => setOfflineBp(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    value={offlinePulse}
                    onChange={(e) => setOfflinePulse(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save to Local Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
