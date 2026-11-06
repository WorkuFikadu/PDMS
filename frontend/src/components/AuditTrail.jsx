// frontend/src/components/AuditTrail.jsx
import React, { useState, useEffect } from 'react';
import {
  Shield, AlertOctagon, User, Building2, Clock, Filter,
  FileText, Activity, Download
} from 'lucide-react';

export default function AuditTrail({
  currentFacility, currentUser, t
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=100');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (actionFilter === 'ALL') return true;
    if (actionFilter === 'BREAK_GLASS') return l.action === 'BREAK_GLASS';
    if (actionFilter === 'EXPORT_FHIR') return l.action === 'EXPORT_FHIR';
    return l.action === actionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            {t.navAudit}
          </h2>
          <p className="text-xs text-slate-500">
            Immutable, tamper-evident audit record of every access, diagnosis, prescription, FHIR export, and Break-Glass override.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActionFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${actionFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setActionFilter('BREAK_GLASS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${actionFilter === 'BREAK_GLASS' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}
          >
            Emergency Break-Glass
          </button>
          <button
            onClick={() => setActionFilter('EXPORT_FHIR')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${actionFilter === 'EXPORT_FHIR' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700'}`}
          >
            HL7 FHIR Exchanges
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User & Role</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Patient / Resource</th>
                  <th className="py-3 px-4">Justification / Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map(log => {
                  const isBreakGlass = log.action === 'BREAK_GLASS';
                  const isFhir = log.action === 'EXPORT_FHIR';

                  return (
                    <tr key={log.id} className={`hover:bg-slate-50/50 transition ${isBreakGlass ? 'bg-rose-50/60' : ''}`}>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {log.created_at}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isBreakGlass ? 'bg-rose-600 text-white animate-pulse' : isFhir ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
                          {isBreakGlass && <AlertOctagon className="w-3 h-3" />}
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-bold">{log.user_name}</div>
                        <div className="text-[10px] text-slate-400">{log.user_role}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.facility_name || log.facility_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-sky-700">
                        {log.patient_id || 'N/A'}
                        <span className="block font-sans text-[10px] text-slate-400 font-normal">
                          {log.resource_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs">
                        {log.justification}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
