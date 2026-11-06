// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
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
import { translations } from './i18n';

export default function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('patients');

  const [facilities, setFacilities] = useState([]);
  const [currentFacility, setCurrentFacility] = useState(null);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('PAT-001');
  const [loading, setLoading] = useState(true);

  const t = translations[lang] || translations.en;

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
        setCurrentFacility(dataF[0]); // Jimma University Medical Center
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Header with Switchers & Navigation */}
      <Header
        lang={lang}
        setLang={setLang}
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentFacility={currentFacility}
        setCurrentFacility={setCurrentFacility}
        facilities={facilities}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={users}
        onSyncComplete={handleRefreshPatients}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">
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
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          Ethiopian National Patient Data Management System (NPDMS) — Jimma University Department of Computer Science
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Final-Year Capstone Project by Worku Fikadu • Supervised Clinical Architecture • Aligned with FDRE Ministry of Health Digital Health Strategy & Fayda ID
        </p>
      </footer>
    </div>
  );
}
