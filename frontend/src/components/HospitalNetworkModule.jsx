// frontend/src/components/HospitalNetworkModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, ShieldCheck, Wifi, WifiOff,
  Users, Activity, MapPin, Phone, Mail, Bed, ChevronDown,
  ChevronRight, Edit2, AlertTriangle, CheckCircle2, X,
  RefreshCw, Globe, Hospital, Stethoscope, FlaskConical,
  Heart, ArrowRight, BarChart3, Network
} from 'lucide-react';

const TYPE_META = {
  SPECIALIZED_HOSPITAL: { label: 'Specialized Hospital', color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500', icon: Hospital },
  GENERAL_HOSPITAL:     { label: 'General Hospital',     color: 'bg-sky-100 text-sky-800 border-sky-200',          dot: 'bg-sky-500',    icon: Building2 },
  PRIMARY_HOSPITAL:     { label: 'Primary Hospital',     color: 'bg-teal-100 text-teal-800 border-teal-200',       dot: 'bg-teal-500',   icon: Stethoscope },
  HEALTH_CENTER:        { label: 'Health Center',         color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', icon: Heart },
  HEALTH_POST:          { label: 'Health Post',           color: 'bg-lime-100 text-lime-800 border-lime-200',       dot: 'bg-lime-500',   icon: Activity },
};

const REGIONS = [
  'Addis Ababa','Oromia','Amhara','Tigray','Sidama','Somali','Afar',
  'Benishangul-Gumuz','Gambella','Harari','Dire Dawa','South Ethiopia',
  'South West Ethiopia','Central Ethiopia'
];

const TYPES = Object.keys(TYPE_META);

const EMPTY_FORM = {
  name: '', code: '', type: 'GENERAL_HOSPITAL', region: 'Oromia', zone: '', woreda: '',
  phone: '', email: '', address: '', bed_capacity: '', director_name: '',
  latitude: '', longitude: '', fayda_connected: true, nhdis_connected: true
};

export default function HospitalNetworkModule({ currentUser, t }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facilities/all');
      const data = await res.json();
      setFacilities(data);
    } catch (e) {
      console.error('Failed to load facilities', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFacilities(); }, []);

  const handleForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditFacility(null);
    setSaveErr('');
    setSaveMsg('');
    setShowAddModal(true);
  };

  const openEdit = (fac) => {
    setForm({
      name: fac.name, code: fac.code, type: fac.type, region: fac.region,
      zone: fac.zone, woreda: fac.woreda, phone: fac.phone || '', email: fac.email || '',
      address: fac.address || '', bed_capacity: fac.bed_capacity || '',
      director_name: fac.director_name || '', latitude: fac.latitude || '',
      longitude: fac.longitude || '', fayda_connected: !!fac.fayda_connected,
      nhdis_connected: !!fac.nhdis_connected
    });
    setEditFacility(fac);
    setSaveErr('');
    setSaveMsg('');
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr('');
    setSaveMsg('');

    const payload = {
      ...form,
      bed_capacity: form.bed_capacity ? parseInt(form.bed_capacity) : 0,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    };

    try {
      let res;
      if (editFacility) {
        res = await fetch(`/api/facilities/${editFacility.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setSaveErr(data.error || 'Failed to save facility.');
      } else {
        setSaveMsg(editFacility ? `${data.name} updated successfully.` : `${data.name} has been enrolled in the NPDMS network!`);
        await loadFacilities();
        setTimeout(() => { setShowAddModal(false); setSaveMsg(''); }, 1500);
      }
    } catch (err) {
      setSaveErr('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (fac) => {
    if (!window.confirm(`Remove "${fac.name}" from the NPDMS active network?`)) return;
    await fetch(`/api/facilities/${fac.id}`, { method: 'DELETE' });
    loadFacilities();
  };

  // Filtered & searched list
  const filtered = facilities.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      f.name.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      f.region.toLowerCase().includes(q) ||
      (f.director_name || '').toLowerCase().includes(q);
    const matchType = filterType === 'ALL' || f.type === filterType;
    const matchRegion = filterRegion === 'ALL' || f.region === filterRegion;
    return matchSearch && matchType && matchRegion;
  });

  // Network summary stats
  const totalBeds = facilities.filter(f => f.is_active).reduce((s, f) => s + (f.bed_capacity || 0), 0);
  const totalPatients = facilities.reduce((s, f) => s + (f.patient_count || 0), 0);
  const totalEncounters = facilities.reduce((s, f) => s + (f.encounter_count || 0), 0);
  const faydaLinked = facilities.filter(f => f.fayda_connected && f.is_active).length;

  const regionCounts = {};
  facilities.filter(f => f.is_active).forEach(f => {
    regionCounts[f.region] = (regionCounts[f.region] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-600" />
            Ethiopian National Hospital Network
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Federal Ministry of Health · NPDMS Registered Facilities · Fayda & NHDIS Connected
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Enroll New Hospital / Facility
        </button>
      </div>

      {/* ── KPI STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Facilities</span>
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{facilities.filter(f => f.is_active).length}</div>
          <p className="text-[11px] text-slate-500">{Object.keys(regionCounts).length} regions covered</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fayda ID Connected</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{faydaLinked}</div>
          <p className="text-[11px] text-emerald-600">
            {Math.round((faydaLinked / (facilities.filter(f => f.is_active).length || 1)) * 100)}% of network
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Bed Capacity</span>
            <Bed className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900">{totalBeds.toLocaleString()}</div>
          <p className="text-[11px] text-slate-500">Network-wide inpatient beds</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Encounters</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{totalEncounters}</div>
          <p className="text-[11px] text-slate-500">{totalPatients} registered patients</p>
        </div>
      </div>

      {/* ── REGION DISTRIBUTION BAR ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Regional Distribution</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(regionCounts).sort((a,b) => b[1]-a[1]).map(([region, count]) => (
            <button
              key={region}
              onClick={() => setFilterRegion(filterRegion === region ? 'ALL' : region)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                filterRegion === region
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
              }`}
            >
              <span>{region}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterRegion === region ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hospital name, code, region, director..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap text-xs">
          {['ALL', ...TYPES].map(t => {
            const meta = TYPE_META[t];
            const active = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-xl font-semibold border transition cursor-pointer whitespace-nowrap ${
                  active ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t === 'ALL' ? `All (${facilities.filter(f=>f.is_active).length})` : (meta?.label || t)}
              </button>
            );
          })}
        </div>
        <button onClick={loadFacilities} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition cursor-pointer border border-slate-200" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── FACILITIES TABLE ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading facility network...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No facilities match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Hospital / Facility</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Region / Zone</th>
                  <th className="py-3 px-4">Connectivity</th>
                  <th className="py-3 px-4 text-center">Beds</th>
                  <th className="py-3 px-4 text-center">Patients</th>
                  <th className="py-3 px-4 text-center">Encounters</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(fac => {
                  const meta = TYPE_META[fac.type] || TYPE_META.GENERAL_HOSPITAL;
                  const TypeIcon = meta.icon;
                  const isExpanded = expandedId === fac.id;
                  const inactive = !fac.is_active;

                  return (
                    <React.Fragment key={fac.id}>
                      <tr className={`hover:bg-slate-50/70 transition ${inactive ? 'opacity-50' : ''}`}>
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${inactive ? 'bg-slate-300' : meta.dot}`} />
                            <div>
                              <div className="font-bold text-slate-900">{fac.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{fac.code}</div>
                              {fac.director_name && (
                                <div className="text-[10px] text-slate-500 mt-0.5">🩺 {fac.director_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Type */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        {/* Region */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">{fac.region}</div>
                          <div className="text-[10px] text-slate-400">{fac.zone}{fac.woreda ? ` · ${fac.woreda}` : ''}</div>
                        </td>
                        {/* Connectivity */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${fac.fayda_connected ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {fac.fayda_connected ? <ShieldCheck className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              Fayda ID {fac.fayda_connected ? 'Connected' : 'Offline'}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${fac.nhdis_connected ? 'text-sky-700' : 'text-slate-400'}`}>
                              {fac.nhdis_connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              NHDIS {fac.nhdis_connected ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        {/* Beds */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-700">{fac.bed_capacity || '—'}</span>
                        </td>
                        {/* Patients */}
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${fac.patient_count > 0 ? 'text-sky-700' : 'text-slate-400'}`}>
                            {fac.patient_count || 0}
                          </span>
                        </td>
                        {/* Encounters */}
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${fac.encounter_count > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                            {fac.encounter_count || 0}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : fac.id)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                              title="View details"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openEdit(fac)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit facility"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {fac.is_active ? (
                              <button
                                onClick={() => handleDeactivate(fac)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Deactivate from network"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold px-1.5">INACTIVE</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-sky-50/50 border-t border-b border-sky-100 px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              {fac.phone && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">Phone</div>
                                    <div>{fac.phone}</div>
                                  </div>
                                </div>
                              )}
                              {fac.email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Mail className="w-3.5 h-3.5 text-sky-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">Email</div>
                                    <div>{fac.email}</div>
                                  </div>
                                </div>
                              )}
                              {fac.address && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">Address</div>
                                    <div>{fac.address}</div>
                                  </div>
                                </div>
                              )}
                              {fac.latitude && fac.longitude && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">GPS Coordinates</div>
                                    <div className="font-mono">{fac.latitude.toFixed(4)}, {fac.longitude.toFixed(4)}</div>
                                  </div>
                                </div>
                              )}
                              {fac.staff_count !== undefined && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">NPDMS Staff Users</div>
                                    <div>{fac.staff_count} active accounts</div>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-slate-600">
                                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                                <div>
                                  <div className="font-bold text-slate-500 text-[10px] uppercase">Network ID</div>
                                  <div className="font-mono">{fac.id}</div>
                                </div>
                              </div>
                              {fac.joined_at && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <div>
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">NPDMS Enrolled</div>
                                    <div>{fac.joined_at.slice(0, 10)}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT HOSPITAL MODAL ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-700 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {editFacility ? 'Edit Facility Details' : 'Enroll New Hospital / Facility'}
                </h3>
                <p className="text-xs text-sky-200">Federal Ministry of Health · NPDMS National Network Registry</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">

              {/* Basic Info */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-100">
                  Basic Facility Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Full Official Name *</label>
                    <input required value={form.name} onChange={e => handleForm('name', e.target.value)}
                      placeholder="e.g. Jimma Medical Center (JMC)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Facility Code *</label>
                    <input required value={form.code} onChange={e => handleForm('code', e.target.value.toUpperCase())}
                      placeholder="e.g. JMC-ETH"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                    <p className="text-[10px] text-slate-400 mt-0.5">Unique abbreviated code. Used as national identifier.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Facility Type *</label>
                    <select required value={form.type} onChange={e => handleForm('type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none">
                      {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Region *</label>
                    <select required value={form.region} onChange={e => handleForm('region', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none">
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Zone *</label>
                    <input required value={form.zone} onChange={e => handleForm('zone', e.target.value)}
                      placeholder="e.g. Jimma Zone"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Woreda / Sub-City</label>
                    <input value={form.woreda} onChange={e => handleForm('woreda', e.target.value)}
                      placeholder="e.g. Jimma City Woreda 4"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                    <input value={form.address} onChange={e => handleForm('address', e.target.value)}
                      placeholder="e.g. Jimma City, Oromia Region, Ethiopia"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Contact & Leadership */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-100">
                  Contact & Leadership
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input value={form.phone} onChange={e => handleForm('phone', e.target.value)}
                      placeholder="+251-47-111-1458"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                    <input type="email" value={form.email} onChange={e => handleForm('email', e.target.value)}
                      placeholder="info@hospital.gov.et"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Medical Director / Administrator</label>
                    <input value={form.director_name} onChange={e => handleForm('director_name', e.target.value)}
                      placeholder="Dr. Full Name, MD"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inpatient Bed Capacity</label>
                    <input type="number" min="0" value={form.bed_capacity} onChange={e => handleForm('bed_capacity', e.target.value)}
                      placeholder="e.g. 250"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* GPS */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-100">
                  GPS Coordinates (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={e => handleForm('latitude', e.target.value)}
                      placeholder="e.g. 7.6731"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={e => handleForm('longitude', e.target.value)}
                      placeholder="e.g. 36.8344"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Connectivity Flags */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-100">
                  National Health System Integration
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-emerald-300 transition">
                    <input type="checkbox" checked={form.fayda_connected}
                      onChange={e => handleForm('fayda_connected', e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded" />
                    <div>
                      <div className="font-bold text-slate-800">Fayda ID Connected</div>
                      <div className="text-[10px] text-slate-500">Ethiopian National Digital ID biometric verification</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-sky-300 transition">
                    <input type="checkbox" checked={form.nhdis_connected}
                      onChange={e => handleForm('nhdis_connected', e.target.checked)}
                      className="w-4 h-4 accent-sky-600 rounded" />
                    <div>
                      <div className="font-bold text-slate-800">NHDIS / Health Spine</div>
                      <div className="text-[10px] text-slate-500">National Health Data & Interoperability System</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error / Success */}
              {saveErr && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{saveErr}</span>
                </div>
              )}
              {saveMsg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-60 flex items-center gap-2">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                  {saving ? 'Saving...' : editFacility ? 'Save Changes' : 'Enroll in NPDMS Network'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
