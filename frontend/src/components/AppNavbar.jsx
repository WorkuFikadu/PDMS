// frontend/src/components/AppNavbar.jsx
import React from 'react';
import {
  Menu, PanelLeftClose, PanelLeft, Globe, Building2,
  UserCheck, ChevronDown, Wifi, WifiOff, UploadCloud,
  Search, ShieldCheck, Sparkles, X, LogOut
} from 'lucide-react';

export default function AppNavbar({
  sidebarOpen, setSidebarOpen,
  lang, setLang, t,
  currentFacility, setCurrentFacility, facilities,
  currentUser, setCurrentUser, users,
  isOfflineMode, setIsOfflineMode,
  offlineQueue, handleSyncNow, syncing,
  searchTerm, setSearchTerm,
  onOpenOfflineModal,
  onLogout
}) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-3 sm:px-5 shrink-0 shadow-2xs">
      {/* LEFT: Sidebar Toggle & National Seal Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle Navigation Sidebar"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>

        {/* National Emblem & Title */}
        <div className="flex items-center gap-2.5">
          {/* Ethiopian Emblem Badge */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-700 via-indigo-700 to-emerald-600 p-0.5 shadow-xs flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current">
                <polygon points="50,15 61,38 85,38 66,53 73,77 50,62 27,77 34,53 15,38 39,38" />
              </svg>
            </div>
          </div>

          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 text-sm tracking-tight">NPDMS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Fayda ID
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              FDRE Ministry of Health • Health Spine
            </p>
          </div>
        </div>
      </div>

      {/* CENTER: Instant Omnisearch Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
            placeholder="Search patient by Name, Fayda FIN, or Phone..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Status, Switchers & Trilingual Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Spine Status Pill */}
        <button
          onClick={() => setIsOfflineMode(!isOfflineMode)}
          title="Click to toggle low-bandwidth offline resilience mode"
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
            isOfflineMode
              ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Spine Online</span>
            </>
          )}
        </button>

        {/* Sync Badge if records are queued */}
        {offlineQueue && offlineQueue.length > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
            <span>Sync ({offlineQueue.length})</span>
          </button>
        )}

        {/* Active Facility Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
          <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <div className="relative">
            <select
              value={currentFacility?.id || ''}
              onChange={(e) => {
                const sel = facilities.find(f => f.id === e.target.value);
                if (sel) setCurrentFacility(sel);
              }}
              className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer pr-4 appearance-none max-w-[140px] truncate"
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

        {/* User Role Card */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="relative hidden sm:block">
            <select
              value={currentUser?.id || ''}
              onChange={(e) => {
                const sel = users.find(u => u.id === e.target.value);
                if (sel) setCurrentUser(sel);
              }}
              className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer pr-4 appearance-none max-w-[130px] truncate"
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

        {/* Trilingual Segmented Pill */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-0.5 rounded-lg transition ${
              lang === 'en' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('om')}
            className={`px-2 py-0.5 rounded-lg transition ${
              lang === 'om' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OM
          </button>
          <button
            onClick={() => setLang('am')}
            className={`px-2 py-0.5 rounded-lg transition ${
              lang === 'am' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            አማ
          </button>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign out from NPDMS"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
