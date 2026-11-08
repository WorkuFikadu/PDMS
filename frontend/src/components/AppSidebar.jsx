// frontend/src/components/AppSidebar.jsx
import React from 'react';
import {
  Users, KeyRound, Sparkles, Activity, Hospital, Bed,
  Share2, Calendar, Baby, Pill, FlaskConical, ShieldAlert,
  Shield, BarChart3, FileText, WifiOff, Wifi, Plus, ChevronRight, Network, Droplets
} from 'lucide-react';

export default function AppSidebar({
  activeTab, setActiveTab,
  sidebarOpen, t,
  isOfflineMode, setIsOfflineMode,
  offlineQueue, onOpenOfflineModal
}) {
  const sections = [
    {
      title: 'Clinical Workspace',
      items: [
        { id: 'patients', label: t.navPatients, icon: Users },
        { id: 'cross-hospital', label: t.navCrossHospitalOtp, icon: KeyRound, badge: 'OTP', badgeColor: 'bg-indigo-600 text-white' },
        { id: 'ai-hub', label: t.navAiHub, icon: Sparkles, badge: 'AI', badgeColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white animate-pulse' },
        { id: 'timeline', label: t.navClinicalTimeline, icon: Activity },
        { id: 'surgeries', label: t.navSurgeries, icon: Hospital },
        { id: 'admissions', label: t.navAdmissions, icon: Bed }
      ]
    },
    {
      title: 'Care Continuity',
      items: [
        { id: 'referrals', label: t.navReferrals, icon: Share2 },
        { id: 'appointments', label: t.navAppointments, icon: Calendar },
        { id: 'maternal-child', label: t.navMaternalChild, icon: Baby }
      ]
    },
    {
      title: 'Hospital Services',
      items: [
        { id: 'pharmacy', label: t.navPharmacy, icon: Pill },
        { id: 'diagnostics', label: t.navDiagnostics, icon: FlaskConical },
        { id: 'blood-bank', label: 'Emergency Blood Bank', icon: Droplets, badge: 'GRID', badgeColor: 'bg-rose-600 text-white animate-pulse' }
      ]
    },
    {
      title: 'Governance & Analytics',
      items: [
        { id: 'duplicates', label: t.navDuplicateQueue, icon: ShieldAlert, alertBadge: true },
        { id: 'audit', label: t.navAudit, icon: Shield },
        { id: 'analytics', label: t.navAnalytics, icon: BarChart3 },
        { id: 'hospital-network', label: 'Hospital Network', icon: Network, badge: 'NEW', badgeColor: 'bg-sky-600 text-white' },
        { id: 'patient-portal', label: t.navPatientPortal, icon: FileText }
      ]
    }
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 z-20 ${
        sidebarOpen ? 'w-60' : 'w-16'
      }`}
    >
      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {sidebarOpen && (
              <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </h4>
            )}

            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isAi = item.id === 'ai-hub';
                const isOtp = item.id === 'cross-hospital';

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition relative group cursor-pointer ${
                      isActive
                        ? isAi
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md'
                          : isOtp
                          ? 'bg-indigo-600 text-white font-bold shadow-md'
                          : 'bg-sky-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-white'
                        : isAi
                        ? 'text-purple-400'
                        : isOtp
                        ? 'text-indigo-400'
                        : 'text-slate-400 group-hover:text-white'
                    }`} />

                    {sidebarOpen && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {sidebarOpen && item.badge && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                        {item.badge}
                      </span>
                    )}

                    {item.alertBadge && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Offline Resilience Widget */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/70 text-[11px] shrink-0">
        {sidebarOpen ? (
          <div className="space-y-2 p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Spine Connectivity</span>
              <button
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  isOfflineMode ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {isOfflineMode ? <WifiOff className="w-3 h-3 text-amber-400" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
                <span>{isOfflineMode ? 'Offline Mode' : 'Online'}</span>
              </button>
            </div>

            {isOfflineMode && (
              <button
                onClick={onOpenOfflineModal}
                className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Capture Offline Visit</span>
              </button>
            )}

            <p className="text-[9px] text-slate-400 text-center pt-1 border-t border-slate-800/80">
              NPDMS v2.4 • Fayda ID Ready
            </p>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? 'Offline Mode Active' : 'Spine Online'}
              className={`w-3 h-3 rounded-full cursor-pointer ${isOfflineMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}
            ></span>
          </div>
        )}
      </div>
    </aside>
  );
}
