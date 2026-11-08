// frontend/src/components/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import {
  ShieldCheck, Lock, User, Building2, KeyRound, Fingerprint,
  QrCode, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff,
  Stethoscope, Sparkles, HeartPulse, Hospital, Shield, Globe,
  RotateCcw, MessageSquare, X, Check, Activity, Bed, Users
} from 'lucide-react';

// Built-in national facility catalog fallback (guarantees zero empty dropdowns)
const DEFAULT_ETHIOPIAN_FACILITIES = [
  { id: 'FAC-JUMC', name: 'Jimma Medical Center (JMC)', code: 'JMC-ETH', region: 'Oromia' },
  { id: 'FAC-TASH', name: 'Tikur Anbessa (Black Lion) Specialized Hospital', code: 'TASH-ETH', region: 'Addis Ababa' },
  { id: 'FAC-ALERT', name: 'ALERT Hospital (All Africa Leprosy)', code: 'ALERT-ETH', region: 'Addis Ababa' },
  { id: 'FAC-YEKAT', name: 'Yekatit 12 Hospital Medical College', code: 'YEK12-ETH', region: 'Addis Ababa' },
  { id: 'FAC-GHION', name: "St. Paul's Hospital Millennium Medical College", code: 'SPHMMC-ETH', region: 'Addis Ababa' },
  { id: 'FAC-SHENEN', name: 'Shenen Gibe General Hospital', code: 'SGGH-ETH', region: 'Oromia' },
  { id: 'FAC-AGARO', name: 'Agaro General Hospital', code: 'AGARO-ETH', region: 'Oromia' },
  { id: 'FAC-NEKMT', name: 'Nekemte Specialized Hospital', code: 'NSH-ETH', region: 'Oromia' },
  { id: 'FAC-GONDAR', name: 'University of Gondar Comprehensive Hospital', code: 'UOG-ETH', region: 'Amhara' },
  { id: 'FAC-HAWASA', name: 'Hawassa University Comprehensive Referral Hosp', code: 'HUCSH-ETH', region: 'Sidama' },
  { id: 'FAC-MEKELE', name: 'Ayder Comprehensive Specialized Hospital', code: 'AYDER-ETH', region: 'Tigray' },
  { id: 'FAC-DESIE', name: 'Dessie Comprehensive Specialized Hospital', code: 'DCSH-ETH', region: 'Amhara' },
  { id: 'FAC-ADAMA', name: 'Adama Hospital Medical College', code: 'AHMC-ETH', region: 'Oromia' }
];

