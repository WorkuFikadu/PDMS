// frontend/src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import {
  Users, Activity, FileText, Share2, Pill, FlaskConical,
  ShieldAlert, BarChart3, Globe, Building2, UserCheck, Shield,
  KeyRound, Hospital, Bed, Calendar, Baby, Wifi, WifiOff,
  UploadCloud, CheckCircle2, ChevronDown, Plus, X, Layers,
  Stethoscope, Clock, ShieldCheck
} from 'lucide-react';

export default function Header({
  lang, setLang, t,
  activeTab, setActiveTab,
  currentFacility, setCurrentFacility, facilities,
  currentUser, setCurrentUser, users,
  onSyncComplete
}) {
  // Navigation Category Filter: 'all' | 'clinical' | 'continuity' | 'diagnostics' | 'governance'
  const [navCategory, setNavCategory] = useState('all');

  // Offline Simulator State
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
        if (onSyncComplete) onSyncComplete();
        setTimeout(() => setSyncToast(''), 4500);
      }
    } catch (err) {
      alert('Sync failed. Please ensure the backend service is running.');
    } finally {
      setSyncing(false);
    }
  };

  // Tab definitions with categories
  const allNavItems = [
    { id: 'patients', label: t.navPatients, icon: Users, category: 'clinical' },
    {
      id: 'cross-hospital',
      label: t.navCrossHospitalOtp,
      icon: KeyRound,
      category: 'clinical',
      badge: 'OTP'
    },
    {
      id: 'ai-hub',
      label: t.navAiHub,
      icon: Sparkles,
      category: 'ai',
      isAiBadge: true
    },
    { id: 'timeline', label: t.navClinicalTimeline, icon: Activity, category: 'clinical' },
    { id: 'surgeries', label: t.navSurgeries, icon: Hospital, category: 'clinical' },
    { id: 'admissions', label: t.navAdmissions, icon: Bed, category: 'clinical' },
    { id: 'referrals', label: t.navReferrals, icon: Share2, category: 'continuity' },
    { id: 'appointments', label: t.navAppointments, icon: Calendar, category: 'continuity' },
    { id: 'maternal-child', label: t.navMaternalChild, icon: Baby, category: 'continuity' },
    { id: 'pharmacy', label: t.navPharmacy, icon: Pill, category: 'diagnostics' },
    { id: 'diagnostics', label: t.navDiagnostics, icon: FlaskConical, category: 'diagnostics' },
    { id: 'duplicates', label: t.navDuplicateQueue, icon: ShieldAlert, category: 'governance', alertBadge: true },
    { id: 'audit', label: t.navAudit, icon: Shield, category: 'governance' },
    { id: 'analytics', label: t.navAnalytics, icon: BarChart3, category: 'governance' },
    { id: 'patient-portal', label: t.navPatientPortal, icon: FileText, category: 'governance' }
  ];

  // Auto-switch category filter if current activeTab belongs to another category
  useEffect(() => {
    const currentItem = allNavItems.find(item => item.id === activeTab);
    if (currentItem && navCategory !== 'all' && currentItem.category !== navCategory) {
      setNavCategory(currentItem.category);
    }
  }, [activeTab]);

  const visibleItems = navCategory === 'all'
    ? allNavItems
    : allNavItems.filter(item => item.category === navCategory);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* 1. TOP NATIONAL CREST & MINISTERIAL RIBBON */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-200 border-b border-slate-800">
        {/* Subtle Ethiopian Flag Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap justify-between items-center text-xs gap-3">
          {/* Institutional Branding */}
          <div className="flex items-center gap-2.5">
            {/* Ethiopian National Seal SVG Emblem */}
            <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center p-0.5">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400 fill-current">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
                <polygon points="50,15 61,38 85,38 66,53 73,77 50,62 27,77 34,53 15,38 39,38" fill="currentColor" />
              </svg>
            </div>
            <span className="font-extrabold tracking-wider text-slate-100 text-[11px] uppercase">
              Federal Democratic Republic of Ethiopia
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-medium text-[11px]">
              Ministry of Health (MOH)
            </span>
            <span className="hidden lg:inline text-slate-600">•</span>
            <span className="hidden lg:inline text-slate-400 text-[11px]">
              National Health Information Network (NHIN) • Interoperable Health Spine
            </span>
          </div>

          {/* Right Utilities: National Spine Status & Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Live Backbone Connection Pill */}
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title="Click to toggle low-bandwidth offline resilience mode"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                isOfflineMode
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline Mode (Simulated)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>National Health Spine: Online</span>
                </>
              )}
            </button>

            {/* Offline Sync Badge */}
            {offlineQueue.length > 0 && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-1 px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-[10px] font-bold shadow-xs transition"
              >
                <UploadCloud className={`w-3 h-3 ${syncing ? 'animate-bounce' : ''}`} />
                <span>Sync ({offlineQueue.length})</span>
              </button>
            )}

            {/* Trilingual Segmented Switcher */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-[11px]">
              <Globe className="w-3 h-3 text-sky-400 ml-1.5 mr-1" />
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  lang === 'en' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('om')}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  lang === 'om' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Afaan Oromoo
              </button>
              <button
                onClick={() => setLang('am')}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  lang === 'am' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                አማርኛ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR: BRANDING + PROFESSIONAL EXECUTIVE DROPDOWNS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap gap-4 items-center justify-between">
        {/* Brand & Crest */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-700 via-indigo-700 to-emerald-600 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-black text-xl tracking-tighter">
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                N
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t.systemTitle}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Fayda ID Ready
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                HL7 FHIR R4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t.systemSubtitle}
            </p>
          </div>
        </div>

        {/* Executive Switchers: Active Facility & Active Practitioner Role */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Facility Switcher Card */}
          <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs transition">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.activeFacility}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-slate-200 text-slate-700">
                  {currentFacility?.code || 'FAC'}
                </span>
              </div>
              <div className="relative">
                <select
                  value={currentFacility?.id || ''}
                  onChange={(e) => {
                    const sel = facilities.find(f => f.id === e.target.value);
                    if (sel) setCurrentFacility(sel);
                  }}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer pr-4 appearance-none"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Practitioner Role Switcher Card */}
          <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs transition">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.activeRole}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-indigo-100 text-indigo-700">
                  {currentUser?.role || 'CLINICIAN'}
                </span>
              </div>
              <div className="relative">
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                    const sel = users.find(u => u.id === e.target.value);
                    if (sel) setCurrentUser(sel);
                  }}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer pr-4 appearance-none max-w-[170px] truncate"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CATEGORIZED NAVIGATION & TAB SELECTOR (ZERO HORIZONTAL SCROLLBAR) */}
      <div className="border-t border-slate-200 bg-slate-50/60 px-4 sm:px-6 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Domain Category Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              Domain:
            </span>
            <button
              onClick={() => setNavCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                navCategory === 'all'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {t.catAll} (15)
            </button>
            <button
              onClick={() => setNavCategory('ai')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                navCategory === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-2xs'
                  : 'hover:bg-purple-100/70 text-purple-700 bg-purple-50 border border-purple-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>{t.catAi}</span>
            </button>
            <button
              onClick={() => setNavCategory('clinical')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                navCategory === 'clinical'
                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {t.catClinical}
            </button>
            <button
              onClick={() => setNavCategory('continuity')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                navCategory === 'continuity'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {t.catContinuity}
            </button>
            <button
              onClick={() => setNavCategory('diagnostics')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                navCategory === 'diagnostics'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {t.catDiagnostics}
            </button>
            <button
              onClick={() => setNavCategory('governance')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                navCategory === 'governance'
                  ? 'bg-purple-600 text-white font-bold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {t.catGovernance}
            </button>
          </div>

          {/* Quick Stats or Offline Action button */}
          {isOfflineMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOfflineModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Capture Offline Consultation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. ACTIVE NAVIGATION TABS (CLEAN, MODERN, NO-SCROLLBAR CONTAINER) */}
      <div className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center overflow-x-auto no-scrollbar gap-1 py-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isOtpHighlight = item.id === 'cross-hospital';
            const isAiHighlight = item.id === 'ai-hub';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap relative ${
                  isActive
                    ? isOtpHighlight
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : isAiHighlight
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold'
                    : isOtpHighlight
                    ? 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/80 font-bold'
                    : isAiHighlight
                    ? 'text-purple-900 bg-purple-50/90 hover:bg-purple-100 border border-purple-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${
                  isActive
                    ? isOtpHighlight ? 'text-amber-300' : isAiHighlight ? 'text-amber-300 animate-pulse' : 'text-sky-600'
                    : isOtpHighlight ? 'text-indigo-600' : isAiHighlight ? 'text-purple-600' : 'text-slate-500'
                }`} />
                <span>{item.label}</span>

                {/* AI Badge */}
                {item.isAiBadge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isActive ? 'bg-amber-300 text-purple-950' : 'bg-purple-600 text-white'
                  }`}>
                    AI
                  </span>
                )}

                {/* OTP Security Badge */}
                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Alert Badge for Duplicates */}
                {item.alertBadge && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DYNAMIC OFFLINE BANNER (ONLY EXPANDS WHEN OFFLINE SIMULATION IS ACTIVE) */}
      {isOfflineMode && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-medium border-t border-amber-400 flex flex-wrap justify-between items-center gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-950 font-bold animate-pulse" />
            <span className="font-extrabold uppercase tracking-wide text-[11px]">
              Low-Bandwidth / Rural Health Post Resilience Mode Active:
            </span>
            <span className="text-[11px] text-amber-950">
              Consultations are secured locally into encrypted SQLite storage. When connectivity resumes, click sync to broadcast to the National Health Spine.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOfflineModal(true)}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" />
              Document Offline Visit
            </button>
            <button
              onClick={handleSyncNow}
              disabled={offlineQueue.length === 0 || syncing}
              className={`px-3 py-1 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition ${
                offlineQueue.length > 0
                  ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-xs cursor-pointer'
                  : 'bg-amber-400 text-amber-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
              <span>Broadcast Sync Queue ({offlineQueue.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* SYNC NOTIFICATION TOAST */}
      {syncToast && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2 font-bold animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-700"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
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
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs"
                >
                  Save to Local Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}