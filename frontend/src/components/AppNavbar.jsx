// frontend/src/components/AppNavbar.jsx
import React, { useState, useEffect } from 'react';
import {
  PanelLeftClose, PanelLeft, Building2,
  ChevronDown, WifiOff, UploadCloud,
  Search, X, LogOut, ShieldAlert, AlertOctagon
} from 'lucide-react';
import { apiFetch } from '../api';

export default function AppNavbar({
  sidebarOpen, setSidebarOpen,
  lang, setLang, t,
  currentFacility, setCurrentFacility, facilities,
  currentUser, setCurrentUser, users,
  isOfflineMode, setIsOfflineMode,
  offlineQueue, handleSyncNow, syncing,
  searchTerm, setSearchTerm,
  onOpenOfflineModal,
  onLogout,
  activeTab,
  setActiveTab
}) {
  const isAdminMode = activeTab === 'admin';
  const [activeThreatCount, setActiveThreatCount] = useState(0);

  // Periodically check for intercepted cyber threats
  useEffect(() => {
    let isMounted = true;
    const checkThreats = async () => {
      try {
        const res = await apiFetch('/api/admin/security/overview');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setActiveThreatCount(data.threats_blocked_24h || 0);
          }
        }
      } catch (_) {}
    };

    checkThreats();
    const interval = setInterval(checkThreats, 20000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  return (
    <header className={`h-14 border-b z-30 flex items-center justify-between px-3 sm:px-5 shrink-0 shadow-sm transition-colors duration-300 ${
      isAdminMode
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white border-slate-200'
    }`}>

      {/* ── LEFT: Sidebar Toggle + Brand ── */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle Navigation Sidebar"
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isAdminMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-700'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>

        {/* Ethiopian Emblem + NPDMS wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-700 via-indigo-700 to-emerald-600 p-0.5 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current">
                <polygon points="50,15 61,38 85,38 66,53 73,77 50,62 27,77 34,53 15,38 39,38" />
              </svg>
            </div>
          </div>
          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-sm tracking-tight ${isAdminMode ? 'text-white' : 'text-slate-900'}`}>
                NPDMS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Fayda ID
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              FDRE Ministry of Health • Health Spine
            </p>
          </div>
        </div>
      </div>

      {/* ── CENTER: Omnisearch ── */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
            placeholder="Search patient by Name, Fayda FIN, or Phone..."
            className={`w-full pl-9 pr-8 py-1.5 text-xs border rounded-xl focus:outline-none focus:ring-2 transition ${
              isAdminMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-sky-500/30 focus:border-sky-500'
                : 'bg-slate-100/80 hover:bg-slate-100 border-slate-200 focus:bg-white focus:ring-sky-500/20 focus:border-sky-500'
            }`}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT: Controls ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* ── ADMIN GOVERNANCE PANEL BUTTON — always visible with Threat Surveillance ── */}
        <button
          onClick={() => setActiveTab && setActiveTab('admin')}
          title="Open Admin Governance Panel"
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition cursor-pointer shrink-0 ${
            isAdminMode
              ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40'
              : activeThreatCount > 0
              ? 'bg-red-100 border-red-400 text-red-800 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm animate-pulse'
              : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md hover:shadow-red-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Admin Governance Panel</span>
          {activeThreatCount > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white border border-white shadow-xs">
              {activeThreatCount} ALERT{activeThreatCount > 1 ? 'S' : ''}
            </span>
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAdminMode ? 'bg-red-200 animate-pulse' : 'bg-red-400'}`} />
          )}
        </button>

        {/* Live Spine Status */}
        <button
          onClick={() => setIsOfflineMode(!isOfflineMode)}
          title="Toggle offline resilience mode"
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
            isOfflineMode
              ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          {isOfflineMode ? (
            <><WifiOff className="w-3 h-3 text-amber-400" /><span>Offline</span></>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /><span>Spine Online</span></>
          )}
        </button>

        {/* Offline sync badge */}
        {offlineQueue && offlineQueue.length > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
            <span>Sync ({offlineQueue.length})</span>
          </button>
        )}

        {/* Facility Switcher */}
        <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-xs ${
          isAdminMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <div className="relative">
            <select
              value={currentFacility?.id || ''}
              onChange={(e) => {
                const sel = facilities.find(f => f.id === e.target.value);
                if (sel) setCurrentFacility(sel);
              }}
              className={`bg-transparent font-bold text-[11px] focus:outline-none cursor-pointer pr-4 appearance-none max-w-[130px] truncate ${
                isAdminMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-0 top-1 pointer-events-none ${isAdminMode ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </div>

        {/* User Card */}
        <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-xs ${
          isAdminMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 text-white ${
            isAdminMode ? 'bg-red-600' : 'bg-indigo-600'
          }`}>
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="relative hidden sm:block">
            <select
              value={currentUser?.id || ''}
              onChange={(e) => {
                const sel = users.find(u => u.id === e.target.value);
                if (sel) setCurrentUser(sel);
              }}
              className={`bg-transparent font-bold text-[11px] focus:outline-none cursor-pointer pr-4 appearance-none max-w-[120px] truncate ${
                isAdminMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace('_', ' ')})</option>
              ))}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-0 top-1 pointer-events-none ${isAdminMode ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </div>

        {/* Language Switcher */}
        <div className={`flex items-center border rounded-xl p-0.5 text-xs font-semibold ${
          isAdminMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          {['en', 'om', 'am'].map((l, i) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                lang === l
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : isAdminMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {['EN', 'OM', 'አማ'][i]}
            </button>
          ))}
        </div>

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign out from NPDMS"
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isAdminMode
                ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 border-slate-700'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