// Department clinical roles defined by healthcare facility
const HOSPITAL_ROLES = {
  'FAC-JUMC': [
    { roleTitle: 'Specialist Physician & Consultant', dept: 'OPD & Internal Medicine', username: 'dr_abebe', role: 'DOCTOR', icon: '🩺' },
    { roleTitle: 'Emergency & Triage Nursing Officer', dept: 'Emergency Department & Triage', username: 'nurse_fatuma', role: 'NURSE', icon: '👩‍⚕️' },
    { roleTitle: 'Clinical Pharmacist & Dispenser', dept: 'Central Digital Pharmacy', username: 'pharm_tigist', role: 'PHARMACIST', icon: '💊' },
    { roleTitle: 'Diagnostic Laboratory Technologist', dept: 'Pathology & Clinical Chemistry', username: 'lab_dawit', role: 'LAB_TECH', icon: '🔬' },
    { roleTitle: 'Patient Admissions & Records Officer', dept: 'Fayda National Health Registry', username: 'reg_almaz', role: 'REGISTRATION_OFFICER', icon: '📋' },
    { roleTitle: 'Medical Director & Hospital Administrator', dept: 'Executive Hospital Governance', username: 'admin_worku', role: 'FACILITY_ADMIN', icon: '🛡️' }
  ],
  'FAC-SHENEN': [
    { roleTitle: 'General Surgeon & Clinical Physician', dept: 'General Surgery & Inpatient', username: 'dr_chala', role: 'DOCTOR', icon: '🩺' },
    { roleTitle: 'Inpatient & Maternity Ward Nurse', dept: 'Inpatient Nursing Services', username: 'nurse_fatuma', role: 'NURSE', icon: '👩‍⚕️' },
    { roleTitle: 'Pharmacy & Drug Store Lead', dept: 'Hospital Pharmacy', username: 'pharm_tigist', role: 'PHARMACIST', icon: '💊' },
    { roleTitle: 'Patient Intake & Registration Officer', dept: 'Reception & Records', username: 'reg_almaz', role: 'REGISTRATION_OFFICER', icon: '📋' }
  ],
  'FAC-AGARO': [
    { roleTitle: 'Primary Care Physician / Clinic Lead', dept: 'General Outpatient & Triage', username: 'dr_tariku', role: 'DOCTOR', icon: '🩺' },
    { roleTitle: 'Community Health & Maternal Nurse', dept: 'Primary Care & Referral', username: 'nurse_fatuma', role: 'NURSE', icon: '👩‍⚕️' },
    { roleTitle: 'Rural Health Intake & Registry Officer', dept: 'Outpatient Registration Desk', username: 'reg_almaz', role: 'REGISTRATION_OFFICER', icon: '📋' }
  ],
  'FAC-TASH': [
    { roleTitle: 'Tertiary Referral Specialist & Oncologist', dept: 'Specialized Consultations & Oncology', username: 'dr_abebe', role: 'DOCTOR', icon: '🩺' },
    { roleTitle: 'Trauma & Critical Care Nurse', dept: 'Emergency Trauma Center (ICU)', username: 'nurse_fatuma', role: 'NURSE', icon: '👩‍⚕️' },
    { roleTitle: 'Hospital Pharmacotherapy Specialist', dept: 'Specialized Pharmacy Services', username: 'pharm_tigist', role: 'PHARMACIST', icon: '💊' },
    { roleTitle: 'National Health Spine Administrator', dept: 'MOH Interoperability Office', username: 'admin_worku', role: 'FACILITY_ADMIN', icon: '🛡️' }
  ]
};

const getRolesForFacility = (facId, facName) => {
  if (HOSPITAL_ROLES[facId]) return HOSPITAL_ROLES[facId];
  return [
    { roleTitle: 'Attending Physician / Specialist', dept: `${facName || 'Hospital'} · Medical OPD`, username: 'dr_abebe', role: 'DOCTOR', icon: '🩺' },
    { roleTitle: 'Head Nurse & Triage In-Charge', dept: `${facName || 'Hospital'} · Clinical Ward`, username: 'nurse_fatuma', role: 'NURSE', icon: '👩‍⚕️' },
    { roleTitle: 'Hospital Pharmacist', dept: `${facName || 'Hospital'} · Dispensary`, username: 'pharm_tigist', role: 'PHARMACIST', icon: '💊' },
    { roleTitle: 'Registration & Admissions Officer', dept: `${facName || 'Hospital'} · Patient Intake`, username: 'reg_almaz', role: 'REGISTRATION_OFFICER', icon: '📋' }
  ];
};

