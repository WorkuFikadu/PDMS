// frontend/src/components/AdminDashboard.jsx
// NPDMS — Full System Governance & Master Control Panel
import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, BarChart3, ShieldAlert, Users, Building2, Shield,
  Activity, Pill, FlaskConical, Bed, Share2, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Plus, Edit3, Power,
  Wifi, WifiOff, Server, Database, Clock, TrendingUp,
  Eye, ChevronDown, ChevronRight, Download, Search,
  UserCheck, UserX, Stethoscope, Lock, Unlock, Globe,
  AlertOctagon, Terminal, HardDrive, Cpu, Package,
  Bell, KeyRound, FileDown, Droplets, MapPin, Hash, Check,
  Smartphone, Send, MessageSquare
} from 'lucide-react';
import { apiFetch, PRODUCTION_BACKEND_URL } from '../api';

// ─── Utility helpers ────────────────────────────────────────────
const ago = (dt) => {
  if (!dt) return '—';
  const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const fmtBytes = (b) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const ACTION_COLORS = {
  BREAK_GLASS: 'bg-red-100 text-red-700 border-red-200',
  CREATE_PATIENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CREATE_USER: 'bg-sky-100 text-sky-700 border-sky-200',
  CREATE_FACILITY: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  USER_LOGIN: 'bg-blue-100 text-blue-700 border-blue-200',
  EXPORT_FHIR: 'bg-violet-100 text-violet-700 border-violet-200',
  EXPORT_CSV: 'bg-teal-100 text-teal-700 border-teal-200',
  DEACTIVATE_USER: 'bg-orange-100 text-orange-700 border-orange-200',
  RESET_PASSWORD: 'bg-amber-100 text-amber-700 border-amber-200',
  UPDATE_FACILITY: 'bg-amber-100 text-amber-700 border-amber-200',
  DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200',
};

const actionBadge = (action) => {
  const cls = ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {action}
    </span>
  );
};

const ROLE_COLORS = {
  SYSTEM_ADMIN: 'bg-red-600',
  FACILITY_ADMIN: 'bg-orange-500',
  DOCTOR: 'bg-sky-600',
  NURSE: 'bg-teal-600',
  PHARMACIST: 'bg-violet-600',
  LAB_TECH: 'bg-amber-600',
  REGISTRATION_OFFICER: 'bg-emerald-600',
  PATIENT: 'bg-slate-500',
};

