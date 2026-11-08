// frontend/src/components/EmergencyBloodBank.jsx
import React, { useState, useEffect } from 'react';
import {
  Heart, AlertTriangle, ShieldAlert, Building2, Truck, Plus,
  Search, RefreshCw, CheckCircle2, Clock, ArrowRight, Droplets,
  PackageCheck, Hospital, AlertOctagon, User, Phone, Check, X
} from 'lucide-react';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const BLOOD_META = {
  'O+': { label: 'O Positive', donor: 'O+, A+, B+, AB+', recipient: 'O+, O-', tag: 'Most Common', color: 'from-rose-600 to-red-700' },
  'O-': { label: 'O Negative', donor: 'All Types (Universal Donor)', recipient: 'O- Only', tag: 'Universal Donor', color: 'from-red-700 to-amber-700', critical: true },
  'A+': { label: 'A Positive', donor: 'A+, AB+', recipient: 'A+, A-, O+, O-', tag: 'High Demand', color: 'from-rose-600 to-pink-700' },
  'A-': { label: 'A Negative', donor: 'A+, A-, AB+, AB-', recipient: 'A-, O-', tag: 'Rare', color: 'from-pink-700 to-red-800' },
  'B+': { label: 'B Positive', donor: 'B+, AB+', recipient: 'B+, B-, O+, O-', tag: 'Standard', color: 'from-red-600 to-rose-700' },
  'B-': { label: 'B Negative', donor: 'B+, B-, AB+, AB-', recipient: 'B-, O-', tag: 'Rare', color: 'from-red-800 to-rose-900', critical: true },
  'AB+': { label: 'AB Positive', donor: 'AB+ Only', recipient: 'All Types (Universal Recipient)', tag: 'Universal Recipient', color: 'from-purple-700 to-indigo-800' },
  'AB-': { label: 'AB Negative', donor: 'AB+, AB-', recipient: 'AB-, A-, B-, O-', tag: 'Ultra Rare', color: 'from-indigo-800 to-slate-800', critical: true }
};

