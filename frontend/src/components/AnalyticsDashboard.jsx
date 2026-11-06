// frontend/src/components/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart3, Users, ShieldCheck, Activity, Share2, Pill,
  FlaskConical, AlertTriangle, Building2, TrendingUp
} from 'lucide-react';

export default function AnalyticsDashboard({
  currentFacility, t
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading analytics...</div>;
  }

  const { metrics, facilityBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-600" />
          {t.navAnalytics}
        </h2>
        <p className="text-xs text-slate-500">
          Executive operational intelligence across participating Ethiopian health facilities.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-medium">Total Registered Patients</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.patientTotal}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Across 4 connected facilities
          </div>
        </div>

        {/* Fayda Verification Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-medium">Fayda Digital ID Linkage</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.faydaVerificationRate}%</div>
          <div className="text-[11px] text-slate-500">
            {metrics.faydaVerified} of {metrics.patientTotal} patients verified
          </div>
        </div>

        {/* Total Longitudinal Encounters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-medium">Cross-Facility Encounters</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.encounterTotal}</div>
          <div className="text-[11px] text-indigo-600 font-semibold">
            Unified longitudinal histories
          </div>
        </div>

        {/* Inter-Hospital Referrals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-medium">Inter-Hospital Referrals</span>
            <Share2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.referralTotal}</div>
          <div className="text-[11px] text-purple-600 font-semibold">
            Shared continuity summaries
          </div>
        </div>
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-medium">Pending Lab Orders</span>
            <span className="text-xl font-bold text-slate-800">{metrics.pendingLabs}</span>
          </div>
          <FlaskConical className="w-6 h-6 text-emerald-500 opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-medium">Active Prescriptions</span>
            <span className="text-xl font-bold text-slate-800">{metrics.activeRx}</span>
          </div>
          <Pill className="w-6 h-6 text-indigo-500 opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-medium">Duplicate Review Queue</span>
            <span className="text-xl font-bold text-amber-600">{metrics.pendingDuplicates}</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500 opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-medium">Emergency Break-Glass</span>
            <span className="text-xl font-bold text-rose-600">{metrics.emergencyBreakGlassCount}</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-rose-500 opacity-80" />
        </div>
      </div>

      {/* Facility Activity Distribution */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-600" />
          Encounters by Ethiopian Healthcare Facility
        </h3>

        <div className="space-y-3">
          {facilityBreakdown.map((fac, idx) => {
            const pct = metrics.encounterTotal > 0 ? Math.round((fac.encounter_count / metrics.encounterTotal) * 100) : 0;
            return (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{fac.name} ({fac.code})</span>
                  <span>{fac.encounter_count} encounters ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