const roleBadge = (role) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${ROLE_COLORS[role] || 'bg-slate-500'}`}>
    {role?.replace(/_/g, ' ')}
  </span>
);

// ─── KPI Card ───────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'text-sky-600', alert = false }) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col gap-2 relative overflow-hidden ${alert ? 'border-amber-300 shadow-amber-100' : 'border-slate-200'}`}>
      {alert && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-semibold text-slate-500 leading-tight pr-4">{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      </div>
      <div className="text-2xl font-black text-slate-900">{value ?? '—'}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

// ─── Mini Bar ────────────────────────────────────────────────────
function MiniBar({ label, value, max, color = 'bg-sky-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-600 font-medium truncate pr-2">{label}</span>
        <span className="text-slate-800 font-bold shrink-0">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────
function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-sky-600" />
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',         icon: BarChart3 },
  { id: 'alerts',     label: 'System Alerts',    icon: Bell },
  { id: 'security',   label: '🛡️ Cyber Defense', icon: ShieldAlert },
  { id: 'sms',        label: '📱 SMS Gateway',   icon: Smartphone },
  { id: 'facilities', label: 'Facilities',        icon: Building2 },
  { id: 'users',      label: 'Staff & Users',     icon: Users },
  { id: 'activity',   label: 'Activity Monitor',  icon: Eye },
  { id: 'audit',      label: 'Audit Log',         icon: Shield },
  { id: 'export',     label: 'Data Export',        icon: FileDown },
  { id: 'health',     label: 'System Health',     icon: Server },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function AdminDashboard({ currentUser, t }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const AUDIT_LIMIT = 20;

  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', role: 'DOCTOR', facility_id: '', email: '', phone: '', professional_id: '' });

  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: '', code: '', type: 'GENERAL_HOSPITAL', region: 'Oromia', zone: 'Jimma Zone', woreda: '', phone: '', email: '', bed_capacity: 200, director_name: ''
  });

  const [resetPassResult, setResetPassResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Cyber Defense Sentinel State
  const [securityOverview, setSecurityOverview] = useState(null);
  const [securityThreats, setSecurityThreats] = useState([]);
  const [simulating, setSimulating] = useState(false);

  // SMS Gateway State
  const [smsData, setSmsData] = useState(null);
  const [smsTypeFilter, setSmsTypeFilter] = useState('');
  const [testPhone, setTestPhone] = useState('+251911234567');
  const [testMessage, setTestMessage] = useState('NPDMS Security Notification: System broadcast via Ethio Telecom/AfricasTalking Gateway.');
  const [sendingSms, setSendingSms] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Fetch overview ────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch('/api/admin/overview');
      const data = await res.json();
      setOverview(data);
    } catch (e) { console.error(e); }
    setRefreshing(false);
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: AUDIT_LIMIT, offset: auditPage * AUDIT_LIMIT });
      if (auditAction) params.append('action', auditAction);
      const res = await apiFetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
      setAuditTotal(data.total || 0);
    } catch (e) { console.error(e); }
  }, [auditAction, auditPage]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/system-health');
      const data = await res.json();
      setHealth(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRecentLogins = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/recent-logins');
      const data = await res.json();
      setRecentLogins(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, []);

  // ── Cyber Defense Sentinel Fetchers ──────────────────────────
  const fetchSecurityOverview = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/security/overview');
      const data = await res.json();
      setSecurityOverview(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchSecurityThreats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/security/threats?limit=30');
      const data = await res.json();
      setSecurityThreats(data.threats || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchSmsLogs = useCallback(async () => {
    try {
      const url = smsTypeFilter ? `/api/admin/sms/logs?type=${smsTypeFilter}&limit=50` : '/api/admin/sms/logs?limit=50';
      const res = await apiFetch(url);
      const data = await res.json();
      setSmsData(data);
    } catch (e) { console.error(e); }
  }, [smsTypeFilter]);

  const handleSendTestSms = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) return;
    setSendingSms(true);
    try {
      const res = await apiFetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, message: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📱 SMS dispatched to ${testPhone} (Status: ${data.status})`);
        fetchSmsLogs();
      } else {
        showToast(`❌ SMS delivery failed: ${data.error || 'Check gateway configuration'}`);
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
    setSendingSms(false);
  };

  const simulateAttack = async (attackType) => {
    setSimulating(true);
    try {
      const res = await apiFetch('/api/admin/security/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: attackType })
      });
      const data = await res.json();
      showToast(`🛡️ Attack intercepted: ${data.incident_id} — ${data.threat_type}`);
      fetchSecurityOverview();
      fetchSecurityThreats();
      fetchAlerts();
    } catch (e) { showToast('Simulation error.'); }
    setSimulating(false);
  };

  const unbanIP = async (ip) => {
    try {
      await apiFetch('/api/admin/security/unban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      showToast(`IP ${ip} released from quarantine.`);
      fetchSecurityOverview();
    } catch (e) { showToast('Error releasing IP.'); }
  };

  const loadAll = () => {
    fetchOverview();
    fetchUsers();
    fetchAudit();
    fetchHealth();
    fetchAlerts();
    fetchRecentLogins();
    fetchSecurityOverview();
    fetchSecurityThreats();
    fetchSmsLogs();
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { fetchAudit(); }, [fetchAudit]);
  useEffect(() => { if (activeTab === 'sms') fetchSmsLogs(); }, [fetchSmsLogs, activeTab]);

  // ── Toggle user active ────────────────────────────────────────
  const toggleUser = async (user) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active })
      });
      showToast(`${user.full_name} ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (e) { showToast('Error updating user.'); }
  };

  // ── Reset user password ──────────────────────────────────────
  const handleResetPassword = async (user) => {
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/reset-password`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        setResetPassResult({ user: user.full_name, pass: data.temporary_password });
      } else {
        showToast(data.error || 'Failed to reset password.');
      }
    } catch (e) { showToast('Error resetting password.'); }
  };

  // ── Toggle facility ───────────────────────────────────────────
  const toggleFacility = async (fac) => {
    try {
      await apiFetch(`/api/admin/facilities/${fac.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !fac.is_active })
      });
      showToast(`${fac.name} ${fac.is_active ? 'disconnected from' : 'reconnected to'} the NPDMS Network.`);
      fetchOverview();
    } catch (e) { showToast('Error updating facility.'); }
  };

  // ── Toggle facility Fayda connection ─────────────────────────
  const toggleFayda = async (fac) => {
    try {
      await apiFetch(`/api/admin/facilities/${fac.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fayda_connected: !fac.fayda_connected })
      });
      showToast(`Fayda connection for ${fac.name} ${fac.fayda_connected ? 'suspended' : 'restored'}.`);
      fetchOverview();
    } catch (e) { showToast('Error updating facility.'); }
  };

  // ── Create user ───────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Staff account created.');
        setShowAddUser(false);
        setNewUser({ username: '', full_name: '', role: 'DOCTOR', facility_id: '', email: '', phone: '', professional_id: '' });
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to create user.');
      }
    } catch (e) { showToast('Network error.'); }
    setSaving(false);
  };

  // ── Register Facility ─────────────────────────────────────────
  const handleAddFacility = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/admin/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFacility)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Healthcare Facility registered.');
        setShowAddFacility(false);
        setNewFacility({ name: '', code: '', type: 'GENERAL_HOSPITAL', region: 'Oromia', zone: 'Jimma Zone', woreda: '', phone: '', email: '', bed_capacity: 200, director_name: '' });
        fetchOverview();
      } else {
        showToast(data.error || 'Failed to register facility.');
      }
    } catch (e) { showToast('Network error.'); }
    setSaving(false);
  };

  const facilities = overview?.facilities || [];
  const kpis = overview?.kpis || {};
  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const criticalAlertsCount = alerts.filter(a => a.severity === 'CRITICAL').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
        <span className="text-sm font-medium">Loading Admin Control Panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* ── Temporary Password Modal ── */}
      {resetPassResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <KeyRound className="w-5 h-5" />
              Password Reset Successful
            </div>
            <p className="text-xs text-slate-600">
              A temporary password has been issued for <span className="font-bold text-slate-900">{resetPassResult.user}</span>:
            </p>
            <div className="bg-slate-100 p-3 rounded-xl text-center font-mono text-base font-black tracking-wider text-slate-900 border border-slate-200 select-all">
              {resetPassResult.pass}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Provide this code securely to the clinician. They will be prompted to change it upon login.
            </p>
            <button
              onClick={() => setResetPassResult(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl p-5 flex items-start justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-black tracking-tight">System Governance & Admin Panel</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider">
              National Health Spine Command
            </span>
            {criticalAlertsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                {criticalAlertsCount} Critical Alert{criticalAlertsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Federal Democratic Republic of Ethiopia • Ministry of Health (MOH) • Inter-hospital governance, user management, and audit telemetry.
          </p>
          {currentUser && (
            <p className="text-[11px] text-sky-400 mt-1 font-semibold">
              Authenticated Session: {currentUser.full_name} · {currentUser.role?.replace(/_/g, ' ')} · {currentUser.facility_name}
            </p>
          )}
        </div>
        <button
          onClick={() => { setLoading(true); loadAll(); }}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition shrink-0 mt-0.5"
          title="Refresh All Governance Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isAlertTab = tab.id === 'alerts';
          const hasCritical = isAlertTab && criticalAlertsCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 cursor-pointer relative ${
                activeTab === tab.id ? 'bg-white text-sky-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${hasCritical ? 'text-rose-600 animate-pulse' : ''}`} />
              <span>{tab.label}</span>
              {hasCritical && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <KpiCard icon={Users} label="Total Registered Patients" value={kpis.totalPatients} sub={`${kpis.faydaRate}% Fayda linked`} color="text-sky-600" />
            <KpiCard icon={Activity} label="All Encounters" value={kpis.totalEncounters} sub="Cross-facility" color="text-indigo-600" />
            <KpiCard icon={Bed} label="Active Inpatients" value={kpis.activeAdmissions} color="text-teal-600" />
            <KpiCard icon={Share2} label="Pending Referrals" value={kpis.pendingReferrals} color="text-orange-500" alert={kpis.pendingReferrals > 0} />
            <KpiCard icon={Pill} label="Active Prescriptions" value={kpis.activeRx} color="text-violet-600" />
            <KpiCard icon={FlaskConical} label="Pending Lab Orders" value={kpis.pendingLabs} color="text-amber-600" alert={kpis.pendingLabs > 0} />
            <KpiCard icon={ShieldAlert} label="Pending Duplicates" value={kpis.pendingDups} color="text-amber-600" alert={kpis.pendingDups > 0} />
            <KpiCard icon={AlertOctagon} label="Break-Glass Events" value={kpis.breakGlassCount} color="text-red-600" alert={kpis.breakGlassCount > 0} />
            <KpiCard icon={Users} label="Total Active Staff" value={kpis.totalStaff} color="text-sky-600" />
            <KpiCard icon={Building2} label="Connected Facilities" value={kpis.totalFacilities} color="text-emerald-600" />
            <KpiCard icon={Shield} label="Audit Events Today" value={kpis.auditEventsToday} color="text-indigo-600" />
            <KpiCard icon={CheckCircle2} label="Fayda Digital ID Rate" value={`${kpis.faydaRate}%`} sub={`${kpis.faydaVerified} of ${kpis.totalPatients}`} color="text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Diagnoses */}
            <Section title="Top ICD-10 Diagnoses Nationally" icon={Stethoscope}>
              <div className="space-y-3">
                {(overview?.topDiagnoses || []).map((d, i) => (
                  <MiniBar
                    key={d.icd10_code}
                    label={`${d.icd10_code} · ${d.condition_name}`}
                    value={d.count}
                    max={overview?.topDiagnoses?.[0]?.count || 1}
                    color={['bg-sky-500','bg-indigo-500','bg-violet-500','bg-teal-500','bg-orange-500','bg-rose-500','bg-amber-500','bg-emerald-500'][i % 8]}
                  />
                ))}
                {(overview?.topDiagnoses || []).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No diagnosis data yet.</p>}
              </div>
            </Section>

            {/* Staff by Role */}
            <Section title="National Workforce Distribution" icon={Users}>
              <div className="space-y-3">
                {(overview?.staffByRole || []).map(r => (
                  <MiniBar
                    key={r.role}
                    label={r.role.replace(/_/g, ' ')}
                    value={r.count}
                    max={overview?.staffByRole?.[0]?.count || 1}
                    color={ROLE_COLORS[r.role] || 'bg-slate-400'}
                  />
                ))}
              </div>
            </Section>

            {/* Encounter Types */}
            <Section title="Encounter Volume by Type" icon={Activity}>
              <div className="space-y-3">
                {(overview?.encountersByType || []).map((e, i) => (
                  <MiniBar
                    key={e.encounter_type}
                    label={e.encounter_type?.replace(/_/g, ' ')}
                    value={e.count}
                    max={overview?.encountersByType?.[0]?.count || 1}
                    color={['bg-sky-500','bg-indigo-500','bg-teal-500','bg-orange-500'][i % 4]}
                  />
                ))}
              </div>
            </Section>

            {/* Referral Status */}
            <Section title="Referral Pipeline Status" icon={Share2}>
              <div className="space-y-3">
                {(overview?.referralsByStatus || []).map((r, i) => (
                  <MiniBar
                    key={r.status}
                    label={r.status}
                    value={r.count}
                    max={overview?.referralsByStatus?.[0]?.count || 1}
                    color={['bg-amber-500','bg-sky-500','bg-emerald-500','bg-violet-500','bg-rose-500'][i % 5]}
                  />
                ))}
              </div>
            </Section>
          </div>

          {/* Recent Audit Activity */}
          <Section title="Recent Security & Audit Events" icon={Shield}
            action={
              <button onClick={() => setActiveTab('audit')} className="text-[11px] text-sky-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                View Full Log <ChevronRight className="w-3 h-3" />
              </button>
            }
          >
            <div className="space-y-2">
              {(overview?.recentAudit || []).map(log => (
                <div key={log.id} className="flex items-center gap-3 text-[11px] py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 shrink-0 w-16 text-right">{ago(log.created_at)}</span>
                  {actionBadge(log.action)}
                  <span className="text-slate-600 font-medium truncate flex-1">{log.user_name}</span>
                  <span className="text-slate-400 truncate max-w-[100px]">{log.facility_id}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: SYSTEM ALERTS & SURVEILLANCE
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-600" />
                System Surveillance & Active Clinical Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Real-time automated safety sentinel monitoring cross-hospital security, inventory, and pending clinical tasks.
              </p>
            </div>
            <button
              onClick={fetchAlerts}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {alerts.map((al, idx) => {
              const isCrit = al.severity === 'CRITICAL';
              const isWarn = al.severity === 'WARNING';
              const isInfo = al.severity === 'INFO';
              const isOk = al.severity === 'OK';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition shadow-xs ${
                    isCrit ? 'bg-rose-50/80 border-rose-300' :
                    isWarn ? 'bg-amber-50/80 border-amber-300' :
                    isInfo ? 'bg-sky-50/80 border-sky-200' :
                    'bg-emerald-50/80 border-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isCrit ? 'bg-rose-600 text-white animate-pulse' :
                      isWarn ? 'bg-amber-500 text-white' :
                      isInfo ? 'bg-sky-600 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {isCrit ? <AlertOctagon className="w-5 h-5" /> :
                       isWarn ? <AlertTriangle className="w-5 h-5" /> :
                       isInfo ? <Activity className="w-5 h-5" /> :
                       <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{al.title}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                          isCrit ? 'bg-rose-200 text-rose-800' :
                          isWarn ? 'bg-amber-200 text-amber-800' :
                          isInfo ? 'bg-sky-200 text-sky-800' :
                          'bg-emerald-200 text-emerald-800'
                        }`}>
                          {al.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{al.description}</p>
                    </div>
                  </div>

                  {al.type === 'BREAK_GLASS' && (
                    <button
                      onClick={() => { setAuditAction('BREAK_GLASS'); setActiveTab('audit'); }}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      Audit Trail →
                    </button>
                  )}
                  {al.type === 'DUPLICATE' && (
                    <button
                      onClick={() => showToast('Redirecting to Duplicate Queue review...')}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      Resolve Duplicates
                    </button>
                  )}
                  {al.type === 'BLOOD_BANK' && (
                    <button
                      onClick={() => showToast('Emergency blood dispatch protocol initiated.')}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      Dispatch Blood
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: FACILITIES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'facilities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                {facilities.length} Healthcare Facilities in NPDMS Spine Network
              </h2>
              <p className="text-xs text-slate-500">
                Connected referral, regional, and primary hospitals across Ethiopia with interoperable EHR sharing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddFacility(true)}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Register Facility
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {facilities.map(fac => (
              <div key={fac.id} className={`bg-white rounded-xl border shadow-xs p-4 space-y-3 transition ${fac.is_active ? 'border-slate-200' : 'border-red-200 opacity-70'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className={`w-3.5 h-3.5 ${fac.is_active ? 'text-sky-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900 leading-tight">{fac.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{fac.code} · {fac.region}</span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${fac.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {fac.is_active ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>

                {/* Type tag */}
                <div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium">
                    {fac.type?.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: fac.patient_count, l: 'Patients' },
                    { v: fac.staff_count, l: 'Staff' },
                    { v: fac.active_admissions, l: 'Admitted' },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-50 rounded-lg py-2">
                      <div className="text-sm font-black text-slate-900">{s.v}</div>
                      <div className="text-[10px] text-slate-500">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Connectivity badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${fac.fayda_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {fac.fayda_connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                    Fayda
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${fac.nhdis_connected ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                    {fac.nhdis_connected ? <Globe className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                    NHDIS Spine
                  </span>
                  {fac.bed_capacity > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      <Bed className="w-2.5 h-2.5" /> {fac.bed_capacity} Beds
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => toggleFacility(fac)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      fac.is_active
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {fac.is_active ? 'Disconnect' : 'Connect'}
                  </button>
                  <button
                    onClick={() => toggleFayda(fac)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      fac.fayda_connected
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                    }`}
                  >
                    {fac.fayda_connected ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                    {fac.fayda_connected ? 'Revoke Fayda' : 'Enable Fayda'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: USERS / STAFF
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, username, role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Staff Account
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex gap-2 flex-wrap text-xs text-slate-600">
            {Object.entries(
              filteredUsers.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
            ).map(([role, count]) => (
              <span key={role} className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                <span className={`w-2 h-2 rounded-full ${ROLE_COLORS[role] || 'bg-slate-400'}`} />
                {role.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>

          {/* Users table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Name', 'Username', 'Role', 'Facility', 'Contact', 'Status', 'Security Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        {u.professional_id && <div className="text-[10px] text-slate-400 font-mono">ID: {u.professional_id}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{u.username}</td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium">{u.facility_name || '—'}</div>
                        {u.facility_code && <div className="text-[10px] text-slate-400">{u.facility_code}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {u.email && <div className="text-slate-500">{u.email}</div>}
                        {u.phone && <div className="text-slate-500">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.is_active ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleUser(u)}
                            title={u.is_active ? 'Suspend staff account' : 'Reactivate account'}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                              u.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            {u.is_active ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Reset clinician password and issue temporary OTP"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200 cursor-pointer"
                          >
                            <KeyRound className="w-2.5 h-2.5" />
                            Reset Pass
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-400 text-xs">No staff accounts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: ACTIVITY MONITOR (Recent Logins)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                Live Practitioner Session & Login Telemetry
              </h2>
              <p className="text-xs text-slate-500">
                Live stream of clinician logins across Jimma Medical Center, Tikur Anbessa, and all connected hospitals.
              </p>
            </div>
            <button
              onClick={fetchRecentLogins}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Feed
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Timestamp', 'Clinician / User', 'Department Role', 'Facility', 'IP Address', 'Authentication Detail'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLogins.map((lg, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-4 py-2.5 text-slate-400 font-mono whitespace-nowrap">{ago(lg.created_at)}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{lg.user_name}</td>
                      <td className="px-4 py-2.5">{roleBadge(lg.user_role)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-600">{lg.facility_id}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{lg.ip_address || '127.0.0.1'}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px] truncate max-w-xs">{lg.justification || 'Standard session authorization'}</td>
                    </tr>
                  ))}
                  {recentLogins.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400 text-xs">No recent login records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 6: AUDIT LOG
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-3">
            <Shield className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Filter:</span>
            <select
              value={auditAction}
              onChange={e => { setAuditAction(e.target.value); setAuditPage(0); }}
              className="border border-slate-200 rounded-lg text-xs px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">All Actions</option>
              {['USER_LOGIN','CREATE_PATIENT','CREATE_ENCOUNTER','PRESCRIBE_MED','DISPENSE_MED','PUBLISH_LAB','CREATE_REFERRAL','BREAK_GLASS','EXPORT_FHIR','EXPORT_CSV','CREATE_USER','DEACTIVATE_USER','RESET_PASSWORD','CREATE_FACILITY','UPDATE_FACILITY','FAYDA_OTP_LOGIN'].map(a => (
                <option key={a} value={a}>{a.replace(/_/g,' ')}</option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 ml-auto">{auditTotal} total events</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Time', 'Action', 'User', 'Role', 'Facility', 'Patient', 'Resource', 'Justification'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{ago(log.created_at)}</td>
                      <td className="px-4 py-2.5">{actionBadge(log.action)}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{log.user_name}</td>
                      <td className="px-4 py-2.5">{roleBadge(log.user_role)}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px]">{log.facility_id || '—'}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-slate-500">{log.patient_id || '—'}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">{log.resource_type}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-500 truncate max-w-xs">{log.justification || '—'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-400 text-xs">No audit events found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                disabled={auditPage === 0}
                className="text-xs font-semibold text-sky-600 disabled:text-slate-300 hover:underline cursor-pointer"
              >← Previous</button>
              <span className="text-[11px] text-slate-400">
                Page {auditPage + 1} of {Math.max(1, Math.ceil(auditTotal / AUDIT_LIMIT))}
              </span>
              <button
                onClick={() => setAuditPage(p => p + 1)}
                disabled={(auditPage + 1) * AUDIT_LIMIT >= auditTotal}
                className="text-xs font-semibold text-sky-600 disabled:text-slate-300 hover:underline cursor-pointer"
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 7: DATA EXPORT CENTER
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'export' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-sky-600" />
              National Health Data Export & Backup Center
            </h2>
            <p className="text-xs text-slate-500">
              Export system registries, statutory audit archives, and staff directories in standard CSV formats for Ministry of Health reporting and offline archiving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Export 1: Patients */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">National Patient Registry</h3>
                <p className="text-xs text-slate-500">
                  Full demographic export including NPDMS IDs, Fayda FINs, dates of birth, regional residences, and blood groups.
                </p>
              </div>
              <a
                href="/api/admin/export/patients"
                download
                className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export Patients (.CSV)
              </a>
            </div>

            {/* Export 2: Audit Logs */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Tamper-Evident Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Compliance export of all record accesses, break-glass events, logins, and clinician justifications per FDRE Proclamation No. 1110/2019.
                </p>
              </div>
              <a
                href="/api/admin/export/audit"
                download
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export Audit Logs (.CSV)
              </a>
            </div>

            {/* Export 3: Staff */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Staff & Clinician Directory</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive roster of practicing physicians, nurses, laboratory technicians, and administrators across all 20 network hospitals.
                </p>
              </div>
              <a
                href="/api/admin/export/staff"
                download
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export Staff Directory (.CSV)
              </a>
            </div>

            {/* Export 4: DHIS2 JSON */}
            <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">DHIS2 / NHDIS Aggregate Export</h3>
                <p className="text-xs text-slate-500">
                  Exports patient counts, encounter volumes, and regional health indicators in DHIS2 ADX v2.4 format for submission to National Health Data and Information System.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href="/api/admin/export/dhis2"
                  download={`NPDMS_DHIS2_Export_${new Date().toISOString().slice(0,7)}.json`}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export DHIS2 Payload (.JSON)
                </a>
                <a
                  href="/api/admin/export/dhis2/csv"
                  download={`NPDMS_DHIS2_Export_${new Date().toISOString().slice(0,7)}.csv`}
                  className="w-full py-2 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export DHIS2 Importer (.CSV)
                </a>
              </div>
            </div>

            {/* Export 5: Database Status */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Database Migration Status</h3>
                <p className="text-xs text-slate-500">
                  Check database engine mode (SQLite local dev vs PostgreSQL production). Set <code className="bg-slate-100 px-1 rounded">DATABASE_URL</code> in Vercel to activate Neon/Supabase production database.
                </p>
              </div>
              <a
                href="/api/admin/database/status"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Server className="w-3.5 h-3.5" />
                View DB Engine Status
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 8: SYSTEM HEALTH
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          {!health ? (
            <div className="text-center py-16 text-slate-400 text-xs">Loading system health...</div>
          ) : (
            <>
              {/* Runtime summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icon={Server} label="Service Status" value={health.status} sub="NPDMS Health Spine" color="text-emerald-600" />
                <KpiCard icon={Clock} label="Uptime" value={`${Math.floor(health.uptime_seconds / 60)}m`} sub={`Node.js ${health.node_version}`} color="text-sky-600" />
                <KpiCard icon={Cpu} label="Memory Usage" value={`${health.memory_mb} MB`} sub="Heap used" color="text-indigo-600" />
                <KpiCard icon={HardDrive} label="Database Size" value={fmtBytes(health.db_size_bytes)} sub="SQLite WAL" color="text-amber-600" />
              </div>

              {/* Table row counts */}
              <Section title="Database Table Statistics" icon={Database}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(health.tableStats || []).map(ts => (
                    <div key={ts.table} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-slate-900">{ts.rows.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{ts.table}</div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Environment info */}
              <Section title="Runtime Environment" icon={Terminal}>
                <div className="space-y-2 text-xs">
                  {[
                    ['Service', 'Ethiopian NPDMS Health Spine API'],
                    ['Node.js Version', health.node_version],
                    ['Database Engine', 'SQLite (native node:sqlite WAL mode)'],
                    ['Interoperability', 'HL7 FHIR R4 — JSON Bundle Export'],
                    ['Authentication', 'JWT + Fayda FIN OTP + Biometric Simulation'],
                    ['Deployment Target', process.env.VERCEL ? 'Vercel Serverless' : 'Local Node.js Engine'],
                    ['Last Telemetry Check', new Date(health.timestamp).toLocaleString()],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                      <span className="font-semibold text-slate-500 w-44 shrink-0">{k}</span>
                      <span className="text-slate-800 font-mono text-[11px]">{v}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: NATIONAL CYBER DEFENSE SENTINEL
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          {!securityOverview ? (
            <div className="text-center py-16 text-slate-400 text-xs">Loading Cyber Defense telemetry...</div>
          ) : (
            <>
              {/* Shield Status Header */}
              <div className={`rounded-2xl border-2 p-5 ${
                securityOverview.threat_level === 'DEFCON_1_OPTIMAL' ? 'bg-emerald-50 border-emerald-300' :
                securityOverview.threat_level === 'WARNING' ? 'bg-amber-50 border-amber-300' :
                'bg-red-50 border-red-400'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${
                      securityOverview.threat_level === 'DEFCON_1_OPTIMAL' ? 'bg-emerald-600 text-white' :
                      securityOverview.threat_level === 'WARNING' ? 'bg-amber-500 text-white' :
                      'bg-red-600 text-white animate-pulse'
                    }`}>
                      🛡️
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">National Cyber Defense Sentinel</h2>
                      <p className="text-xs text-slate-600">Ethiopian National Patient Data — Threat Intelligence & Active Protection Shield</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black ${
                          securityOverview.threat_level === 'DEFCON_1_OPTIMAL' ? 'bg-emerald-600 text-white' :
                          securityOverview.threat_level === 'WARNING' ? 'bg-amber-500 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {securityOverview.threat_level === 'DEFCON_1_OPTIMAL' ? '✅ ALL CLEAR' : securityOverview.threat_level === 'WARNING' ? '⚠️ WARNING' : '🚨 ELEVATED'}
                        </span>
                        <span className="text-xs font-bold text-slate-700">Security Score: <span className="text-lg font-black">{securityOverview.security_score}%</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900">{securityOverview.total_threats_blocked}</div>
                    <div className="text-[11px] text-slate-500 font-semibold">Total Threats Blocked</div>
                    <div className="text-lg font-black text-red-600 mt-1">{securityOverview.threats_blocked_24h}</div>
                    <div className="text-[11px] text-slate-500">Last 24h</div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icon={ShieldAlert} label="Threats Blocked (24h)" value={securityOverview.threats_blocked_24h} sub="Attacks intercepted" color="text-red-600" alert={securityOverview.threats_blocked_24h > 0} />
                <KpiCard icon={Lock} label="Quarantined IPs" value={securityOverview.quarantined_count} sub="Active IP bans" color="text-amber-600" />
                <KpiCard icon={Shield} label="Active Defenses" value={securityOverview.active_defenses?.length || 0} sub="Security modules" color="text-emerald-600" />
                <KpiCard icon={AlertOctagon} label="Critical Threats" value={securityOverview.critical_threats} sub="High-severity incidents" color="text-rose-600" alert={securityOverview.critical_threats > 0} />
              </div>

              {/* Active Defense Modules */}
              <Section title="Active Security Modules" icon={Shield}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(securityOverview.active_defenses || []).map((def, i) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-800">{def.name}</div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">{def.description}</div>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-200 text-[9px] font-black text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {def.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Threat Breakdown by Type */}
              {securityOverview.by_type && securityOverview.by_type.length > 0 && (
                <Section title="Threat Breakdown by Type" icon={AlertTriangle}>
                  <div className="space-y-2">
                    {securityOverview.by_type.map((t, i) => (
                      <MiniBar key={i} label={t.threat_type?.replace(/_/g, ' ')} value={t.count} max={Math.max(...securityOverview.by_type.map(x => x.count))} color={
                        t.threat_type === 'SQL_INJECTION' ? 'bg-red-500' :
                        t.threat_type === 'XSS_PAYLOAD' ? 'bg-orange-500' :
                        t.threat_type === 'BRUTE_FORCE' ? 'bg-amber-500' :
                        t.threat_type === 'PATH_TRAVERSAL' ? 'bg-purple-500' :
                        'bg-slate-500'
                      } />
                    ))}
                  </div>
                </Section>
              )}

              {/* Quarantined IPs */}
              {securityOverview.quarantined_ips && securityOverview.quarantined_ips.length > 0 && (
                <Section title={`Quarantined IP Addresses (${securityOverview.quarantined_ips.length})`} icon={Lock}>
                  <div className="space-y-2">
                    {securityOverview.quarantined_ips.map((q, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                        <div>
                          <span className="font-mono text-sm font-bold text-red-800">{q.ip}</span>
                          <span className="ml-3 text-[11px] text-red-600">Expires in {q.expires_in_seconds}s</span>
                        </div>
                        <button
                          onClick={() => unbanIP(q.ip)}
                          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          <Unlock className="w-3 h-3 inline mr-1" /> Release
                        </button>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recent Threat Log */}
              <Section title="Recent Threat Interception Log" icon={Eye}>
                {securityThreats.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No threats intercepted yet. System is fully secure.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[10px] font-bold text-slate-500 uppercase">
                          <th className="px-3 py-2">Incident</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Severity</th>
                          <th className="px-3 py-2">Source IP</th>
                          <th className="px-3 py-2">Endpoint</th>
                          <th className="px-3 py-2">Action</th>
                          <th className="px-3 py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {securityThreats.map((t, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-[10px] text-slate-700">{t.id}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black ${
                                t.threat_type === 'SQL_INJECTION' ? 'bg-red-100 text-red-700' :
                                t.threat_type === 'XSS_PAYLOAD' ? 'bg-orange-100 text-orange-700' :
                                t.threat_type === 'BRUTE_FORCE_ATTACK' ? 'bg-amber-100 text-amber-700' :
                                t.threat_type === 'PATH_TRAVERSAL' ? 'bg-purple-100 text-purple-700' :
                                t.threat_type === 'COMMAND_INJECTION' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>{t.threat_type?.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black ${
                                t.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                t.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                'bg-amber-200 text-amber-800'
                              }`}>{t.severity}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px]">{t.source_ip}</td>
                            <td className="px-3 py-2 font-mono text-[10px] text-slate-600 max-w-[200px] truncate">{t.method} {t.endpoint}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">{t.action_taken}</span>
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-500">{ago(t.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* Attack Simulation Panel — Governance Testing */}
              <Section title="🧪 Attack Simulation — Governance Penetration Test" icon={Terminal}>
                <p className="text-xs text-slate-600 mb-4">
                  Simulate real-world cyber attacks to verify that the National Cyber Defense Sentinel is actively protecting patient data. Each simulation fires a controlled test payload and validates the detection → interception → alert pipeline.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { type: 'SQL_INJECTION', label: 'SQL Injection', emoji: '💉', color: 'bg-red-600 hover:bg-red-700' },
                    { type: 'XSS_PAYLOAD', label: 'XSS Attack', emoji: '🕷️', color: 'bg-orange-600 hover:bg-orange-700' },
                    { type: 'PATH_TRAVERSAL', label: 'Path Traversal', emoji: '📂', color: 'bg-purple-600 hover:bg-purple-700' },
                    { type: 'COMMAND_INJECTION', label: 'CMD Injection', emoji: '⚡', color: 'bg-rose-600 hover:bg-rose-700' },
                    { type: 'BRUTE_FORCE', label: 'Brute Force', emoji: '🔑', color: 'bg-amber-600 hover:bg-amber-700' },
                    { type: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized', emoji: '🚫', color: 'bg-slate-700 hover:bg-slate-800' },
                  ].map(sim => (
                    <button
                      key={sim.type}
                      onClick={() => simulateAttack(sim.type)}
                      disabled={simulating}
                      className={`${sim.color} text-white rounded-xl py-3 px-2 text-center transition cursor-pointer disabled:opacity-50 shadow-sm`}
                    >
                      <div className="text-xl mb-1">{sim.emoji}</div>
                      <div className="text-[10px] font-bold leading-tight">{sim.label}</div>
                    </button>
                  ))}
                </div>
                {simulating && (
                  <div className="mt-3 text-center text-xs text-amber-600 font-bold animate-pulse">
                    🛡️ Simulating attack... intercepting and broadcasting to governance...
                  </div>
                )}
              </Section>

              {/* Live Governance Announcements */}
              {securityOverview.live_announcements && securityOverview.live_announcements.length > 0 && (
                <Section title="📢 Live Governance Threat Announcements" icon={Bell}>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {securityOverview.live_announcements.map((ann, i) => (
                      <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-red-800">{ann.threat_type?.replace(/_/g, ' ')}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-200 text-[9px] font-black text-red-800">{ann.severity}</span>
                            <span className="text-[10px] text-slate-500">{ann.id}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 mt-1">
                            <span className="font-semibold">Source:</span> {ann.source_ip} • <span className="font-semibold">Target:</span> {ann.method} {ann.endpoint}
                          </p>
                          {ann.payload_snippet && (
                            <p className="text-[10px] text-red-600 font-mono mt-1 bg-red-100 rounded px-2 py-1 truncate">
                              {ann.payload_snippet}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">{ann.action_taken}</span>
                            <span className="text-[10px] text-slate-400">{ago(ann.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: SMS GATEWAY & TELECOM NOTIFICATIONS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'sms' && (
        <div className="space-y-5">
          {/* Gateway Status Header */}
          <div className="rounded-2xl border-2 border-sky-300 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 p-5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-2xl shadow-md">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">National SMS & Telecom Gateway</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      smsData?.mode === 'REAL_GATEWAY' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {smsData?.mode === 'REAL_GATEWAY' ? '🟢 LIVE AFRICASTALKING / ETHIO TELECOM' : '🟡 SECURE SIMULATION MODE (ACTIVE)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Delivers cryptographic Fayda OTPs, two-factor authorization codes, critical emergency lab alerts, and patient reminders across all 12 Ethiopian administrative regions.
                  </p>
                </div>
              </div>
              <button
                onClick={fetchSmsLogs}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-slate-700 hover:text-sky-600 rounded-xl border border-slate-200 shadow-xs hover:border-sky-300 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
              </button>
            </div>
          </div>

          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              icon={Smartphone}
              label="Total Dispatched"
              value={smsData?.summary?.total ?? 0}
              sub="Historical logs"
              color="text-sky-600"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Delivered / Success"
              value={smsData?.summary?.sent ?? 0}
              sub="100% SLA target"
              color="text-emerald-600"
            />
            <KpiCard
              icon={Activity}
              label="Simulated / Dev Logs"
              value={smsData?.summary?.simulated ?? 0}
              sub="Zero-cost sandbox"
              color="text-indigo-600"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Failed Transmissions"
              value={smsData?.summary?.failed ?? 0}
              sub="Network retries"
              color="text-amber-600"
            />
          </div>

          {/* Dispatch Sandbox + Quick Templates */}
          <Section title="📤 National Telecom Dispatch Sandbox (Test & Emergency Broadcast)" icon={Send}>
            <form onSubmit={handleSendTestSms} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Mobile (+251 Ethio Telecom / Safaricom)
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+251911234567"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTestPhone('+251911234567')}
                      className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                    >
                      JMC Clinician (+251911...)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPhone('+251922334455')}
                      className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                    >
                      Admin Officer (+251922...)
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      SMS Message Content
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {testMessage.length}/160 chars ({Math.ceil(testMessage.length / 160) || 1} SMS segment)
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter message text..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Template quick-fills */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Quick Templates:</span>
                {[
                  { label: '🔑 Fayda OTP', msg: `NPDMS-MOH: Your Fayda OTP access code is ${Math.floor(100000 + Math.random() * 900000)}. Valid 10 mins. Do not share.` },
                  { label: '🚨 Cyber Threat Alert', msg: `🚨 NPDMS DEFENSE: High severity threat blocked from IP 197.156.104.12. Governance review required.` },
                  { label: '🏥 Referral Transfer', msg: `NPDMS Referral: Patient transferred from Jimma Medical Center to Tikur Anbessa Hospital. Bed reserved.` },
                  { label: '🩸 Blood Bank Alert', msg: `NPDMS Urgent: O-Negative blood reserves critically low at Hawassa Comp. Hospital. Donors needed.` }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTestMessage(tpl.msg)}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-700 font-medium transition cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingSms}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingSms ? 'Dispatched to Ethio Telecom Gateway...' : 'Send Live SMS via Gateway'}
                </button>
              </div>
            </form>
          </Section>

          {/* SMS Transmission Audit Table */}
          <Section
            title="📜 Outbound SMS Transmission Ledger"
            icon={MessageSquare}
            action={
              <div className="flex items-center gap-2">
                <select
                  value={smsTypeFilter}
                  onChange={(e) => setSmsTypeFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 bg-white outline-none cursor-pointer"
                >
                  <option value="">All Message Types</option>
                  <option value="OTP">OTP Verification</option>
                  <option value="SECURITY_ALERT">Security Alerts</option>
                  <option value="GENERAL">General Notifications</option>
                </select>
              </div>
            }
          >
            {(!smsData || !smsData.logs || smsData.logs.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No outbound SMS recorded in this session. Use the sandbox above to trigger a live dispatch.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                      <th className="px-3 py-2.5">Recipient</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Message Content</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Gateway / Cost</th>
                      <th className="px-3 py-2.5 text-right">Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {smsData.logs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-3 py-2 font-mono font-bold text-slate-800 text-[11px]">
                          {log.to_phone || log.to}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'OTP' ? 'bg-sky-100 text-sky-700' :
                            log.type === 'SECURITY_ALERT' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[280px] truncate text-slate-600 font-sans" title={log.message}>
                          {log.message}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'Success' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'SIMULATED' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              log.status === 'Success' ? 'bg-emerald-500' :
                              log.status === 'SIMULATED' ? 'bg-indigo-500' :
                              'bg-red-500'
                            }`} />
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                          {log.cost ? `${log.cost}` : log.message_id ? `${log.message_id.slice(0, 10)}...` : 'Ethio-Tel Gateway'}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-slate-500">
                          {ago(log.created_at || log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Register Facility
      ══════════════════════════════════════════════════════════ */}
      {showAddFacility && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Building2 className="w-5 h-5" />
                <span className="font-bold text-sm">Register Healthcare Facility to Spine</span>
              </div>
              <button onClick={() => setShowAddFacility(false)} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">×</button>
            </div>
            <form onSubmit={handleAddFacility} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hospital / Facility Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asella Referral Hospital"
                    value={newFacility.name}
                    onChange={e => setNewFacility(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Facility Code (Unique) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ARH"
                    value={newFacility.code}
                    onChange={e => setNewFacility(p => ({ ...p, code: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Facility Tier *</label>
                  <select
                    value={newFacility.type}
                    onChange={e => setNewFacility(p => ({ ...p, type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="SPECIALIZED_HOSPITAL">Specialized Referral Hospital</option>
                    <option value="GENERAL_HOSPITAL">General Hospital</option>
                    <option value="PRIMARY_HOSPITAL">Primary Hospital</option>
                    <option value="HEALTH_CENTER">Health Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Region *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oromia"
                    value={newFacility.region}
                    onChange={e => setNewFacility(p => ({ ...p, region: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Zone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arsi Zone"
                    value={newFacility.zone}
                    onChange={e => setNewFacility(p => ({ ...p, zone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Woreda *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asella"
                    value={newFacility.woreda}
                    onChange={e => setNewFacility(p => ({ ...p, woreda: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={newFacility.bed_capacity}
                    onChange={e => setNewFacility(p => ({ ...p, bed_capacity: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFacility(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {saving ? 'Registering...' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Add Staff User
      ══════════════════════════════════════════════════════════ */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Plus className="w-4 h-4" />
                <span className="font-bold text-sm">Create New Staff Account</span>
              </div>
              <button onClick={() => setShowAddUser(false)} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">×</button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Dr. Amina Kebede' },
                  { label: 'Username *', key: 'username', type: 'text', placeholder: 'amina.kebede' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'amina@jumc.et' },
                  { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+251-91-123-4567' },
                  { label: 'Professional ID', key: 'professional_id', type: 'text', placeholder: 'ETH-MED-00123' },
                ].map(f => (
                  <div key={f.key} className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={newUser[f.key]}
                      onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                      required={f.label.includes('*')}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                ))}

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {['DOCTOR','NURSE','PHARMACIST','LAB_TECH','REGISTRATION_OFFICER','FACILITY_ADMIN','SYSTEM_ADMIN'].map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Facility</label>
                  <select
                    value={newUser.facility_id}
                    onChange={e => setNewUser(p => ({ ...p, facility_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="">— Select Facility —</option>
                    {facilities.filter(f => f.is_active).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