export default function EmergencyBloodBank({
  currentFacility, currentUser, patients = [], t
}) {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterFacility, setFilterFacility] = useState('ALL');
  const [showReqModal, setShowReqModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'requests'

  // Request form state
  const [reqForm, setReqForm] = useState({
    requesting_facility_id: currentFacility?.id || 'FAC-JUMC',
    fulfilling_facility_id: 'FAC-JUMC',
    patient_id: patients[0]?.id || 'PAT-001',
    blood_group: 'O+',
    units_requested: 2,
    urgency_level: 'STAT_EMERGENCY',
    clinical_indication: 'Severe trauma hemorrhage during emergency surgical laparotomy'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resInv, resSum, resReq] = await Promise.all([
        fetch('/api/blood-bank/inventory'),
        fetch('/api/blood-bank/summary'),
        fetch('/api/blood-bank/requests')
      ]);

      const [dataInv, dataSum, dataReq] = await Promise.all([
        resInv.json(),
        resSum.json(),
        resReq.json()
      ]);

      setInventory(dataInv);
      setSummary(dataSum);
      setRequests(dataReq);
    } catch (err) {
      console.error('Failed to load blood bank data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentFacility]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/blood-bank/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reqForm,
          requested_by: currentUser?.full_name || 'Dr. Abebe Tadesse, MD'
        })
      });

      if (res.ok) {
        setFeedbackMsg('Emergency Blood Transfer Request broadcast to National Health Spine!');
        setShowReqModal(false);
        setActiveTab('requests');
        await fetchData();
        setTimeout(() => setFeedbackMsg(''), 4500);
      }
    } catch (err) {
      alert('Error dispatching blood request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      const res = await fetch(`/api/blood-bank/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Facilities list from inventory
  const facilityList = Array.from(new Set(inventory.map(i => i.facility_name))).map(name => {
    const item = inventory.find(i => i.facility_name === name);
    return { id: item.facility_id, name: item.facility_name, code: item.facility_code };
  });

  const filteredInventory = inventory.filter(item => {
    const matchGroup = filterGroup === 'ALL' || item.blood_group === filterGroup;
    const matchFac = filterFacility === 'ALL' || item.facility_id === filterFacility;
    return matchGroup && matchFac;
  });

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & EMERGENCY ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <Droplets className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-900 text-sm">National Emergency Blood Bank Network</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                Cold Chain Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Inter-Hospital Blood Reserve & Emergency Transfer Grid · Jimma Medical Center, Tikur Anbessa & Regional Hubs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReqModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Blood Unit Transfer</span>
          </button>
          <button
            onClick={fetchData}
            title="Refresh network inventory"
            className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 2. SUMMARY KPI STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Network Units</span>
          <div className="text-2xl font-black text-rose-700 flex items-center gap-1.5">
            <Droplets className="w-5 h-5 text-rose-600" />
            <span>{summary?.totalNetworkUnits || 0}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Stored in temperature-monitored hubs</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Universal Donor (O-)</span>
          <div className="text-2xl font-black text-red-600">
            {summary?.groups?.find(g => g.blood_group === 'O-')?.total_units || 0} Units
          </div>
          <p className="text-[11px] text-amber-600 font-medium">Critical for trauma resuscitation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Blood Banks</span>
          <div className="text-2xl font-black text-indigo-900">4 Facilities</div>
          <p className="text-[11px] text-slate-500 font-medium">JMC, TASH, Shenen Gibe, Agaro</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Transfer Requests</span>
          <div className="text-2xl font-black text-amber-600">
            {requests.filter(r => r.status !== 'FULFILLED' && r.status !== 'REJECTED').length} Active
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Inter-facility ambulances en-route</p>
        </div>
      </div>

      {/* 3. 8 BLOOD GROUP TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {BLOOD_GROUPS.map(bg => {
          const meta = BLOOD_META[bg];
          const groupSummary = summary?.groups?.find(g => g.blood_group === bg);
          const units = groupSummary ? groupSummary.total_units : 0;
          const isSelected = filterGroup === bg;
          const isLow = units < 12;

          return (
            <button
              key={bg}
              onClick={() => setFilterGroup(isSelected ? 'ALL' : bg)}
              className={`p-3 rounded-2xl border text-left transition relative cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-rose-500/50'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:bg-rose-50/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-base tracking-tight">{bg}</span>
                {meta.critical && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </div>
              <div className="mt-1 font-extrabold text-lg">
                {units} <span className="text-[10px] font-normal text-slate-400">units</span>
              </div>
              <div className={`mt-1 text-[9px] font-bold uppercase tracking-wider truncate ${isLow ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isLow ? 'Low Reserve' : 'Available'}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. TAB NAVIGATION & FACILITY FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hospital Reserves ({filteredInventory.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Inter-Hospital Transfers</span>
            <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-100 text-rose-700">
              {requests.length}
            </span>
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Facility:</span>
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:outline-none"
            >
              <option value="ALL">All Facilities</option>
              {facilityList.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {filterGroup !== 'ALL' && (
              <button
                onClick={() => setFilterGroup('ALL')}
                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Clear {filterGroup}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. TAB A: INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Hospital Depot</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Stock Units</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Storage Cold-Chain</th>
                  <th className="py-3 px-4">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(item => {
                  const meta = BLOOD_META[item.blood_group] || {};
                  const isLow = item.units_available < 8;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>{item.facility_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.facility_code} · {item.facility_region}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-xs shadow-2xs">
                          {item.blood_group}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{meta.tag}</div>
                      </td>
                      <td className="py-3 px-4 font-black text-sm">
                        <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>
                          {item.units_available} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {item.component_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {item.storage_location || 'Cold Chain Hub #1'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isLow
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            {isLow ? 'Critical Reserve' : 'Sufficient'}
                          </span>
                          <button
                            onClick={() => {
                              setReqForm(prev => ({
                                ...prev,
                                fulfilling_facility_id: item.facility_id,
                                blood_group: item.blood_group
                              }));
                              setShowReqModal(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Request This
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB B: INTER-HOSPITAL TRANSFER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map(req => {
            const isStat = req.urgency_level === 'STAT_EMERGENCY';
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isInTransit = req.status === 'IN_TRANSIT';
            const isFulfilled = req.status === 'FULFILLED';

            return (
              <div
                key={req.id}
                className={`p-4 bg-white rounded-2xl border shadow-2xs space-y-3 transition ${
                  isStat ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-sm">
                      {req.blood_group}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">
                          {req.units_requested} Units Requested
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isStat ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.urgency_level.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{req.id} · Dispatched: {req.requested_at}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      isFulfilled
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : isInTransit
                        ? 'bg-sky-50 border-sky-300 text-sky-800 animate-pulse'
                        : isApproved
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                    }`}>
                      {isInTransit && <Truck className="w-3.5 h-3.5" />}
                      {isFulfilled && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{req.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                {/* Routing & Indication */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Requesting Hospital</span>
                    <span className="font-bold text-slate-900">{req.requesting_facility_name}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">By {req.requested_by}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Fulfilling Hub</span>
                    <span className="font-bold text-indigo-900">{req.fulfilling_facility_name || 'Central Blood Depot'}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">Cold Chain Ambulance Verified</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Clinical Indication</span>
                    <span className="text-slate-800 font-medium">{req.clinical_indication}</span>
                    {req.patient_first_name && (
                      <span className="text-[10px] text-sky-700 block font-semibold mt-0.5">
                        Patient: {req.patient_first_name} {req.patient_father_name} ({req.npdms_id})
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Approve Release from Cold-Chain
                    </button>
                  )}
                  {isApproved && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'IN_TRANSIT')}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Dispatch Cold-Chain Transport
                    </button>
                  )}
                  {isInTransit && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'FULFILLED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Delivery & Transfusion Handover
                    </button>
                  )}
                  {isFulfilled && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed & Reconciled with Health Spine
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. EMERGENCY REQUEST MODAL */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Droplets className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Emergency Blood Transfer Dispatch
                  </h3>
                  <p className="text-[11px] text-slate-500">National Cold-Chain Ambulance Logistics</p>
                </div>
              </div>
              <button onClick={() => setShowReqModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Requesting Facility
                  </label>
                  <select
                    value={reqForm.requesting_facility_id}
                    onChange={(e) => setReqForm({ ...reqForm, requesting_facility_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 text-xs"
                  >
                    {facilityList.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fulfilling Depot / Hospital
                  </label>
                  <select
                    value={reqForm.fulfilling_facility_id}
                    onChange={(e) => setReqForm({ ...reqForm, fulfilling_facility_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 text-xs"
                  >
                    {facilityList.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Blood Group Required
                  </label>
                  <select
                    value={reqForm.blood_group}
                    onChange={(e) => setReqForm({ ...reqForm, blood_group: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black bg-slate-50 text-xs"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg} ({BLOOD_META[bg]?.label})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={reqForm.units_requested}
                    onChange={(e) => setReqForm({ ...reqForm, units_requested: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Urgency Protocol
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'STAT_EMERGENCY', label: '🚨 STAT Trauma', color: 'border-rose-400 bg-rose-50 text-rose-800' },
                    { id: 'CRITICAL', label: '⚡ Critical (1-2hr)', color: 'border-amber-400 bg-amber-50 text-amber-800' },
                    { id: 'ROUTINE', label: '📅 Planned Surgery', color: 'border-slate-300 bg-slate-50 text-slate-700' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setReqForm({ ...reqForm, urgency_level: opt.id })}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        reqForm.urgency_level === opt.id
                          ? `${opt.color} ring-2 ring-rose-500/30`
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Patient (Optional)
                </label>
                <select
                  value={reqForm.patient_id}
                  onChange={(e) => setReqForm({ ...reqForm, patient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 text-xs"
                >
                  <option value="">-- No specific patient (Ward Buffer Stock) --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.father_name} ({p.npdms_id}) - {p.blood_type || 'Group ' + reqForm.blood_group}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Clinical Indication & Diagnosis
                </label>
                <textarea
                  rows={2}
                  required
                  value={reqForm.clinical_indication}
                  onChange={(e) => setReqForm({ ...reqForm, clinical_indication: e.target.value })}
                  placeholder="e.g. Hemorrhagic shock in trauma bay, urgent 2 units PRBC required..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Broadcasting...' : 'Broadcast Emergency Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
