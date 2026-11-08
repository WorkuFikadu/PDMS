// frontend/src/components/AiClinicalHub.jsx
import React, { useState, useEffect } from 'react';
import {
  Sparkles, Bot, Stethoscope, AlertOctagon, ShieldAlert,
  FileText, Activity, Pill, FlaskConical, Send, CheckCircle2,
  AlertTriangle, RefreshCw, ChevronRight, User, Building2,
  Zap, Copy, ArrowRight, ShieldCheck, Heart, Clock
} from 'lucide-react';

export default function AiClinicalHub({
  currentFacility, currentUser, patients = [], initialPatientId = 'PAT-001', t
}) {
  const [activeSubTab, setActiveSubTab] = useState('chat'); // 'chat' | 'ddx' | 'soap' | 'risk' | 'safety'
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedLang, setSelectedLang] = useState('en');

  // Selected Patient Details
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // -------------------------------------------------------------
  // TAB 1: ASK AI CLINICAL ASSISTANT (CHAT)
  // -------------------------------------------------------------
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      text: `Hello Dr. ${currentUser?.full_name?.split(' ')[1] || 'Clinician'}. I am the NPDMS Clinical AI Copilot, synchronized with Ethiopian Ministry of Health clinical guidelines and longitudinal health records across all participating facilities. How can I assist you with ${selectedPatient?.first_name || 'the patient'}?`,
      citations: ['National Health Spine', 'MOH NCD Guidelines'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Quick prompt suggestions
  const quickPrompts = [
    { label: 'Antibiotic Allergies', q: 'Does the patient have any antibiotic allergies or contraindications?' },
    { label: 'Current Medications', q: 'What medications is this patient currently taking across all hospitals?' },
    { label: 'Blood Pressure Trajectory', q: 'Summarize the patient BP trajectory from Agaro to Jimma Medical Center.' },
    { label: 'Recent Lab Abnormalities', q: 'What were the patient recent abnormal blood sugar and lab results?' },
    { label: 'Surgical History', q: 'Are there any past operations or surgical procedures on file?' }
  ];

  const handleSendChat = async (questionText) => {
    const q = questionText || chatInput;
    if (!q.trim() || chatLoading) return;

    const userMsg = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'PAT-001',
          question: q,
          language: selectedLang,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role,
          facility_id: currentFacility?.id
        })
      });

      const data = await res.json();
      const aiMsg = {
        role: 'ai',
        text: data.answer || 'No response generated.',
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: 'Error communicating with AI engine. Please verify the backend service is running.',
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: AI DIFFERENTIAL DIAGNOSIS (AI-DDx)
  // -------------------------------------------------------------
  const [symptomsInput, setSymptomsInput] = useState('Severe throbbing occipital headache, blurred vision, excessive thirst and fatigue');
  const [vitalsInput, setVitalsInput] = useState({ bp: '172/104', pulse: 88, temp: 37.1, spo2: 97 });
  const [ddxLoading, setDdxLoading] = useState(false);
  const [ddxResult, setDdxResult] = useState(null);

  const handleRunDdx = async () => {
    setDdxLoading(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'PAT-001',
          symptoms: symptomsInput,
          vitals: vitalsInput
        })
      });
      const data = await res.json();
      setDdxResult(data);
    } catch (e) {
      alert('Failed to run differential diagnosis engine');
    } finally {
      setDdxLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: AI UNSTRUCTURED TO SOAP NOTE GENERATOR
  // -------------------------------------------------------------
  const [rawDoctorNotes, setRawDoctorNotes] = useState(
    '52 yo male returning for 4-week BP review. Reports occasional morning occipital headache and fatigue, denies chest pain, dyspnea or palpitations. Compliance with amlodipine and metformin is fair. Exam: BP 162/98, pulse 80 regular, temp 36.7, clear chest. Known stage 2 hypertension and type 2 diabetes. Plan: Step up amlodipine to 10mg once daily, add losartan 50mg daily, order fasting blood glucose and creatinine next week, return in 4 weeks.'
  );
  const [soapLoading, setSoapLoading] = useState(false);
  const [parsedSoap, setParsedSoap] = useState(null);
  const [copiedSoap, setCopiedSoap] = useState(false);

  const handleGenerateSoap = async () => {
    if (!rawDoctorNotes.trim()) return;
    setSoapLoading(true);
    try {
      const res = await fetch('/api/ai/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'PAT-001',
          raw_text: rawDoctorNotes
        })
      });
      const data = await res.json();
      setParsedSoap(data.soap);
    } catch (e) {
      alert('SOAP parsing failed');
    } finally {
      setSoapLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: AI LONGITUDINAL RISK & EARLY WARNING (MEWS / CVD)
  // -------------------------------------------------------------
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskData, setRiskData] = useState(null);

  const fetchRiskAssessment = async () => {
    setRiskLoading(true);
    try {
      const res = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient?.id || 'PAT-001' })
      });
      const data = await res.json();
      setRiskData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'risk') {
      fetchRiskAssessment();
    }
  }, [activeSubTab, selectedPatientId]);

  // -------------------------------------------------------------
  // TAB 5: AI PRESCRIPTION SAFETY SENTINEL
  // -------------------------------------------------------------
  const [testDrugInput, setTestDrugInput] = useState('Amoxicillin 500mg');
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyResult, setSafetyResult] = useState(null);

  const handleCheckDrugSafety = async (drugName) => {
    const med = drugName || testDrugInput;
    if (!med.trim()) return;
    setSafetyLoading(true);
    try {
      const res = await fetch('/api/ai/drug-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'PAT-001',
          prospective_medication: med
        })
      });
      const data = await res.json();
      setSafetyResult(data);
    } catch (e) {
      alert('Drug safety check error');
    } finally {
      setSafetyLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP AI HERO BANNER & PATIENT CONTEXT SELECTOR */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white rounded-2xl p-5 border border-indigo-700/50 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                NPDMS BioClinical AI Engine v3.1
              </span>
              <span className="text-xs text-indigo-300 font-semibold">
                FDRE Ministry of Health • Clinical Guidelines
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              AI Clinical Intelligence & Diagnostic Copilot
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Provides real-time clinical reasoning, differential diagnosis (AI-DDx), unstructured SOAP note parsing, cross-hospital drug interaction sentinel, and multi-lingual medical dialogue across all participating facilities.
            </p>
          </div>

          {/* Active Patient & Language Switcher Card */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 space-y-2 text-xs min-w-[300px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target Patient Context:
              </span>
              {/* Language Pills */}
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[10px]">
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'en' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setSelectedLang('om')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'om' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  OM
                </button>
                <button
                  onClick={() => setSelectedLang('am')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'am' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  AM
                </button>
              </div>
            </div>

            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-bold text-white text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.father_name} ({p.npdms_id}) - {p.gender}
                </option>
              ))}
            </select>

            <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/80 pt-1.5">
              <span>Fayda ID: <strong className="text-amber-300 font-mono">{selectedPatient?.fayda_fin || 'UNLINKED'}</strong></span>
              <span className="text-emerald-400 font-semibold">● Longitudinal Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
            activeSubTab === 'chat'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Ask AI EHR Copilot</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ddx')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
            activeSubTab === 'ddx'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-emerald-600" />
          <span>Differential Diagnosis (AI-DDx)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('soap')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
            activeSubTab === 'soap'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>AI SOAP Note Structurer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('risk')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
            activeSubTab === 'risk'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-600" />
          <span>Longitudinal Risk & MEWS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('safety')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
            activeSubTab === 'safety'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Prescription Safety Sentinel</span>
        </button>
      </div>

      {/* 3. SUB-TAB CONTENTS */}

      {/* SUB-TAB 1: ASK AI EHR COPILOT (CONVERSATIONAL CHAT) */}
      {activeSubTab === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[580px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">
                  Clinical AI Dialogue on: {selectedPatient?.first_name} {selectedPatient?.father_name}
                </h3>
                <p className="text-[10px] text-slate-500">
                  Full RAG synthesis across Agaro Primary, Jimma Medical Center, and Shenen Gibe records
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setChatMessages([
                  {
                    role: 'ai',
                    text: `Hello Dr. ${currentUser?.full_name?.split(' ')[1] || 'Clinician'}. I am ready to answer any questions about ${selectedPatient?.first_name}'s diagnoses, multi-hospital medications, allergies, or lab trajectories.`,
                    citations: ['NPDMS Health Spine'],
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Chat
            </button>
          </div>

          {/* Quick Suggested Queries */}
          <div className="p-3 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Suggested:
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(p.q)}
                disabled={chatLoading}
                className="px-2.5 py-1 bg-white hover:bg-indigo-100/70 border border-indigo-200 text-indigo-950 rounded-lg text-[11px] font-medium whitespace-nowrap shadow-2xs transition"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-xs space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Citations Footer */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-bold text-slate-400">Cited Facilities:</span>
                      {msg.citations.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className={`block text-[9px] text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    Dr
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 p-2 font-medium animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>NPDMS BioClinical AI is synthesizing cross-hospital longitudinal records...</span>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask AI about ${selectedPatient?.first_name}'s history, medications, or guidelines...`}
              disabled={chatLoading}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <span>Ask AI</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: AI DIFFERENTIAL DIAGNOSIS (AI-DDx) */}
      {activeSubTab === 'ddx' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Input Panel */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                Clinical Presentation & Triage Inputs
              </h3>
              <p className="text-xs text-slate-500">Enter patient presentation or modify extracted vitals</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Reported Chief Complaints & Symptoms
              </label>
              <textarea
                rows={4}
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Throbbing frontal headache, blurred vision, excessive thirst..."
              />
            </div>

            {/* Quick Sample Symptom Buttons */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Load Clinical Scenario:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSymptomsInput('Severe occipital throbbing headache, blurred vision, elevated blood pressure');
                    setVitalsInput({ bp: '182/112', pulse: 92, temp: 37.0, spo2: 97 });
                  }}
                  className="px-2 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px] font-bold"
                >
                  Hypertensive Crisis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSymptomsInput('Polyuria, polydipsia, unquenchable thirst, fatigue, weight loss');
                    setVitalsInput({ bp: '130/82', pulse: 80, temp: 36.8, spo2: 98 });
                  }}
                  className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold"
                >
                  Uncontrolled Diabetes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSymptomsInput('High fever, productive purulent cough, pleuritic chest pain, dyspnea');
                    setVitalsInput({ bp: '118/76', pulse: 104, temp: 39.2, spo2: 91 });
                  }}
                  className="px-2 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[10px] font-bold"
                >
                  Acute Pneumonia
                </button>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Blood Pressure</label>
                <input
                  type="text"
                  value={vitalsInput.bp}
                  onChange={(e) => setVitalsInput({ ...vitalsInput, bp: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={vitalsInput.pulse}
                  onChange={(e) => setVitalsInput({ ...vitalsInput, pulse: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitalsInput.temp}
                  onChange={(e) => setVitalsInput({ ...vitalsInput, temp: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">SpO2 (%)</label>
                <input
                  type="number"
                  value={vitalsInput.spo2}
                  onChange={(e) => setVitalsInput({ ...vitalsInput, spo2: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleRunDdx}
              disabled={ddxLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{ddxLoading ? 'Analyzing via BioClinical AI...' : 'Generate Ranked Differentials'}</span>
            </button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7 space-y-4">
            {!ddxResult ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                <Stethoscope className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">AI Differential Engine Ready</h4>
                <p className="text-xs max-w-md mx-auto">
                  Click "Generate Ranked Differentials" to run AI symptom analysis cross-referenced against Ethiopian Standard Treatment Guidelines.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Triage & Red Flags Banner */}
                <div className={`p-4 rounded-xl border ${
                  ddxResult.triage_level === 'EMERGENT'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : ddxResult.triage_level === 'URGENT'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4" />
                      Triage Classification: {ddxResult.triage_level}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded">
                      {ddxResult.model}
                    </span>
                  </div>

                  {ddxResult.red_flags.length > 0 && (
                    <div className="mt-2 text-xs space-y-1 font-semibold">
                      {ddxResult.red_flags.map((rf, i) => (
                        <p key={i}>⚠️ {rf}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ranked Differentials */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Ranked Differential Diagnoses ({ddxResult.differentials.length})
                  </h4>

                  {ddxResult.differentials.map((item) => (
                    <div
                      key={item.rank}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                              {item.rank}
                            </span>
                            <h5 className="font-bold text-xs text-slate-900">{item.condition}</h5>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border">
                              {item.icd10}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 pl-7">{item.evidence}</p>
                        </div>

                        {/* Confidence Gauge */}
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-sm text-indigo-600">{item.confidence}%</span>
                          <span className="block text-[9px] text-slate-400">Match Confidence</span>
                        </div>
                      </div>

                      {/* Diagnostic tests & Guidelines */}
                      <div className="pl-7 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Recommended Confirmatory Labs:</span>
                          <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                            {item.recommended_tests?.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Guideline Pharmacotherapy:</span>
                          <p className="text-slate-600 leading-snug">{item.first_line_guideline}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI UNSTRUCTURED TO SOAP NOTE GENERATOR */}
      {activeSubTab === 'soap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Input Unstructured Text */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                Raw Clinician Free-Text / Audio Dictation
              </h3>
              <p className="text-xs text-slate-500">
                Type fast informal clinic notes or simulated voice dictation
              </p>
            </div>

            <textarea
              rows={8}
              value={rawDoctorNotes}
              onChange={(e) => setRawDoctorNotes(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. 52 yo male follow up BP 162/98. Complains of headache..."
            />

            <button
              onClick={handleGenerateSoap}
              disabled={soapLoading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{soapLoading ? 'Structuring via BioNLP Engine...' : 'Structure into Standard SOAP Note'}</span>
            </button>
          </div>

          {/* Parsed SOAP Results */}
          <div className="lg:col-span-7 space-y-4">
            {!parsedSoap ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">Awaiting Clinical Note Input</h4>
                <p className="text-xs max-w-md mx-auto">
                  Enter raw clinician dictation on the left and click "Structure into Standard SOAP Note" to generate structured Subjective, Objective, Assessment, and Plan with parsed vitals.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Standardized HL7/SOAP Clinical Note
                    </h4>
                    <p className="text-[11px] text-slate-500">Structured by BioNLP Engine</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `SUBJECTIVE:\n${parsedSoap.subjective}\n\nOBJECTIVE:\n${parsedSoap.objective}\n\nASSESSMENT:\n${parsedSoap.assessment}\n\nPLAN:\n${parsedSoap.plan}`
                      );
                      setCopiedSoap(true);
                      setTimeout(() => setCopiedSoap(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    {copiedSoap ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSoap ? 'Copied SOAP!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>

                {/* Extracted Vitals Pill Bar */}
                {parsedSoap.extracted_vitals && (
                  <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-bold text-sky-900 uppercase text-[10px]">AI Parsed Vitals:</span>
                    <span>BP: <strong>{parsedSoap.extracted_vitals.bp}</strong> mmHg</span>
                    <span>Pulse: <strong>{parsedSoap.extracted_vitals.pulse}</strong> bpm</span>
                    <span>Temp: <strong>{parsedSoap.extracted_vitals.temp}</strong> °C</span>
                    <span>SpO2: <strong>{parsedSoap.extracted_vitals.spo2}</strong>%</span>
                  </div>
                )}

                {/* S-O-A-P Cards */}
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-black text-sky-800 uppercase tracking-wider text-[10px] block mb-1">
                      S • Subjective (History of Present Illness)
                    </span>
                    <p className="text-slate-700 leading-relaxed">{parsedSoap.subjective}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-black text-emerald-800 uppercase tracking-wider text-[10px] block mb-1">
                      O • Objective (Physical Examination & Vitals)
                    </span>
                    <p className="text-slate-700 leading-relaxed">{parsedSoap.objective}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-black text-purple-800 uppercase tracking-wider text-[10px] block mb-1">
                      A • Assessment (Clinical Diagnoses & ICD-10)
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{parsedSoap.assessment}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-black text-indigo-800 uppercase tracking-wider text-[10px] block mb-1">
                      P • Plan (Pharmacotherapy, Diagnostics & Follow-up)
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{parsedSoap.plan}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: AI LONGITUDINAL RISK & MEWS DETERIORATION */}
      {activeSubTab === 'risk' && (
        <div className="space-y-4">
          {riskLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <Activity className="w-8 h-8 animate-spin mx-auto text-rose-600 mb-2" />
              <span>Calculating longitudinal disease progression & MEWS score...</span>
            </div>
          ) : !riskData ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              No risk trajectory computed.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: 10-Year Cardiovascular Disease Risk */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    WHO / ISH Model
                  </span>
                  <Heart className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">10-Year CVD Risk Score</h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-600">{riskData.cvd_risk?.percentage}%</span>
                    <span className="text-xs font-bold text-rose-800">{riskData.cvd_risk?.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                    {riskData.cvd_risk?.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-700 block mb-1">Modifiable Target Factors:</span>
                  <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                    {riskData.cvd_risk?.modifiable_factors?.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card 2: Modified Early Warning Score (MEWS) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Inpatient & Triage
                  </span>
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Acute MEWS Deterioration Score</h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">{riskData.mews?.score}</span>
                    <span className="text-xs font-bold text-emerald-700">/ {riskData.mews?.max} ({riskData.mews?.status})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                    Physiological deterioration risk index calculated from current vitals across facilities.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sepsis Risk:</span>
                    <span className="font-bold text-emerald-600">Low</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recommended Monitoring:</span>
                    <span className="font-bold text-slate-700">{riskData.mews?.monitoring_frequency}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Diabetic End-Organ Complications */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Microvascular
                  </span>
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Diabetic Organ Risk Indices</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Continuous monitoring based on longitudinal glycemic records:
                  </p>
                </div>

                <div className="space-y-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-700 block">Nephropathy Index:</span>
                    <span className="text-slate-500 text-[10px]">{riskData.diabetic_complications?.nephropathyRisk}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-700 block">Retinopathy Index:</span>
                    <span className="text-slate-500 text-[10px]">{riskData.diabetic_complications?.retinopathyRisk}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: AI PRESCRIPTION SAFETY SENTINEL */}
      {activeSubTab === 'safety' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              AI Prescription Drug-Drug & Drug-Allergy Sentinel
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates prospective medication orders against all active therapies and allergies recorded across Ethiopian hospitals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={testDrugInput}
              onChange={(e) => setTestDrugInput(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg, Enalapril 10mg, Ibuprofen 400mg..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleCheckDrugSafety()}
              disabled={safetyLoading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{safetyLoading ? 'Running AI Safety Scan...' : 'Run Safety Scan'}</span>
            </button>
          </div>

          {/* Quick test buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Test Dangerous Combinations:</span>
            <button
              onClick={() => {
                setTestDrugInput('Amoxicillin 500mg');
                handleCheckDrugSafety('Amoxicillin 500mg');
              }}
              className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold"
            >
              Test Penicillin Allergy Trigger
            </button>
            <button
              onClick={() => {
                setTestDrugInput('Enalapril 10mg');
                handleCheckDrugSafety('Enalapril 10mg');
              }}
              className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold"
            >
              Test Dual RAAS Blockade
            </button>
            <button
              onClick={() => {
                setTestDrugInput('Ibuprofen 400mg');
                handleCheckDrugSafety('Ibuprofen 400mg');
              }}
              className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-bold"
            >
              Test NSAID + Antihypertensive
            </button>
          </div>

          {/* Safety Result Display */}
          {safetyResult && (
            <div className={`p-4 rounded-xl border mt-3 space-y-2 ${
              safetyResult.severity === 'CONTRAINDICATED'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : safetyResult.severity === 'MAJOR'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Safety Interception: {safetyResult.severity}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  safetyResult.safe_to_dispense ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}>
                  {safetyResult.safe_to_dispense ? 'APPROVED TO DISPENSE' : 'STRICT CLINICAL BLOCK'}
                </span>
              </div>

              {safetyResult.alerts?.map((al, idx) => (
                <div key={idx} className="bg-white/90 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-[11px] text-rose-700 uppercase">{al.type.replace(/_/g, ' ')}</span>
                  <p className="text-slate-800">{al.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
