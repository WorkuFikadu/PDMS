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
  AlertOctagon, Terminal, HardDrive, Cpu, Package
} from 'lucide-react';
import { apiFetch } from '../api';

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
  USER_LOGIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  EXPORT_FHIR: 'bg-violet-100 text-violet-700 border-violet-200',
  DEACTIVATE_USER: 'bg-orange-100 text-orange-700 border-orange-200',
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
  { id: 'facilities', label: 'Facilities',        icon: Building2 },
  { id: 'users',      label: 'Staff & Users',     icon: Users },
  { id: 'audit',      label: 'Audit Log',         icon: Shield },
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

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

  useEffect(() => { fetchOverview(); fetchUsers(); fetchAudit(); fetchHealth(); }, []);
  useEffect(() => { fetchAudit(); }, [fetchAudit]);

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
        showToast(data.message || 'User created.');
        setShowAddUser(false);
        setNewUser({ username: '', full_name: '', role: 'DOCTOR', facility_id: '', email: '', phone: '', professional_id: '' });
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to create user.');
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

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 flex items-start justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-black tracking-tight">System Governance & Admin Panel</h1>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">Master Control</span>
          </div>
          <p className="text-xs text-slate-400">
            Ethiopian National Patient Data Management System (NPDMS) · Full operational command for authorized System Administrators
          </p>
          {currentUser && (
            <p className="text-[11px] text-sky-400 mt-1 font-semibold">
              Logged in as: {currentUser.full_name} · {currentUser.role?.replace(/_/g, ' ')} · {currentUser.facility_name}
            </p>
          )}
        </div>
        <button
          onClick={() => { setLoading(true); fetchOverview(); fetchUsers(); fetchAudit(); fetchHealth(); }}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition shrink-0 mt-0.5"
          title="Refresh all data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 cursor-pointer ${
                activeTab === tab.id ? 'bg-white text-sky-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: OVERVIEW
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
          <Section title="Recent Security Events" icon={Shield}
            action={
              <button onClick={() => setActiveTab('audit')} className="text-[11px] text-sky-600 font-semibold hover:underline flex items-center gap-1">
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
          TAB: FACILITIES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'facilities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              {facilities.length} Healthcare Facilities in NPDMS Network
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {facilities.filter(f => f.is_active).length} Active
              </span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                {facilities.filter(f => !f.is_active).length} Suspended
              </span>
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
                    <span className="text-[10px] text-slate-400">{fac.code} · {fac.region}</span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${fac.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {fac.is_active ? 'ACTIVE' : 'SUSPENDED'}
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
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      fac.is_active
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {fac.is_active ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => toggleFayda(fac)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
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
          TAB: USERS / STAFF
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
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
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Staff Account
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex gap-3 flex-wrap text-xs text-slate-600">
            {Object.entries(
              filteredUsers.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
            ).map(([role, count]) => (
              <span key={role} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-full font-semibold">
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
                    {['Name', 'Username', 'Role', 'Facility', 'Contact', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        {u.professional_id && <div className="text-[10px] text-slate-400">ID: {u.professional_id}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.username}</td>
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
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleUser(u)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                            u.is_active
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {u.is_active ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
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
          TAB: AUDIT LOG
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
              {['USER_LOGIN','CREATE_PATIENT','CREATE_ENCOUNTER','PRESCRIBE_MED','DISPENSE_MED','PUBLISH_LAB','CREATE_REFERRAL','BREAK_GLASS','EXPORT_FHIR','CREATE_USER','DEACTIVATE_USER','UPDATE_FACILITY','FAYDA_OTP_LOGIN'].map(a => (
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
                    {['Time', 'Action', 'User', 'Role', 'Facility', 'Patient', 'Resource'].map(h => (
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
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-400 text-xs">No audit events found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                disabled={auditPage === 0}
                className="text-xs font-semibold text-sky-600 disabled:text-slate-300 hover:underline"
              >← Previous</button>
              <span className="text-[11px] text-slate-400">
                Page {auditPage + 1} of {Math.max(1, Math.ceil(auditTotal / AUDIT_LIMIT))}
              </span>
              <button
                onClick={() => setAuditPage(p => p + 1)}
                disabled={(auditPage + 1) * AUDIT_LIMIT >= auditTotal}
                className="text-xs font-semibold text-sky-600 disabled:text-slate-300 hover:underline"
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: SYSTEM HEALTH
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
                    ['Authentication', 'JWT + Fayda FIN OTP + Biometric'],
                    ['Deployment', process.env.VERCEL ? 'Vercel Serverless' : 'Local Node.js'],
                    ['Last Checked', new Date(health.timestamp).toLocaleString()],
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
          MODAL: Add Staff User
      ══════════════════════════════════════════════════════════ */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Plus className="w-4 h-4" />
                <span className="font-bold text-sm">Create New Staff Account</span>
              </div>
              <button onClick={() => setShowAddUser(false)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-60"
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
