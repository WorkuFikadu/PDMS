// frontend/src/components/DigitalHealthCardModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck, Heart, AlertOctagon, Phone, MapPin, Printer,
  Download, QrCode, X, Building2, User
} from 'lucide-react';

export default function DigitalHealthCardModal({
  patient, onClose
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    if (!patient) return;

    // Encrypted / Structured payload for triage scanning
    const qrPayload = JSON.stringify({
      system: 'ETH-NPDMS-2026',
      npdms_id: patient.npdms_id,
      fayda_fin: patient.fayda_fin || 'UNLINKED',
      name: `${patient.first_name} ${patient.father_name}`,
      dob: patient.date_of_birth,
      gender: patient.gender,
      blood_type: patient.blood_type || 'Unknown',
      allergies_count: patient.allergies?.length || 0,
      emergency_phone: patient.emergency_contact_phone || patient.phone_number,
      verify_url: `https://health.gov.et/npdms/verify/${patient.npdms_id}`
    });

    QRCode.toDataURL(qrPayload, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [patient]);

  const handlePrint = () => {
    window.print();
  };

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 text-xs animate-in zoom-in-95 duration-150 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-900">
              Ethiopian National Digital Patient Health Card
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE HEALTH CARD */}
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border-2 border-sky-400/30 relative overflow-hidden space-y-4"
        >
          {/* Subtle Watermark */}
          <div className="absolute right-4 -bottom-6 text-9xl font-black text-white/5 select-none pointer-events-none">
            ETH
          </div>

          {/* Card Top: Coat of Arms / Institution */}
          <div className="flex justify-between items-start border-b border-white/15 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-base shadow-sm">
                🇪🇹
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Federal Democratic Republic of Ethiopia
                </h4>
                <p className="text-[10px] text-sky-300 font-semibold">
                  Ministry of Health · National Patient Data Management System
                </p>
              </div>
            </div>

            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Official Health Card
            </span>
          </div>

          {/* Card Middle: Demographics & QR Code */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Demographics details */}
            <div className="space-y-2 flex-1">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Patient Name</span>
                <div className="text-lg font-black text-white">
                  {patient.first_name} {patient.father_name} {patient.grandfather_name || ''}
                </div>
                {patient.first_name_amharic && (
                  <div className="text-sm font-semibold text-sky-200">
                    {patient.first_name_amharic} {patient.father_name_amharic || ''}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">NPDMS ID</span>
                  <span className="font-mono font-bold text-sky-300">{patient.npdms_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Fayda National FIN</span>
                  {patient.fayda_status === 'VERIFIED' ? (
                    <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {patient.fayda_fin}
                    </span>
                  ) : (
                    <span className="text-amber-300 font-medium text-[10px]">Unlinked (Provisional)</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">DOB / Age</span>
                  <span className="font-semibold text-slate-200">{patient.date_of_birth} ({patient.gender})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Blood Group</span>
                  <span className="font-bold text-rose-300 text-sm">{patient.blood_type || 'Unknown'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Region / Woreda</span>
                <span className="text-slate-200 font-medium text-[11px]">{patient.region} ({patient.zone_woreda})</span>
              </div>
            </div>

            {/* Scannable QR Code Canvas */}
            <div className="bg-white p-2 rounded-xl shadow-md shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Patient QR Code" className="w-28 h-28 rounded-lg" />
              ) : (
                <div className="w-28 h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                  Generating QR...
                </div>
              )}
              <span className="text-[8px] font-bold text-slate-700 uppercase mt-1 tracking-wider">
                Scan for Triage
              </span>
            </div>
          </div>

          {/* High-visibility Documented Allergy Ribbon on the card! */}
          {patient.allergies && patient.allergies.length > 0 ? (
            <div className="p-2 bg-rose-600/90 rounded-lg text-white text-[11px] font-bold flex items-center gap-2 border border-rose-400">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>
                CRITICAL ALLERGIES: {patient.allergies.map(a => `${a.allergen} (${a.severity})`).join('; ')}
              </span>
            </div>
          ) : (
            <div className="p-1.5 bg-white/10 rounded-lg text-[10px] text-slate-300 text-center">
              No known life-threatening drug allergies on file
            </div>
          )}

          {/* Card Footer: Emergency Contact & Hotline */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-white/15 pt-2">
            <span>Next of Kin: <strong className="text-slate-200">{patient.emergency_contact_name || 'N/A'}</strong> ({patient.emergency_contact_phone || 'N/A'})</span>
            <span className="font-mono text-sky-300">ETH MOH Emergency: 8282</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Health Card
          </button>
        </div>
      </div>
    </div>
  );
}
