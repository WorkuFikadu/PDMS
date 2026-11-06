// frontend/src/components/CrossHospitalAccess.jsx
// The central OTP Authorization Gateway for Cross-Hospital Patient Record Sharing
// Implements the full 8-step flow from the NPDMS Project Specification

import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, ShieldCheck, Smartphone, KeyRound, CheckCircle2, XCircle,
  AlertTriangle, Building2, User, Clock, ArrowRight, ChevronRight,
  RefreshCw, Ban, AlertOctagon, Heart, Pill, FlaskConical, FileText,
  Activity, Stethoscope, Calendar, Hospital, Lock, Unlock
} from 'lucide-react';

const STEPS = {
  SEARCH: 1,
  IDENTITY_CONFIRM: 2,
  OTP_PENDING: 3,
  OTP_VERIFY: 4,
  AUTHORIZED: 5
};

export default function CrossHospitalAccess({
  currentFacility, currentUser, t
}) {
  const [step, setStep] = useState(STEPS.SEARCH);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('npdms_id'); // npdms_id | fayda_fin | name

  // Patient identity found
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // OTP flow state
  const [otpRequestId, setOtpRequestId] = useState('');
  const [demoOtp, setDemoOtp] = useState(''); // DEMO MODE only
  const [phoneSentTo, setPhoneSentTo] = useState('');
  const [otpExpiry, setOtpExpiry] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(600); // 10 min in seconds

  // Authorized full record
  const [authorizedRecord, setAuthorizedRecord] = useState(null);
  const [activeRecordTab, setActiveRecordTab] = useState('summary');

  // OTP input refs for 6-cell input
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step !== STEPS.OTP_VERIFY) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setOtpError('OTP has expired. Please request a new code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // STEP 1 → 2: Search for the patient
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setFoundPatient(null);

    try {
      let url = `/api/patients?query=${encodeURIComponent(searchTerm.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setSearchError('No patient found matching that search. Please check the NPDMS ID or Fayda FIN and try again.');
      } else {
        setFoundPatient(data[0]);
        setStep(STEPS.IDENTITY_CONFIRM);
      }
    } catch (err) {
      setSearchError('Network error. Please verify the backend is accessible.');
    } finally {
      setSearchLoading(false);
    }
  };

  // STEP 2 → 3: Confirm identity and trigger OTP send
  const handleRequestOtp = async () => {
    if (!foundPatient) return;
    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/api/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: foundPatient.id,
          requesting_facility_id: currentFacility?.id || 'FAC-TASH',
          requesting_user_id: currentUser?.id || 'USR-REG-01',
          requesting_user_name: currentUser?.full_name || 'Registration Officer'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'Failed to send OTP. Please check patient phone number is on file.');
        return;
      }

      setOtpRequestId(data.otp_request_id);
      setDemoOtp(data.demo_otp || '');
      setPhoneSentTo(data.phone_sent_to);
      setOtpExpiry(data.expires_at);
      setCountdown(600);
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      setOtpError('Server error while generating OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // STEP 4: Verify OTP and unlock full record
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp_request_id: otpRequestId,
          otp_code: otpCode,
          requesting_user_id: currentUser?.id || 'USR-REG-01',
          requesting_user_name: currentUser?.full_name || 'Registration Officer',
          requesting_facility_id: currentFacility?.id || 'FAC-TASH'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'OTP verification failed.');
        setOtpCode('');
        otpInputRefs.current[0]?.focus();
        return;
      }

      setAuthorizedRecord(data);
      setStep(STEPS.AUTHORIZED);
    } catch (err) {
      setOtpError('Server error during OTP verification.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Cancel OTP and go back
  const handleCancel = async () => {
    if (otpRequestId) {
      try {
        await fetch(`/api/otp/cancel/${otpRequestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser?.id,
            user_name: currentUser?.full_name,
            facility_id: currentFacility?.id
          })
        });
      } catch (e) {}
    }
    setStep(STEPS.SEARCH);
    setFoundPatient(null);
    setOtpCode('');
    setOtpError('');
    setOtpRequestId('');
    setDemoOtp('');
    setAuthorizedRecord(null);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-sky-700 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Share2 className="w-6 h-6" />
              Cross-Hospital Record Access Gateway
            </h2>
            <p className="text-indigo-200 text-xs mt-1 leading-relaxed">
              Secure OTP-based patient authorization for sharing longitudinal medical records across Ethiopian hospitals.
              <span className="font-bold text-white"> One Patient · One Identity · One Continuous Record.</span>
            </p>
          </div>

          {/* Active Facility Banner */}
          <div className="bg-white/15 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-xs text-right shrink-0">
            <span className="text-indigo-200 block text-[10px] uppercase font-bold">Requesting Hospital</span>
            <span className="font-bold text-white">{currentFacility?.name || 'Current Facility'}</span>
            <span className="block text-indigo-300 text-[10px]">{currentFacility?.code}</span>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center gap-2 mt-6 text-xs">
          {[
            { n: 1, label: 'Patient Search', icon: User },
            { n: 2, label: 'Identity Confirm', icon: ShieldCheck },
            { n: 3, label: 'OTP Sent', icon: Smartphone },
            { n: 4, label: 'Patient Authorizes', icon: KeyRound },
            { n: 5, label: 'Records Unlocked', icon: Unlock }
          ].map(({ n, label, icon: Icon }, idx) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all ${step === n ? 'bg-white text-indigo-800 shadow-md scale-105' : step > n ? 'bg-emerald-500/80 text-white' : 'bg-white/15 text-indigo-300'}`}>
                {step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                <span className="sm:hidden">{n}</span>
              </div>
              {idx < 4 && <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ============================================= */}
      {/* STEP 1: SEARCH FOR PATIENT                   */}
      {/* ============================================= */}
      {step === STEPS.SEARCH && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              Step 1: Identify the Patient
            </h3>
            <p className="text-xs text-slate-500">
              Enter the patient's Fayda National ID, internal NPDMS ID, or demographic details to locate their record.
            </p>
          </div>

          <div className="flex gap-2 text-xs">
            {[
              { key: 'npdms_id', label: 'NPDMS ID' },
              { key: 'fayda_fin', label: 'Fayda FIN' },
              { key: 'name', label: 'Full Name / Phone' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSearchType(opt.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${searchType === opt.key ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchType === 'npdms_id' ? 'e.g. ETH-NPDMS-2026-004128' :
                searchType === 'fayda_fin' ? 'e.g. 1985-7821-4923' :
                'e.g. Kemal Mohammed or +251-91...'
              }
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-mono"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchTerm.trim()}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition text-sm"
            >
              {searchLoading ? 'Searching...' : 'Find Patient'}
            </button>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Demo Quick Access Panel */}
          <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl space-y-2 text-xs">
            <span className="font-bold text-sky-900 block">Quick Demo Patients:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Kemal Mohammed (PAT-001)', id: 'ETH-NPDMS-2026-004128' },
                { label: 'Chaltu Desta (PAT-002)', id: 'ETH-NPDMS-2026-009845' },
                { label: 'Almaz Hailu (PAT-005)', id: 'ETH-NPDMS-2026-007742' }
              ].map(demo => (
                <button
                  key={demo.id}
                  onClick={() => { setSearchTerm(demo.id); setSearchType('npdms_id'); }}
                  className="px-3 py-1.5 bg-white border border-sky-200 text-sky-800 font-semibold rounded-lg hover:bg-sky-100 transition"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* STEP 2: IDENTITY CONFIRMATION                 */}
      {/* ============================================= */}
      {step === STEPS.IDENTITY_CONFIRM && foundPatient && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Step 2: Verify Patient Identity
            </h3>
            <p className="text-xs text-slate-500">
              Confirm this is the correct patient before triggering OTP authorization.
            </p>
          </div>

          {/* Patient Identity Card */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-sky-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  {foundPatient.first_name} {foundPatient.father_name} {foundPatient.grandfather_name || ''}
                </h4>
                {foundPatient.first_name_amharic && (
                  <div className="text-slate-600 font-semibold text-base">
                    {foundPatient.first_name_amharic} {foundPatient.father_name_amharic || ''}
                  </div>
                )}
              </div>

              <div className="text-right space-y-1">
                <div className="font-mono text-sm font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg border border-sky-200">
                  {foundPatient.npdms_id}
                </div>
                {foundPatient.fayda_status === 'VERIFIED' ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    Fayda Verified
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                    Provisional ID
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">DOB / Age</span>
                <span className="font-bold text-slate-800">{foundPatient.date_of_birth}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Gender</span>
                <span className="font-bold text-slate-800">{foundPatient.gender}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Region</span>
                <span className="font-bold text-slate-800">{foundPatient.region}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Blood Group</span>
                <span className="font-bold text-slate-800">{foundPatient.blood_type || 'Unknown'}</span>
              </div>
            </div>

            {/* Prior visit count indicator */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                This patient has <strong>{foundPatient.encounter_count || 0} prior clinical encounters</strong> across Ethiopian hospitals.
                <span className="ml-2 text-indigo-600">{foundPatient.allergy_count > 0 ? `⚠️ ${foundPatient.allergy_count} documented allerg${foundPatient.allergy_count > 1 ? 'ies' : 'y'}` : 'No known allergies on file.'}</span>
              </span>
            </div>
          </div>

          {/* OTP will be sent to */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Smartphone className="w-4 h-4 text-amber-700" />
              <span>OTP Delivery Notice (Patient Privacy)</span>
            </div>
            <p className="text-amber-800">
              A one-time password will be sent to the patient's <strong>verified Fayda-linked mobile number</strong>.
              The patient must present the code to authorize this hospital's access to their medical records.
              The code will expire in <strong>10 minutes</strong> and cannot be reused.
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
              {otpError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
            >
              ← Back to Search
            </button>
            <button
              onClick={handleRequestOtp}
              disabled={otpLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition text-sm"
            >
              <Smartphone className="w-4 h-4" />
              {otpLoading ? 'Sending OTP...' : 'Send Authorization Code to Patient\'s Phone'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* STEP 4: OTP VERIFICATION INPUT               */}
      {/* ============================================= */}
      {step === STEPS.OTP_VERIFY && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Step 3–4: Patient Authorization via OTP
            </h3>
            <p className="text-xs text-slate-500">
              A one-time code was sent to the patient. Ask the patient to show you the SMS code they received.
            </p>
          </div>

          {/* OTP Sent Confirmation Banner */}
          <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900">OTP Sent Successfully!</p>
                  <p className="text-xs text-indigo-700">
                    6-digit code dispatched to patient's phone: <strong>{phoneSentTo}</strong>
                  </p>
                </div>
              </div>
              <div className={`text-right text-xs font-bold ${countdown < 60 ? 'text-rose-600' : 'text-indigo-800'}`}>
                <div className="text-[10px] text-indigo-500 uppercase">Expires In</div>
                <div className="text-2xl font-mono">{formatCountdown(countdown)}</div>
              </div>
            </div>

            {/* DEMO MODE: Show the OTP code in a visible sandbox box */}
            {demoOtp && (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-center space-y-1">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                  🧪 DEMO MODE — OTP Visible (In Production: Sent By SMS Only)
                </p>
                <p className="text-xs text-amber-700">
                  Simulating SMS to {phoneSentTo}. The patient's code is:
                </p>
                <div className="text-3xl font-black font-mono tracking-[0.4em] text-amber-900 select-all">
                  {demoOtp}
                </div>
                <button
                  onClick={() => setOtpCode(demoOtp)}
                  className="text-xs px-3 py-1 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 transition"
                >
                  Auto-fill Code (Demo)
                </button>
              </div>
            )}
          </div>

          {/* 6-Digit OTP Entry */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700 text-center">
              Enter the 6-digit code the patient received by SMS:
            </p>

            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  ref={el => otpInputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpCode[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const arr = otpCode.split('');
                    arr[i] = val;
                    setOtpCode(arr.join('').slice(0, 6));
                    if (val && i < 5) otpInputRefs.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
                      otpInputRefs.current[i - 1]?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setOtpCode(pasted);
                    e.preventDefault();
                  }}
                  className="w-12 h-14 text-2xl font-black text-center border-2 border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-mono"
                />
              ))}
            </div>
          </div>

          {otpError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {/* Security notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              Security Reminder
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>This OTP expires in 10 minutes and can only be used once.</li>
              <li>Every access attempt and successful authorization is permanently logged.</li>
              <li>If the patient did not consent, click "Patient Denied" to cancel.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-300 text-rose-700 font-semibold rounded-xl text-xs hover:bg-rose-50 transition"
            >
              <Ban className="w-4 h-4" />
              Patient Denied
            </button>
            <button
              onClick={() => { setStep(STEPS.IDENTITY_CONFIRM); handleRequestOtp(); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Resend OTP
            </button>
            <button
              onClick={handleVerifyOtp}
              disabled={otpCode.length !== 6 || otpLoading || countdown === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl shadow-xs transition text-sm"
            >
              {otpLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verify & Unlock Medical Records
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* STEP 5: AUTHORIZED — FULL RECORD VIEW         */}
      {/* ============================================= */}
      {step === STEPS.AUTHORIZED && authorizedRecord && (
        <div className="space-y-5">
          {/* Authorization Success Banner */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-sky-700 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Unlock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                  Patient Authorization Successful
                </p>
                <h3 className="text-xl font-black">
                  {authorizedRecord.patient?.first_name} {authorizedRecord.patient?.father_name}'s Full Medical Record
                </h3>
                <p className="text-xs text-emerald-200">
                  Session valid until {authorizedRecord.authorization?.session_expires_at} UTC •
                  Consent: {authorizedRecord.authorization?.consent_id}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition border border-white/30"
            >
              Close Session
            </button>
          </div>

          {/* Critical Allergy Alert */}
          {authorizedRecord.patient?.allergies?.length > 0 && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                <AlertOctagon className="w-5 h-5 text-rose-600 animate-pulse" />
                CRITICAL: Documented Drug Allergies — Must Review Before Prescribing
              </div>
              <div className="flex flex-wrap gap-2">
                {authorizedRecord.patient.allergies.map((alg, i) => (
                  <div key={i} className="px-3 py-2 bg-white border-2 border-rose-300 rounded-xl text-xs">
                    <span className="font-bold text-rose-700 block">{alg.allergen}</span>
                    <span className="text-rose-600">{alg.reaction}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">{alg.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Quick Demographics */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">NPDMS ID</span>
              <span className="font-mono font-bold text-sky-700">{authorizedRecord.patient?.npdms_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Birth</span>
              <span className="font-bold text-slate-800">{authorizedRecord.patient?.date_of_birth}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
              <span className="font-bold text-slate-800">{authorizedRecord.patient?.blood_type || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Fayda Identity</span>
              {authorizedRecord.patient?.fayda_status === 'VERIFIED' ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="font-bold text-amber-700">Provisional</span>
              )}
            </div>
          </div>

          {/* Active Medications */}
          {authorizedRecord.patient?.activeMedications?.length > 0 && (
            <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-600" />
                Active Medications (Prescribed at Prior Hospitals)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {authorizedRecord.patient.activeMedications.map((rx, i) => (
                  <div key={i} className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="font-bold text-slate-900">{rx.medication_name}</div>
                    <div className="text-indigo-800 font-semibold">{rx.dosage} · {rx.frequency} · {rx.duration}</div>
                    {rx.instructions && <div className="text-slate-500 text-[11px] mt-0.5">{rx.instructions}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Record Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-200 text-xs font-semibold">
              {[
                { key: 'encounters', label: 'Encounters', icon: Activity, count: authorizedRecord.medicalRecord?.encounters?.length },
                { key: 'diagnoses', label: 'Diagnoses', icon: Stethoscope, count: authorizedRecord.medicalRecord?.diagnoses?.length },
                { key: 'labs', label: 'Lab Results', icon: FlaskConical, count: authorizedRecord.medicalRecord?.labs?.length },
                { key: 'procedures', label: 'Procedures', icon: Hospital, count: authorizedRecord.medicalRecord?.procedures?.length },
                { key: 'referrals', label: 'Referrals', icon: Share2, count: authorizedRecord.medicalRecord?.referrals?.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveRecordTab(tab.key)}
                  className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition whitespace-nowrap ${activeRecordTab === tab.key ? 'border-sky-600 text-sky-700 bg-sky-50/60' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeRecordTab === tab.key ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Encounters Tab */}
              {activeRecordTab === 'encounters' && (
                <>
                  {(authorizedRecord.medicalRecord?.encounters || []).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No encounters on record.</p>
                  ) : (
                    authorizedRecord.medicalRecord.encounters.map(enc => (
                      <div key={enc.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 font-bold text-sky-800">
                              <Building2 className="w-3.5 h-3.5" />
                              {enc.facility_name} ({enc.facility_code})
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {enc.started_at} · {enc.encounter_type.replace('_', ' ')} · {enc.provider_name}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md font-bold text-[10px]">
                            {enc.status}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900">
                          Chief Complaint: "{enc.chief_complaint}"
                        </div>
                        {enc.vitals && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono">BP: {enc.vitals.bp || '--'}</span>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono">Pulse: {enc.vitals.pulse || '--'}</span>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono">Temp: {enc.vitals.temp || '--'}°C</span>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono">SpO2: {enc.vitals.spo2 || '--'}%</span>
                          </div>
                        )}
                        {enc.soapNotes?.plan && (
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                            <span className="font-bold text-slate-800 block mb-0.5 text-[10px] uppercase">Treatment Plan:</span>
                            {enc.soapNotes.plan}
                          </div>
                        )}
                        {enc.treatment_rationale && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                            <span className="font-bold text-[10px] uppercase block">Continuity Note:</span>
                            {enc.treatment_rationale}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Diagnoses Tab */}
              {activeRecordTab === 'diagnoses' && (
                <div className="space-y-2">
                  {(authorizedRecord.medicalRecord?.diagnoses || []).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No diagnoses on record.</p>
                  ) : (
                    authorizedRecord.medicalRecord.diagnoses.map(dx => (
                      <div key={dx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-mono font-bold text-sky-700 mr-2">{dx.icd10_code}</span>
                          <span className="font-bold text-slate-900">{dx.condition_name}</span>
                          {dx.notes && <div className="text-slate-500 text-[11px] mt-0.5">{dx.notes}</div>}
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">{dx.diagnosis_type}</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{dx.recorded_at}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Labs Tab */}
              {activeRecordTab === 'labs' && (
                <div className="space-y-2">
                  {(authorizedRecord.medicalRecord?.labs || []).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No completed lab results on record.</p>
                  ) : (
                    authorizedRecord.medicalRecord.labs.map(lab => (
                      <div key={lab.id} className={`p-3 rounded-xl border text-xs ${lab.interpretation === 'CRITICAL' ? 'bg-rose-50 border-rose-300' : lab.interpretation === 'ABNORMAL' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{lab.test_name}</span>
                          <span className={`font-bold font-mono text-sm ${lab.interpretation === 'CRITICAL' ? 'text-rose-700' : lab.interpretation === 'ABNORMAL' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {lab.result_value} {lab.units}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Reference: {lab.normal_range} · {lab.category} · {lab.completed_at}
                        </div>
                        {lab.findings_notes && <div className="text-slate-700 mt-1 font-medium">{lab.findings_notes}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Procedures Tab */}
              {activeRecordTab === 'procedures' && (
                <div className="space-y-2">
                  {(authorizedRecord.medicalRecord?.procedures || []).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No surgical procedures on record.</p>
                  ) : (
                    authorizedRecord.medicalRecord.procedures.map(proc => (
                      <div key={proc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="font-bold text-slate-900">{proc.procedure_name}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">Indication: {proc.indication} · {proc.performed_at}</div>
                        {proc.operative_notes && <div className="text-slate-700 mt-1 text-xs">{proc.operative_notes}</div>}
                        {proc.outcome && <div className="text-emerald-700 font-semibold mt-1 text-[11px]">Outcome: {proc.outcome}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Referrals Tab */}
              {activeRecordTab === 'referrals' && (
                <div className="space-y-2">
                  {(authorizedRecord.medicalRecord?.referrals || []).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No referrals on record.</p>
                  ) : (
                    authorizedRecord.medicalRecord.referrals.map(ref => (
                      <div key={ref.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <Building2 className="w-3.5 h-3.5 text-sky-600" />
                          {ref.from_facility_id} → {ref.to_facility_id}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ref.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{ref.urgency}</span>
                        </div>
                        <div className="text-slate-700 font-medium">{ref.referral_reason}</div>
                        {ref.counter_referral_summary && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 text-[11px]">
                            Counter-Referral: {ref.counter_referral_summary}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
