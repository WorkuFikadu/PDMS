// frontend/src/components/PatientRegistry.jsx
import React, { useState } from 'react';
import {
  Search, UserPlus, ShieldCheck, AlertCircle, AlertTriangle,
  HeartPulse, Phone, MapPin, Eye, CheckCircle2, X
} from 'lucide-react';

export default function PatientRegistry({
  patients, loading, onSelectPatient, onRefresh,
  currentFacility, currentUser, t
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Registration Form State
  const [faydaInput, setFaydaInput] = useState('');
  const [faydaLoading, setFaydaLoading] = useState(false);
  const [faydaResult, setFaydaResult] = useState(null);
  const [faydaError, setFaydaError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    father_name: '',
    grandfather_name: '',
    first_name_amharic: '',
    father_name_amharic: '',
    date_of_birth: '',
    gender: 'MALE',
    phone_number: '',
    region: 'Oromia',
    zone_woreda: 'Jimma City',
    kebele: '',
    house_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    blood_type: 'Unknown',
    is_emergency_provisional: false
  });

  const [regError, setRegError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Filtered patients
  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      searchTerm === '' ||
      p.npdms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fayda_fin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone_number?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterType === 'VERIFIED') return p.fayda_status === 'VERIFIED';
    if (filterType === 'UNLINKED') return p.fayda_status === 'UNLINKED' && !p.is_emergency_provisional;
    if (filterType === 'EMERGENCY') return p.is_emergency_provisional;
    return true;
  });

  // Fayda Lookup Function
  const handleFaydaLookup = async () => {
    if (!faydaInput.trim()) return;
    setFaydaLoading(true);
    setFaydaError('');
    setFaydaResult(null);

    try {
      const res = await fetch('/api/fayda/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin: faydaInput.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        setFaydaError(data.error || 'Fayda ID verification failed.');
      } else {
        setFaydaResult(data.data);
        // Pre-fill form from verified Fayda record
        setFormData(prev => ({
          ...prev,
          first_name: data.data.first_name,
          father_name: data.data.father_name,
          grandfather_name: data.data.grandfather_name,
          first_name_amharic: data.data.first_name_amharic || '',
          father_name_amharic: data.data.father_name_amharic || '',
          date_of_birth: data.data.date_of_birth,
          gender: data.data.gender,
          phone_number: data.data.phone_number || prev.phone_number,
          region: data.data.region || prev.region,
          zone_woreda: `${data.data.zone || ''} / ${data.data.woreda || ''}`,
          kebele: data.data.kebele || ''
        }));
      }
    } catch (err) {
      setFaydaError('Network error connecting to Fayda verification service.');
    } finally {
      setFaydaLoading(false);
    }
  };

  // Submit Patient Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setDuplicateWarning(null);

    try {
      const payload = {
        ...formData,
        fayda_fin: faydaResult ? faydaResult.fin : (formData.is_emergency_provisional ? null : null),
        fayda_status: faydaResult ? 'VERIFIED' : 'UNLINKED',
        facility_id: currentFacility?.id || 'FAC-JUMC',
        user_id: currentUser?.id || 'USR-REG-01',
        user_name: currentUser?.full_name || 'Almaz Bekele',
        user_role: currentUser?.role || 'REGISTRATION_OFFICER'
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setRegError(data.error || 'Failed to register patient');
      } else {
        if (data.duplicateFlagged) {
          setDuplicateWarning(data.duplicateFlagged);
        }
        await onRefresh();
        if (!data.duplicateFlagged) {
          setShowRegisterModal(false);
          // Auto select newly registered patient
          onSelectPatient(data.id);
        }
      }
    } catch (err) {
      setRegError('Server error while saving patient.');
    }
  };

  return (
    <div className="space-y-6">
      {/* NATIONAL FAYDA CORE PILLAR BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-5 border border-sky-800/50 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                CORE SYSTEM ARCHITECTURE
              </span>
              <span className="text-xs text-sky-300 font-semibold">
                FDRE Ministry of Health • Jimma University
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              One Patient • One Fayda Identity • Treated Anywhere, Stored in One Record
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              When a patient visits a primary clinic in Agaro, is referred to Jimma University Medical Center (JUMC), or undergoes surgery at Tikur Anbessa in Addis Ababa, all clinical histories, life-threatening allergies, and prescriptions are synchronized into a single, permanent longitudinal record anchored by their verified Ethiopian National Digital ID (Fayda).
            </p>
          </div>

          {/* Quick Demo Test Fayda Pills */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2 text-xs min-w-[260px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Search by Fayda National ID:
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSearchTerm('1985-7821-4923')}
                className="text-left px-2.5 py-1.5 bg-slate-900/90 hover:bg-sky-900/60 text-sky-200 rounded-lg text-xs font-mono font-bold transition flex items-center justify-between"
              >
                <span>1985-7821-4923</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">Kemal (2 Hospitals)</span>
              </button>
              <button
                onClick={() => setSearchTerm('2001-9984-5512')}
                className="text-left px-2.5 py-1.5 bg-slate-900/90 hover:bg-sky-900/60 text-sky-200 rounded-lg text-xs font-mono font-bold transition flex items-center justify-between"
              >
                <span>2001-9984-5512</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">Chaltu (ANC / Surgery)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilterType('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${filterType === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
          >
            Fayda Verified
          </button>
          <button
            onClick={() => setFilterType('UNLINKED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${filterType === 'UNLINKED' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
          >
            Provisional / Unlinked
          </button>
          <button
            onClick={() => setFilterType('EMERGENCY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${filterType === 'EMERGENCY' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
          >
            Emergency Trauma
          </button>
        </div>

        {/* Register Button */}
        <button
          onClick={() => {
            setShowRegisterModal(true);
            setFaydaResult(null);
            setFaydaError('');
            setDuplicateWarning(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          {t.registerPatient}
        </button>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.npdmsId}</th>
                <th className="py-3 px-4">{t.fullName}</th>
                <th className="py-3 px-4">{t.faydaId}</th>
                <th className="py-3 px-4">{t.gender} & {t.dob}</th>
                <th className="py-3 px-4">{t.region}</th>
                <th className="py-3 px-4">{t.allergies}</th>
                <th className="py-3 px-4">{t.encountersCount}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  return (
                    <tr key={patient.id} className="hover:bg-sky-50/50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                        {patient.npdms_id}
                        {patient.is_emergency_provisional === 1 && (
                          <span className="block text-[10px] text-rose-600 font-sans font-medium">
                            Emergency Provisional
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {patient.first_name} {patient.father_name} {patient.grandfather_name || ''}
                        </div>
                        {patient.first_name_amharic && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {patient.first_name_amharic} {patient.father_name_amharic || ''}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {patient.phone_number || 'No phone recorded'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {patient.fayda_status === 'VERIFIED' ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{patient.fayda_fin}</span>
                          </div>
                        ) : patient.is_emergency_provisional ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            Trauma Bypass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                            Provisional (No Fayda)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{patient.gender}</div>
                        <div className="text-[11px] text-slate-500">{patient.date_of_birth}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{patient.region}</div>
                        <div className="text-[11px] text-slate-500">{patient.zone_woreda}</div>
                      </td>
                      <td className="py-3 px-4">
                        {patient.allergy_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {patient.allergy_count} Alert(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None recorded</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                          {patient.encounter_count || 0} visits
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectPatient(patient.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 font-semibold rounded-lg transition text-xs shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t.viewChart}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">{t.registrationTitle}</h3>
                <p className="text-xs text-slate-400">Jimma University Medical Center & National Health Registry</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Step 1: Fayda Digital ID Lookup Simulator */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sky-900 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>{t.verifyWithFayda}</span>
                </div>
                <p className="text-xs text-slate-600">
                  {t.faydaFinPrompt}. Quick Demo FINs: <button type="button" onClick={() => setFaydaInput('1985-7821-4923')} className="underline text-sky-700 font-mono">1985-7821-4923</button> (Kemal), <button type="button" onClick={() => setFaydaInput('2001-3847-1920')} className="underline text-sky-700 font-mono">2001-3847-1920</button> (Chaltu), <button type="button" onClick={() => setFaydaInput('1992-6612-4410')} className="underline text-sky-700 font-mono">1992-6612-4410</button> (Gudeta).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={faydaInput}
                    onChange={(e) => setFaydaInput(e.target.value)}
                    placeholder="e.g. 1985-7821-4923"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleFaydaLookup}
                    disabled={faydaLoading}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {faydaLoading ? 'Verifying...' : t.lookupFayda}
                  </button>
                </div>

                {faydaResult && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">{t.faydaFound}:</span> {faydaResult.first_name} {faydaResult.father_name} ({faydaResult.first_name_amharic} {faydaResult.father_name_amharic}) - Verified Biometrics.
                    </div>
                  </div>
                )}

                {faydaError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{faydaError}</span>
                  </div>
                )}
              </div>

              {/* Duplicate Detection Warning Banner */}
              {duplicateWarning && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2 text-amber-900 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Probable Duplicate Record Flagged!</span>
                  </div>
                  <p>
                    A patient with matching demographics already exists in the system:
                    <span className="font-bold font-mono ml-1">{duplicateWarning.matched_npdms_id} ({duplicateWarning.matched_name})</span>.
                    This registration has been safely queued in the <strong>Duplicate Review Queue</strong> to prevent erroneous record merger.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegisterModal(false);
                      onSelectPatient(duplicateWarning.matched_id);
                    }}
                    className="px-3 py-1 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 text-xs"
                  >
                    Review Existing Patient Chart
                  </button>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Emergency Bypass checkbox */}
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                  <input
                    type="checkbox"
                    id="emergencyCheckbox"
                    checked={formData.is_emergency_provisional}
                    onChange={(e) => setFormData({ ...formData, is_emergency_provisional: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="emergencyCheckbox" className="font-semibold cursor-pointer">
                    {t.isEmergencyCase}
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.firstName} *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.fatherName} *</label>
                    <input
                      type="text"
                      required
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.grandfatherName}</label>
                    <input
                      type="text"
                      value={formData.grandfather_name}
                      onChange={(e) => setFormData({ ...formData, grandfather_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Amharic Script Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.firstNameAmharic}</label>
                    <input
                      type="text"
                      value={formData.first_name_amharic}
                      onChange={(e) => setFormData({ ...formData, first_name_amharic: e.target.value })}
                      placeholder="ምሳሌ፡ ከማል"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.fatherNameAmharic}</label>
                    <input
                      type="text"
                      value={formData.father_name_amharic}
                      onChange={(e) => setFormData({ ...formData, father_name_amharic: e.target.value })}
                      placeholder="ምሳሌ፡ መሀመድ"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.dob} *</label>
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.gender} *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.bloodType}</label>
                    <select
                      value={formData.blood_type}
                      onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Unknown">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.phone}</label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+251-9..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.region} *</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Oromia">Oromia</option>
                      <option value="Addis Ababa">Addis Ababa</option>
                      <option value="Amhara">Amhara</option>
                      <option value="Sidama">Sidama</option>
                      <option value="Somali">Somali</option>
                      <option value="Tigray">Tigray</option>
                      <option value="South Ethiopia">South Ethiopia</option>
                      <option value="Central Ethiopia">Central Ethiopia</option>
                      <option value="Afar">Afar</option>
                      <option value="Benishangul-Gumuz">Benishangul-Gumuz</option>
                      <option value="Gambella">Gambella</option>
                      <option value="Harari">Harari</option>
                      <option value="Dire Dawa">Dire Dawa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">{t.zoneWoreda}</label>
                    <input
                      type="text"
                      value={formData.zone_woreda}
                      onChange={(e) => setFormData({ ...formData, zone_woreda: e.target.value })}
                      placeholder="e.g. Jimma City / Mendera"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-slate-700 block">Emergency Next of Kin Contact</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Phone (+251-9...)"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Spouse, Father)"
                      value={formData.emergency_contact_relation}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                    {regError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    {t.saveRegistration}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
