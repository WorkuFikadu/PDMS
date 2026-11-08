// frontend/src/components/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, User, Building2, KeyRound, Fingerprint,
  QrCode, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff,
  Stethoscope, Sparkles, HeartPulse, Hospital, Shield, Globe
} from 'lucide-react';

export default function LoginPage({
  onLoginSuccess, facilities = [], lang = 'en', setLang
}) {
  const [authMode, setAuthMode] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'FAYDA'
  const [username, setUsername] = useState('dr_abebe');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState('FAC-JUMC');

  // Fayda login state
  const [faydaFin, setFaydaFin] = useState('1985-7821-4923');
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default facility if available
  useEffect(() => {
    if (facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities]);

  const handleStandardLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
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
        setErrorMsg(data.error || 'Authentication failed. Please check credentials.');
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
      const res = await fetch('/api/auth/fayda-login', {
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

  // Quick 1-click demo accounts
  const demoAccounts = [
    { username: 'dr_abebe', name: 'Dr. Abebe Tadesse, MD', role: 'Doctor / Specialist', facility: 'FAC-JUMC', facName: 'Jimma Medical Center (JMC)', icon: '👨‍⚕️' },
    { username: 'dr_chala', name: 'Dr. Chala Gemechu, MD', role: 'General Surgeon', facility: 'FAC-SHENEN', facName: 'Shenen Gibe Hospital', icon: '👨‍⚕️' },
    { username: 'dr_tariku', name: 'Dr. Tariku Bekele, MD', role: 'Primary Physician', facility: 'FAC-AGARO', facName: 'Agaro Primary Hospital', icon: '👨‍⚕️' },
    { username: 'nurse_fatuma', name: 'Sr. Fatuma Kedir, BSc', role: 'Triage Nurse', facility: 'FAC-JUMC', facName: 'Jimma Medical Center (JMC)', icon: '👩‍⚕️' },
    { username: 'pharm_tigist', name: 'Tigist Haile, BPharm', role: 'Pharmacist', facility: 'FAC-JUMC', facName: 'Jimma Medical Center (JMC)', icon: '💊' },
    { username: 'reg_almaz', name: 'Almaz Bekele', role: 'Registrar', facility: 'FAC-JUMC', facName: 'Jimma Medical Center (JMC)', icon: '📋' },
    { username: 'admin_worku', name: 'Worku Fikadu', role: 'Lead Admin', facility: 'FAC-JUMC', facName: 'MOH National Admin', icon: '🛡️' }
  ];

  const selectDemoAccount = (acc) => {
    setUsername(acc.username);
    setPassword('demo123');
    setSelectedFacilityId(acc.facility);
    setAuthMode('CREDENTIALS');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white">
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
          
          {/* LEFT COLUMN: HERO INFORMATION & CORE PRINCIPLES */}
          <div className="lg:col-span-6 space-y-6">
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

            {/* Feature Pills */}
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

            {/* Quick Demo Selector */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ 1-Click Fast Clinician Demo Access:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {demoAccounts.slice(0, 4).map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => selectDemoAccount(acc)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      username === acc.username
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md ring-2 ring-sky-400/40'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{acc.icon}</span>
                    <span>{acc.name.split(',')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AUTHENTICATION CARD */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
              
              {/* Card Header & Mode Switcher */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">Healthcare Portal Login</h2>
                    <p className="text-xs text-slate-400">Authenticate practitioner or clinical staff credentials</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>

                {/* Tabs */}
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
                    <User className="w-3.5 h-3.5" />
                    <span>Staff Password</span>
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

              {/* TAB 1: STANDARD CREDENTIALS FORM */}
              {authMode === 'CREDENTIALS' && (
                <form onSubmit={handleStandardLogin} className="space-y-4">
                  {/* Active Facility */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Target Health Facility
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedFacilityId}
                        onChange={(e) => setSelectedFacilityId(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {facilities.map((fac) => (
                          <option key={fac.id} value={fac.id} className="bg-slate-900 text-white">
                            {fac.name} ({fac.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Username / Professional License ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Username / License ID / Work Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. dr_abebe or ETH-MED-44129"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Password */}
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
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Authenticating with Spine...</span>
                    ) : (
                      <>
                        <span>Sign In to Clinical Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: FAYDA NATIONAL ID & BIOMETRIC AUTH */}
              {authMode === 'FAYDA' && (
                <div className="space-y-4">
                  {/* Active Facility */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Assigned Facility
                    </label>
                    <select
                      value={selectedFacilityId}
                      onChange={(e) => setSelectedFacilityId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none"
                    >
                      {facilities.map((fac) => (
                        <option key={fac.id} value={fac.id} className="bg-slate-900 text-white">
                          {fac.name} ({fac.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fayda FIN Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      12-Digit Fayda National Digital ID (FIN)
                    </label>
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={faydaFin}
                        onChange={(e) => setFaydaFin(e.target.value)}
                        placeholder="1985-7821-4923"
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Optical Fingerprint Scanner */}
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
                      onClick={() => handleSimulateBiometric('1985-7821-4923')}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {biometricScanning ? 'Scanning...' : '👆 Authenticate Thumbprint (Dr. Abebe)'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFaydaLogin(faydaFin, false)}
                    disabled={loading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Verify via FIN Lookup Only
                  </button>
                </div>
              )}

              {/* DEMO ACCOUNTS ACCORDION / ROLES */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Select Role to Auto-Fill:
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {demoAccounts.map(acc => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => selectDemoAccount(acc)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        username === acc.username
                          ? 'bg-sky-950/60 border-sky-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-slate-200 truncate flex items-center gap-1">
                        <span>{acc.icon}</span>
                        <span>{acc.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{acc.role}</div>
                    </button>
                  ))}
                </div>
              </div>
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
    </div>
  );
}