export default function LoginPage({
  onLoginSuccess, facilities = [], lang = 'en', setLang
}) {
  const [authMode, setAuthMode] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'FAYDA'
  const [selectedFacilityId, setSelectedFacilityId] = useState('FAC-JUMC');
  const [selectedRoleTitle, setSelectedRoleTitle] = useState('Specialist Physician & Consultant');
  const [username, setUsername] = useState('dr_abebe');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);

  // Fayda login state
  const [faydaFin, setFaydaFin] = useState('1985-7821-4923');
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  // Fayda OTP flow state
  const [faydaStep, setFaydaStep] = useState(1); // 1=enter FIN, 2=enter OTP
  const [faydaOtp, setFaydaOtp] = useState('');
  const [faydaMaskedPhone, setFaydaMaskedPhone] = useState('');
  const [faydaDemoOtp, setFaydaDemoOtp] = useState('');
  const [faydaOtpLoading, setFaydaOtpLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password State & Handlers
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('dr_abebe');
  const [forgotChannel, setForgotChannel] = useState('SMS');
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Compute active facilities list with built-in fallback
  const activeFacilities = (facilities && facilities.length > 0) ? facilities : DEFAULT_ETHIOPIAN_FACILITIES;

  // Default facility initialization
  useEffect(() => {
    if (activeFacilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(activeFacilities[0].id);
    }
  }, [activeFacilities]);

  const selectedFacility = activeFacilities.find(f => f.id === selectedFacilityId) || activeFacilities[0];

  const facilityRoles = getRolesForFacility(selectedFacilityId, selectedFacility?.name);

  // When facility changes, auto-select the first clinical role for that facility
  const handleFacilityChange = (facId) => {
    setSelectedFacilityId(facId);
    const targetFac = activeFacilities.find(f => f.id === facId);
    const roles = getRolesForFacility(facId, targetFac?.name);
    if (roles.length > 0) {
      setSelectedRoleTitle(roles[0].roleTitle);
      setUsername(roles[0].username);
      setPassword('demo123');
    }
  };

  const selectHospitalRole = (roleItem) => {
    setSelectedRoleTitle(roleItem.roleTitle);
    setUsername(roleItem.username);
    setPassword('demo123');
  };

  const handleStandardLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          facility_id: selectedFacilityId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
      } else {
        localStorage.setItem('npdms_auth_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('npdms_auth_token', data.token);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg('Network error connecting to National Health Spine authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaydaLogin = async (overrideFin, isBiometric = false) => {
    setErrorMsg('');
    const finToUse = overrideFin || faydaFin;
    if (!finToUse.trim()) {
      setErrorMsg('Please enter a valid 12-digit Fayda FIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/fayda-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fayda_fin: finToUse.trim(),
          biometric_verified: isBiometric,
          facility_id: selectedFacilityId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Fayda ID verification failed.');
      } else {
        localStorage.setItem('npdms_auth_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('npdms_auth_token', data.token);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg('Failed to connect to Fayda National Identity provider.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateBiometric = (fin) => {
    setBiometricScanning(true);
    setErrorMsg('');
    setTimeout(() => {
      setBiometricScanning(false);
      setBiometricSuccess(true);
      setTimeout(() => {
        handleFaydaLogin(fin, true);
      }, 500);
    }, 1200);
  };

  // ── Fayda OTP Step 1: Send OTP to registered phone
  const handleFaydaSendOtp = async () => {
    setErrorMsg('');
    if (!faydaFin.trim()) {
      setErrorMsg('Please enter your 12-digit Fayda National ID (FIN).');
      return;
    }
    setFaydaOtpLoading(true);
    try {
      const res = await apiFetch('/api/auth/fayda-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fayda_fin: faydaFin.trim(), facility_id: selectedFacilityId })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send OTP. Try again.');
      } else {
        setFaydaMaskedPhone(data.maskedPhone || '+251 ••• ••••');
        setFaydaDemoOtp(data.demoOtp || '');
        setFaydaStep(2);
        setFaydaOtp('');
      }
    } catch {
      setErrorMsg('Network error connecting to Fayda identity service.');
    } finally {
      setFaydaOtpLoading(false);
    }
  };

  // ── Fayda OTP Step 2: Verify OTP and login
  const handleFaydaVerifyOtp = async () => {
    setErrorMsg('');
    if (!faydaOtp.trim() || faydaOtp.length < 6) {
      setErrorMsg('Please enter the 6-digit OTP sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/fayda-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fayda_fin: faydaFin.trim(),
          otp: faydaOtp.trim(),
          facility_id: selectedFacilityId,
          biometric_verified: false
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'OTP verification failed.');
      } else {
        localStorage.setItem('npdms_auth_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('npdms_auth_token', data.token);
        onLoginSuccess(data.user);
      }
    } catch {
      setErrorMsg('Network error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await apiFetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier })
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || 'Failed to locate user account.');
      } else {
        setForgotMaskedPhone(data.maskedPhone || '+251 91 ••• 4567');
        setDemoOtp(data.demoOtp || '123456');
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError('Network error connecting to recovery service.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          otp: forgotOtp,
          new_password: newPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || 'Password reset failed.');
      } else {
        setForgotSuccess(data.message);
        setForgotStep(3);
        setPassword(newPassword);
        setUsername(forgotIdentifier);
      }
    } catch (err) {
      setForgotError('Network error while resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════
          DECORATIVE BACKGROUND SYSTEM
      ═══════════════════════════════════════════════════════════ */}

      {/* Base deep gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#020817] via-[#0a0f1f] to-[#060d1f] z-0" />

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Primary orb — top-left teal/sky */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #0ea5e9 0%, #0284c7 30%, transparent 70%)',
            animation: 'orb1 18s ease-in-out infinite alternate',
          }}
        />
        {/* Secondary orb — bottom-right indigo */}
        <div
          className="absolute -bottom-60 -right-40 w-[700px] h-[700px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, #4338ca 30%, transparent 70%)',
            animation: 'orb2 22s ease-in-out infinite alternate',
          }}
        />
        {/* Accent orb — mid emerald */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #10b981 0%, #059669 30%, transparent 70%)',
            animation: 'orb3 26s ease-in-out infinite alternate-reverse',
          }}
        />
        {/* Top-right rose accent */}
        <div
          className="absolute -top-20 right-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #f43f5e 0%, #be123c 30%, transparent 70%)',
            animation: 'orb2 20s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Dot-grid mesh overlay */}
      <div
        className="fixed inset-0 z-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Thin diagonal scan lines */}
      <div
        className="fixed inset-0 z-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #94a3b8 0px, transparent 1px, transparent 60px, #94a3b8 61px)',
        }}
      />

      {/* Floating medical cross icons (decorative, non-interactive) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {[
          { top: '8%',  left: '4%',  size: 40, opacity: 0.06, delay: '0s',   dur: '12s' },
          { top: '20%', left: '90%', size: 28, opacity: 0.05, delay: '3s',   dur: '16s' },
          { top: '55%', left: '6%',  size: 20, opacity: 0.04, delay: '6s',   dur: '20s' },
          { top: '75%', left: '85%', size: 36, opacity: 0.07, delay: '1s',   dur: '14s' },
          { top: '40%', left: '94%', size: 18, opacity: 0.04, delay: '8s',   dur: '18s' },
          { top: '88%', left: '20%', size: 32, opacity: 0.05, delay: '4s',   dur: '22s' },
          { top: '65%', left: '50%', size: 14, opacity: 0.03, delay: '10s',  dur: '25s' },
        ].map((c, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-sky-400 absolute"
            style={{
              top: c.top, left: c.left,
              width: c.size, height: c.size,
              opacity: c.opacity,
              animation: `floatIcon ${c.dur} ${c.delay} ease-in-out infinite alternate`,
            }}
          >
            <path d="M11 2h2v7h7v2h-7v7h-2v-7H4v-2h7V2z"/>
          </svg>
        ))}

        {/* Floating heart-pulse icons */}
        {[
          { top: '30%', left: '2%',  size: 22, opacity: 0.05, delay: '5s',  dur: '19s' },
          { top: '10%', left: '75%', size: 18, opacity: 0.04, delay: '2s',  dur: '23s' },
          { top: '82%', left: '60%', size: 26, opacity: 0.05, delay: '7s',  dur: '17s' },
        ].map((c, i) => (
          <svg
            key={`h${i}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-rose-400 absolute"
            style={{
              top: c.top, left: c.left,
              width: c.size, height: c.size,
              opacity: c.opacity,
              animation: `floatIcon ${c.dur} ${c.delay} ease-in-out infinite alternate`,
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        ))}
      </div>

      {/* Top-center soft spotlight beam */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] z-0 pointer-events-none opacity-20"
        style={{
          background: 'conic-gradient(from 265deg at 50% -10%, transparent 20%, #0ea5e9 50%, transparent 80%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Bottom fade vignette */}
      <div
        className="fixed bottom-0 inset-x-0 h-48 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(2,8,23,0.9) 0%, transparent 100%)',
        }}
      />

      {/* Keyframe animation definitions */}
      <style>{`
        @keyframes orb1 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(80px, 60px) scale(1.12); }
          100% { transform: translate(40px, 100px) scale(0.95); }
        }
        @keyframes orb2 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-60px, -80px) scale(1.08); }
          100% { transform: translate(-100px, -40px) scale(1.15); }
        }
        @keyframes orb3 {
          0%   { transform: translate(-50%,-50%) scale(1); }
          50%  { transform: translate(-45%,-55%) scale(1.1); }
          100% { transform: translate(-55%,-45%) scale(0.9); }
        }
        @keyframes floatIcon {
          0%   { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(-18px) rotate(8deg); }
          100% { transform: translateY(6px) rotate(-6deg); }
        }
      `}</style>

      {/* All page content sits above bg layers */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">

      {/* 1. TOP BRANDING BAR */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Ethiopian Emblem Crest */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
                <polygon points="50,15 61,38 85,38 66,53 73,77 50,62 27,77 34,53 15,38 39,38" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white">NPDMS</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FAYDA ID INTEGRATED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">
              Federal Democratic Republic of Ethiopia · Ministry of Health
            </p>
          </div>
        </div>

        {/* Live Spine Pill & Language */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>National Health Spine Online</span>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
            <button
              onClick={() => setLang && setLang('en')}
              className={`px-2 py-0.5 rounded-lg transition ${
                lang === 'en' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang && setLang('om')}
              className={`px-2 py-0.5 rounded-lg transition ${
                lang === 'om' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              OM
            </button>
            <button
              onClick={() => setLang && setLang('am')}
              className={`px-2 py-0.5 rounded-lg transition ${
                lang === 'am' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              አማ
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CENTER HERO & LOGIN FORM */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: HERO INFORMATION & SYSTEM ARCHITECTURE */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Unified Health Identity & EHR System</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                One Patient, One Record. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
                  Treated Anywhere in Ethiopia.
                </span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Seamless longitudinal medical records anchored to verified Ethiopian Fayda National Digital IDs. 
                Synchronizes patient histories, surgeries, allergies, prescriptions, and maternal health across all regional and specialized facilities.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <Fingerprint className="w-4 h-4" />
                  <span>Fayda Biometrics</span>
                </div>
                <p className="text-[11px] text-slate-400">MOSIP-certified biometric patient and practitioner identity</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Hospital className="w-4 h-4" />
                  <span>20 Connected Hospitals</span>
                </div>
                <p className="text-[11px] text-slate-400">JMC, Tikur Anbessa, Shenen Gibe, Agaro & regional centers</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Clinical AI Engine</span>
                </div>
                <p className="text-[11px] text-slate-400">AI differential diagnosis, SOAP summarizer & drug sentinel</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <HeartPulse className="w-4 h-4" />
                  <span>Emergency Grid</span>
                </div>
                <p className="text-[11px] text-slate-400">Cold-chain blood bank network & OTP cross-hospital access</p>
              </div>
            </div>

            {/* Hospital-First Instructions Card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5">
              <div className="font-bold text-sky-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Hospital-Based Authentication</span>
              </div>
              <p className="text-[11px] text-slate-300">
                To sign in, select your assigned healthcare institution on the right. 
                The system will automatically load the active clinical departments and professional roles registered at that facility.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: HOSPITAL-FIRST LOGIN CARD */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
              
              {/* Card Header & Mode Switcher */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">Healthcare Portal Login</h2>
                    <p className="text-xs text-slate-400">Select health facility & clinical department role</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>

                {/* Authentication Method Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAuthMode('CREDENTIALS')}
                    className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      authMode === 'CREDENTIALS'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Hospital Staff Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('FAYDA')}
                    className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      authMode === 'FAYDA'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Fayda ID / Biometric</span>
                  </button>
                </div>
              </div>

              {/* ERROR ALERT */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: HOSPITAL-FIRST CREDENTIALS FORM */}
              {authMode === 'CREDENTIALS' && (
                <form onSubmit={handleStandardLogin} className="space-y-4">
                  
                  {/* 1. SELECT TARGET HEALTH FACILITY (HOSPITAL NAME) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-300">
                        1. Select Healthcare Institution (Hospital Name)
                      </label>
                      <span className="text-[10px] text-sky-400 font-mono font-bold">
                        {activeFacilities.length > 0 ? `${activeFacilities.length} Facilities Online` : '20 Hospitals'}
                      </span>
                    </div>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedFacilityId}
                        onChange={(e) => handleFacilityChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-sky-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer shadow-inner"
                      >
                        {activeFacilities.map((fac) => (
                          <option key={fac.id} value={fac.id} className="bg-slate-900 text-white font-medium">
                            {fac.name} · ({fac.code}) — {fac.region}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. DYNAMIC CLINICAL DEPARTMENT ROLES LISTED UNDER THE SELECTED HOSPITAL */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-300">
                        2. Clinical Department & Staff Role at {selectedFacility.name?.split('(')[0]}:
                      </label>
                      <span className="text-[10px] text-slate-400">Click to select role</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                      {facilityRoles.map((roleItem) => {
                        const isSelected = selectedRoleTitle === roleItem.roleTitle;
                        return (
                          <button
                            key={roleItem.roleTitle}
                            type="button"
                            onClick={() => selectHospitalRole(roleItem)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-sky-950/90 border-sky-500 text-white shadow-md ring-2 ring-sky-400/40'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                            }`}
                          >
                            <span className="text-lg shrink-0">{roleItem.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-white truncate">
                                {roleItem.roleTitle}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {roleItem.dept}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. CREDENTIALS INPUTS (AUTO-CONFIGURED OR CUSTOM) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Professional ID / Username
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. clinician.id or username"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">Demo: demo123</span>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotStep(1);
                        setForgotIdentifier(username || 'clinician');
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Forgot password?</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Connecting to {selectedFacility.name?.split('(')[0]}...</span>
                    ) : (
                      <>
                        <span>Sign In as {selectedRoleTitle.split('/')[0]}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: FAYDA NATIONAL ID + OTP AUTH */}
              {authMode === 'FAYDA' && (
                <div className="space-y-4">

                  {/* Assigned Healthcare Facility */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Assigned Healthcare Facility
                    </label>
                    <select
                      value={selectedFacilityId}
                      onChange={(e) => handleFacilityChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none"
                    >
                      {activeFacilities.map((fac) => (
                        <option key={fac.id} value={fac.id} className="bg-slate-900 text-white">
                          {fac.name} ({fac.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ── STEP 1: Enter FIN ── */}
                  {faydaStep === 1 && (
                    <div className="space-y-4">
                      {/* FIN Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                          Fayda National Digital ID (FIN / FAN)
                        </label>
                        <div className="relative">
                          <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={faydaFin}
                            onChange={(e) => setFaydaFin(e.target.value)}
                            placeholder="e.g. 1985-7821-4923"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-indigo-500/30 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Your 12-digit Fayda National ID registered with the FDRE National ID Program
                        </p>
                      </div>

                      {/* Send OTP button */}
                      <button
                        type="button"
                        disabled={faydaOtpLoading || !faydaFin.trim()}
                        onClick={handleFaydaSendOtp}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {faydaOtpLoading ? (
                          <span className="animate-pulse">Sending OTP via Ethio Telecom...</span>
                        ) : (
                          <>
                            <span>📱 Send OTP to Registered Phone</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Divider */}
                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] text-slate-500 font-semibold">OR</span>
                        <div className="flex-1 h-px bg-slate-800" />
                      </div>

                      {/* Biometric Scanner */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 text-center">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Fingerprint className="w-4 h-4 text-indigo-400" />
                            MOSIP Fayda Biometric Scanner
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${biometricScanning ? 'text-amber-400 animate-pulse' : biometricSuccess ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {biometricScanning ? 'Verifying Minutiae...' : biometricSuccess ? 'Matched 99.8%' : 'Scanner Ready'}
                          </span>
                        </div>

                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all ${
                          biometricScanning
                            ? 'bg-amber-500/20 text-amber-400 ring-4 ring-amber-400/40 animate-pulse'
                            : biometricSuccess
                            ? 'bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-400/40'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          <Fingerprint className={`w-9 h-9 ${biometricScanning ? 'animate-bounce' : ''}`} />
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white">
                            {biometricScanning ? 'Reading Right Index Finger...' : biometricSuccess ? 'Practitioner Identity Verified!' : 'Touch Fingerprint Sensor to Sign In'}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Cryptographically matches biometric token with National ID Division
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={biometricScanning || loading}
                          onClick={() => handleSimulateBiometric(faydaFin || '1985-7821-4923')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                        >
                          {biometricScanning ? 'Scanning...' : '👆 Authenticate Practitioner Biometric Thumbprint'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Enter OTP ── */}
                  {faydaStep === 2 && (
                    <div className="space-y-4">

                      {/* OTP sent notice */}
                      <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                          <span>📱</span>
                          <span>OTP Sent via Ethio Telecom SMS</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          A 6-digit code has been sent to <span className="font-mono font-bold text-white">{faydaMaskedPhone}</span> linked to your Fayda FIN.
                        </p>
                        <p className="text-[10px] text-slate-500">Valid for 10 minutes · Do not share this code</p>
                        {faydaDemoOtp && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                            <span className="text-amber-300 text-[10px] font-bold">🔔 DEMO OTP:</span>
                            <span className="font-mono font-black text-amber-200 text-sm tracking-widest">{faydaDemoOtp}</span>
                          </div>
                        )}
                      </div>

                      {/* OTP input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Enter 6-Digit OTP
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={faydaOtp}
                          onChange={(e) => setFaydaOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="• • • • • •"
                          className="w-full px-4 py-3 bg-slate-950 border border-indigo-500/40 rounded-xl text-center text-2xl font-mono font-black text-white tracking-[0.5em] placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      {/* Verify button */}
                      <button
                        type="button"
                        disabled={loading || faydaOtp.length < 6}
                        onClick={handleFaydaVerifyOtp}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="animate-pulse">Verifying with Fayda Registry...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify OTP & Sign In</span>
                          </>
                        )}
                      </button>

                      {/* Resend / Back */}
                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => { setFaydaStep(1); setFaydaOtp(''); setErrorMsg(''); }}
                          className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition"
                        >
                          <RotateCcw className="w-3 h-3" /> Back / Change FIN
                        </button>
                        <button
                          type="button"
                          onClick={handleFaydaSendOtp}
                          disabled={faydaOtpLoading}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition disabled:opacity-50"
                        >
                          {faydaOtpLoading ? 'Resending...' : 'Resend OTP'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>FDRE Ministry of Health (MOH) · National Health Information Network (NHIN)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Proclamation No. 1110/2019</span>
          <span>HL7 FHIR R4 Compliant</span>
          <span>Fayda MOSIP v1.2</span>
        </div>
      </footer>

      {/* 4. FORGOT PASSWORD & RECOVERY MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Reset Staff Password</h3>
                  <p className="text-[11px] text-slate-400">FDRE Ministry of Health Credential Recovery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {forgotError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Identify Account & Select Channel */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestResetOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Enter Username, License ID, or Work Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. physician.jmc or work email"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                {/* Recovery Channel Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Verification Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotChannel('SMS')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        forgotChannel === 'SMS'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Ethio Telecom SMS</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Send 6-digit OTP code to registered phone</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForgotChannel('FAYDA')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        forgotChannel === 'FAYDA'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Fayda National ID</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Authorize recovery via National Digital ID</p>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                  >
                    {forgotLoading ? (
                      <span>Dispatching Code...</span>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP & Set New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleConfirmReset} className="space-y-4 text-xs">
                {/* Simulated Ethio Telecom SMS Toast Notification */}
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Ethio Telecom SMS Received
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium">
                    "ETH-MOH: Your NPDMS verification code is <strong className="font-mono text-emerald-300 tracking-wider text-xs">{demoOtp}</strong>. Dispatched to {forgotMaskedPhone}."
                  </p>
                  <button
                    type="button"
                    onClick={() => setForgotOtp(demoOtp)}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    ⚡ Click to Auto-Fill Code ({demoOtp})
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    6-Digit Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono font-black text-sm tracking-widest text-sky-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNewPassword}
                      onChange={(e) => setShowNewPassword(e.target.checked)}
                      className="rounded bg-slate-950 text-sky-600 border-slate-700"
                    />
                    <span>Show passwords</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRequestResetOtp()}
                    className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                  >
                    Resend Code
                  </button>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {forgotLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {forgotStep === 3 && (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Password Reset Complete!</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your credentials have been securely updated across the National Health Spine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-2"
                >
                  Return to Sign In (Auto-filled)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>{/* end z-10 wrapper */}
    </div>
  );
}
