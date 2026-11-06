// frontend/src/components/Header.jsx
import React from 'react';
import {
  Users, Activity, FileText, Share2, Pill, FlaskConical,
  ShieldAlert, BarChart3, Globe, Building2, UserCheck, Shield
} from 'lucide-react';

export default function Header({
  lang, setLang, t,
  activeTab, setActiveTab,
  currentFacility, setCurrentFacility, facilities,
  currentUser, setCurrentUser, users
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top institution & metadata ribbon */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex flex-wrap justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-white tracking-wide">
            FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">Ministry of Health & Jimma University Capstone (Worku Fikadu, 2026)</span>
        </div>

        {/* Trilingual Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <button
              onClick={() => setLang('en')}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition ${lang === 'en' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('om')}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition ${lang === 'om' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Afaan Oromoo
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition ${lang === 'am' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              አማርኛ
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar: Logo, Facility Switcher, Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
              {t.systemTitle}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                MVP v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500">{t.systemSubtitle}</p>
          </div>
        </div>

        {/* Selectors for Facility & Role Simulation */}
        <div className="flex items-center gap-3">
          {/* Active Facility */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Building2 className="w-4 h-4 text-sky-600" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 font-medium uppercase">{t.activeFacility}</span>
              <select
                value={currentFacility?.id || ''}
                onChange={(e) => {
                  const sel = facilities.find(f => f.id === e.target.value);
                  if (sel) setCurrentFacility(sel);
                }}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active User / Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 font-medium uppercase">{t.activeRole}</span>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const sel = users.find(u => u.id === e.target.value);
                  if (sel) setCurrentUser(sel);
                }}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-100 text-xs font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('patients')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'patients' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Users className="w-4 h-4" />
          {t.navPatients}
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'timeline' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Activity className="w-4 h-4" />
          {t.navClinicalTimeline}
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'referrals' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Share2 className="w-4 h-4" />
          {t.navReferrals}
        </button>

        <button
          onClick={() => setActiveTab('pharmacy')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'pharmacy' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Pill className="w-4 h-4" />
          {t.navPharmacy}
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'diagnostics' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <FlaskConical className="w-4 h-4" />
          {t.navDiagnostics}
        </button>

        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'duplicates' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          {t.navDuplicateQueue}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'audit' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <Shield className="w-4 h-4 text-slate-500" />
          {t.navAudit}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'analytics' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <BarChart3 className="w-4 h-4" />
          {t.navAnalytics}
        </button>

        <button
          onClick={() => setActiveTab('patient-portal')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${activeTab === 'patient-portal' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}`}
        >
          <FileText className="w-4 h-4" />
          {t.navPatientPortal}
        </button>
      </div>
    </header>
  );
}
