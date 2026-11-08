// frontend/src/components/PatientRegistry.jsx
import React, { useState } from 'react';
import {
  Search, UserPlus, ShieldCheck, AlertCircle, AlertTriangle,
  HeartPulse, Phone, MapPin, Eye, CheckCircle2, X, Users,
  Building2, Activity, Sparkles, KeyRound, QrCode, Fingerprint,
  Camera, Printer, Download, Check, Truck
} from 'lucide-react';
import DigitalHealthCardModal from './DigitalHealthCardModal';

export default function PatientRegistry({
  patients, loading, onSelectPatient, onRefresh,
  currentFacility, currentUser, t,
  searchTerm: externalSearchTerm, setSearchTerm: setExternalSearchTerm
}) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = setExternalSearchTerm || setInternalSearchTerm;
  const [filterType, setFilterType] = useState('ALL');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCardPatient, setSelectedCardPatient] = useState(null);
  const [showTriageScanner, setShowTriageScanner] = useState(false);
  const [verificationMode, setVerificationMode] = useState('FIN'); // 'FIN' | 'QR' | 'BIOMETRIC'
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricProgress, setBiometricProgress] = useState(0);

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

  // Fayda Unified Lookup Function (FIN, QR, or Biometric)
  const executeFaydaLookup = async (finToLookup) => {
    const fin = (finToLookup || faydaInput).trim();
    if (!fin) return;
    setFaydaInput(fin);
    setFaydaLoading(true);
    setFaydaError('');
    setFaydaResult(null);

    try {
      const res = await fetch('/api/fayda/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin })
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
          blood_type: data.data.blood_type || prev.blood_type,
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

  const handleFaydaLookup = () => executeFaydaLookup(faydaInput);

  const handleBiometricScan = (fin = '1985-7821-4923') => {
    setBiometricScanning(true);
    setFaydaError('');
    setFaydaResult(null);
    setBiometricProgress(20);

    let progress = 20;
    const interval = setInterval(() => {
      progress += 25;
      setBiometricProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setBiometricScanning(false);
        executeFaydaLookup(fin);
      }
    }, 180);
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

  const verifiedCount = patients.filter(p => p.fayda_status === 'VERIFIED').length;
  const verifiedPercent = Math.round((verifiedCount / (patients.length || 1)) * 100);

  return (
    <div className="space-y-4">
      {/* 1. TOP METRIC STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Patients</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{patients.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">National Master Index</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fayda Verified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{verifiedPercent}%</div>
          <p className="text-[11px] text-emerald-600/80 font-medium">{verifiedCount} of {patients.length} biometrically linked</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Hospitals</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900">4 Facilities</div>
          <p className="text-[11px] text-slate-500 font-medium">JMC, Shenen Gibe, Agaro, TASH</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Continuity Sync</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900">100%</div>
          <p className="text-[11px] text-purple-700 font-medium">Longitudinal Health Spine</p>
        </div>
      </div>

      {/* 2. COMPACT FAYDA NATIONAL ARCHITECTURE BAR WITH TEST CHIPS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl px-4 py-2.5 border border-indigo-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center font-bold text-xs shrink-0">
            🇪🇹
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-white tracking-tight flex items-center gap-2">
              One Patient • One Fayda Identity • Treated Anywhere, Stored in One Record
            </h3>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hospital treatments at Agaro, Jimma Medical Center, and Tikur Anbessa auto-consolidate into one file.
            </p>
          </div>
        </div>

        {/* Quick Test Fayda FIN Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase hidden lg:inline">Quick FIN:</span>
          <button
            onClick={() => setSearchTerm('1985-7821-4923')}
            className="px-2.5 py-1 bg-slate-800/90 hover:bg-sky-900/60 text-sky-300 border border-slate-700 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>1985-7821-4923</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">(Kemal)</span>
          </button>
          <button
            onClick={() => setSearchTerm('2001-9984-5512')}
            className="px-2.5 py-1 bg-slate-800/90 hover:bg-sky-900/60 text-sky-300 border border-slate-700 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>2001-9984-5512</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">(Chaltu)</span>
          </button>
        </div>
      </div>

      {/* 3. CLEAN UNIFIED SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
              filterType === 'ALL' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilterType('VERIFIED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
              filterType === 'VERIFIED' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Fayda Verified
          </button>
          <button
            onClick={() => setFilterType('UNLINKED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
              filterType === 'UNLINKED' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Provisional
          </button>
          <button
            onClick={() => setFilterType('EMERGENCY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
              filterType === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            Emergency Trauma
          </button>
        </div>

        {/* Action Buttons: Triage QR Scanner + Register */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTriageScanner(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap border border-slate-200"
            title="Scan Patient Health Card / Fayda QR in Reception"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-600" />
            <span>Scan Triage QR</span>
          </button>

          <button
            onClick={() => {
              setShowRegisterModal(true);
              setFaydaResult(null);
              setFaydaError('');
              setDuplicateWarning(null);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.registerPatient}</span>
          </button>
        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCardPatient(patient)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 font-semibold rounded-lg transition text-xs cursor-pointer shadow-2xs"
                            title="View & Print Official Digital Health Card with QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5 text-sky-600" />
                            <span className="hidden sm:inline">ID Card</span>
                          </button>
                          <button
                            onClick={() => onSelectPatient(patient.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 font-semibold rounded-lg transition text-xs shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t.viewChart}
                          </button>
                        </div>
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
                <p className="text-xs text-slate-400">Federal Ministry of Health • National Health Registry</p>
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
              {/* Step 1: Fayda Digital ID Lookup & Biometric Verification */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>Fayda Ethiopian National Digital ID Verification</span>
                  </div>

                  {/* 3 Verification Mode Pills */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-sky-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setVerificationMode('FIN')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        verificationMode === 'FIN' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⌨️ FIN Lookup
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMode('QR')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        verificationMode === 'QR' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan Card QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMode('BIOMETRIC')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        verificationMode === 'BIOMETRIC' ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Biometric Fingerprint</span>
                    </button>
                  </div>
                </div>

                {/* Mode A: FIN Manual Input */}
                {verificationMode === 'FIN' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      {t.faydaFinPrompt}. Quick Demo FINs:{' '}
                      <button type="button" onClick={() => executeFaydaLookup('1985-7821-4923')} className="underline text-sky-700 font-mono font-bold cursor-pointer">1985-7821-4923</button> (Kemal),{' '}
                      <button type="button" onClick={() => executeFaydaLookup('2001-3847-1920')} className="underline text-sky-700 font-mono font-bold cursor-pointer">2001-3847-1920</button> (Chaltu),{' '}
                      <button type="button" onClick={() => executeFaydaLookup('1992-6612-4410')} className="underline text-sky-700 font-mono font-bold cursor-pointer">1992-6612-4410</button> (Gudeta).
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={faydaInput}
                        onChange={(e) => setFaydaInput(e.target.value)}
                        placeholder="e.g. 1985-7821-4923"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleFaydaLookup}
                        disabled={faydaLoading}
                        className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        {faydaLoading ? 'Verifying...' : t.lookupFayda}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode B: QR Scanner Simulator */}
                {verificationMode === 'QR' && (
                  <div className="bg-white p-3 rounded-xl border border-sky-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-sky-600" />
                        Optical Barcode & Fayda QR Scanner
                      </span>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">SCANNER READY</span>
                    </div>
                    <div className="relative border-2 border-dashed border-sky-300 rounded-xl p-4 bg-slate-900 text-center text-white overflow-hidden">
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <QrCode className="w-10 h-10 text-sky-400 animate-pulse" />
                        <p className="text-xs text-sky-200">Align physical Fayda National ID Card in front of terminal camera</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => executeFaydaLookup('1985-7821-4923')}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-mono rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            📷 Scan Kemal's Fayda QR
                          </button>
                          <button
                            type="button"
                            onClick={() => executeFaydaLookup('2001-3847-1920')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            📷 Scan Chaltu's Fayda QR
                          </button>
                          <button
                            type="button"
                            onClick={() => executeFaydaLookup('1992-6612-4410')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            📷 Scan Gudeta's Fayda QR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode C: Biometric Fingerprint Auth */}
                {verificationMode === 'BIOMETRIC' && (
                  <div className="bg-white p-3 rounded-xl border border-sky-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-indigo-600" />
                        MOSIP Fayda Certified Biometric Optical Sensor
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${biometricScanning ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`}>
                        {biometricScanning ? `Matching Minutiae (${biometricProgress}%)...` : 'Sensor Ready'}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                          biometricScanning
                            ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-400/40'
                            : faydaResult
                            ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-400/30'
                            : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          <Fingerprint className={`w-7 h-7 ${biometricScanning ? 'animate-bounce' : ''}`} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">
                            {biometricScanning ? 'Reading Right Thumb Print...' : faydaResult ? 'Biometric Match Confirmed (99.8%)' : 'Place Patient Thumb on Scanner'}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Matches template with FDRE National ID Authority Biometric Engine
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBiometricScan('1985-7821-4923')}
                          disabled={biometricScanning}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {biometricScanning ? 'Scanning...' : 'Scan Thumb (Kemal)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBiometricScan('2001-3847-1920')}
                          disabled={biometricScanning}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {biometricScanning ? 'Scanning...' : 'Scan Thumb (Chaltu)'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verified Fayda Result Badge */}
                {faydaResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-3 animate-in fade-in">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm">{faydaResult.first_name} {faydaResult.father_name}</span>
                        {faydaResult.first_name_amharic && (
                          <span className="text-slate-600 font-medium">({faydaResult.first_name_amharic} {faydaResult.father_name_amharic})</span>
                        )}
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                          Biometrics Verified
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>FIN: <strong className="font-mono">{faydaResult.fin}</strong></span>
                        <span>DOB: <strong>{faydaResult.date_of_birth}</strong></span>
                        <span>Gender: <strong>{faydaResult.gender}</strong></span>
                        <span>Blood: <strong>{faydaResult.blood_type || 'A+'}</strong></span>
                        <span>Region: <strong>{faydaResult.region}</strong></span>
                      </div>
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
      {/* DIGITAL HEALTH CARD MODAL */}
      {selectedCardPatient && (
        <DigitalHealthCardModal
          patient={selectedCardPatient}
          onClose={() => setSelectedCardPatient(null)}
        />
      )}

      {/* QUICK TRIAGE QR / BARCODE SCANNER MODAL */}
      {showTriageScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Hospital Triage QR Scanner</h3>
                  <p className="text-[11px] text-slate-500">Scan physical card to pull longitudinal chart</p>
                </div>
              </div>
              <button onClick={() => setShowTriageScanner(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative border-2 border-dashed border-sky-300 rounded-2xl p-6 bg-slate-900 text-center text-white overflow-hidden space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
                <QrCode className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-xs text-sky-300">Targeting Optical Scanner</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Place patient's Digital Health Pass or Fayda ID under scanner</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Simulate Triage Scan on Registered Patient:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setShowTriageScanner(false);
                      onSelectPatient(p.id);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition cursor-pointer text-left"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.first_name} {p.father_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.npdms_id} · {p.fayda_fin || 'No Fayda'}</div>
                    </div>
                    <span className="px-2 py-1 bg-sky-600 text-white font-bold rounded-lg text-[10px]">
                      Open Chart →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowTriageScanner(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
