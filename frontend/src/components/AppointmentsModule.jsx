// frontend/src/components/AppointmentsModule.jsx
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, User, Building2, PlusCircle, CheckCircle2,
  Smartphone, Send, Search, Bell, AlertCircle, X
} from 'lucide-react';

export default function AppointmentsModule({
  currentFacility, currentUser, patients, t
}) {
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [department, setDepartment] = useState('Cardiology & Endocrine');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:30 AM');
  const [reason, setReason] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [smsLanguage, setSmsLanguage] = useState('en');
  const [submitting, setSubmitting] = useState(false);

  // Quick SMS Dispatch Simulator State
  const [smsSentToast, setSmsSentToast] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resA, resN] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/notifications')
      ]);
      const dataA = await resA.json();
      const dataN = await resN.json();
      setAppointments(dataA);
      setNotifications(dataN);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentFacility]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !appointmentDate) return;

    setSubmitting(true);
    try {
      const selectedPat = patients.find(p => p.id === patientId);

      // 1. Create Appointment
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          facility_id: currentFacility?.id || 'FAC-JUMC',
          doctor_id: currentUser?.id || 'USR-DOC-01',
          department,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason,
          user_name: currentUser?.full_name,
          user_role: currentUser?.role
        })
      });

      // 2. Dispatch simulated Ethio Telecom SMS if toggled
      if (sendSms && selectedPat?.phone_number) {
        let msg = `NPDMS Ethiopia: Dear ${selectedPat.first_name}, your ${department} appointment at ${currentFacility?.name || 'hospital'} is confirmed for ${appointmentDate} at ${appointmentTime}.`;
        if (smsLanguage === 'om') {
          msg = `NPDMS Ethiopia: Kabajamoo ${selectedPat.first_name}, beellamni keessan ${department} Hospitaala ${currentFacility?.name || 'JUMC'} guyyaa ${appointmentDate} sa'aatii ${appointmentTime} irratti qabameera.`;
        } else if (smsLanguage === 'am') {
          msg = `NPDMS Ethiopia: የተከበሩ ${selectedPat.first_name}፣ የ${department} ክሊኒክ ቀጠሮዎ በ${currentFacility?.name || 'ሆስፒታል'} ቀን ${appointmentDate} ሰዓት ${appointmentTime} ተይዟል።`;
        }

        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            phone_number: selectedPat.phone_number,
            message_type: 'APPOINTMENT_REMINDER',
            message_text: msg,
            language: smsLanguage
          })
        });

        setSmsSentToast({
          phone: selectedPat.phone_number,
          text: msg
        });
      }

      setShowScheduleModal(false);
      setReason('');
      await fetchData();
    } catch (err) {
      alert('Error booking appointment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast confirmation for Ethio Telecom SMS */}
      {smsSentToast && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-xs space-y-1 shadow-md animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center text-emerald-900 font-bold">
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Ethio Telecom SMS Dispatched Successfully (Shortcode 8282)
            </span>
            <button onClick={() => setSmsSentToast(null)} className="text-emerald-700 font-bold">×</button>
          </div>
          <p className="text-emerald-800 text-[11px]">
            To <strong>{smsSentToast.phone}</strong>: "{smsSentToast.text}"
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            Clinic Appointments & SMS Notification Dispatcher
          </h2>
          <p className="text-xs text-slate-500">
            Schedule follow-up appointments across departments and dispatch automated Ethio Telecom SMS reminders.
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0) setPatientId(patients[0].id);
            setAppointmentDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
            setShowScheduleModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          Schedule Appointment
        </button>
      </div>

      {/* Grid: Appointments & Recent SMS Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments List (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
            <span>Scheduled Clinic Visits ({appointments.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">Sorted by upcoming date</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No upcoming appointments booked.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map(apt => (
                <div key={apt.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{apt.first_name} {apt.father_name}</span>
                      <span className="font-mono text-sky-700 text-[11px] font-semibold">({apt.npdms_id})</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-slate-600 font-medium">
                      {apt.department} · {apt.facility_name}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Reason: "{apt.reason}" {apt.doctor_name ? `· Attending: ${apt.doctor_name}` : ''}
                    </div>
                  </div>

                  <div className="text-right sm:text-right shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-indigo-900 text-xs flex items-center justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      {apt.appointment_date}
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      {apt.appointment_time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SMS Notification Feed (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            Ethio Telecom SMS Feed ({notifications.length})
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] text-xs">
            {notifications.map(n => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-bold text-slate-600 uppercase">{n.message_type.replace('_', ' ')}</span>
                  <span>{n.sent_at}</span>
                </div>
                <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                  <span>To: {n.first_name} {n.father_name}</span>
                  <span className="font-mono text-emerald-700">{n.phone_number}</span>
                </div>
                <p className="text-slate-600 text-[11px] bg-white p-2 rounded-lg border border-slate-100 font-sans">
                  "{n.message_text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-base text-slate-900">Book Patient Clinic Appointment</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Patient *</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.father_name} ({p.npdms_id}) - {p.phone_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Clinic Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="Cardiology & Endocrine Clinic">Cardiology & Endocrine Clinic (JMC)</option>
                  <option value="Orthopedic Outpatient Clinic">Orthopedic Outpatient Clinic</option>
                  <option value="Antenatal & Maternal Health">Antenatal & Maternal Health (Shenen Gibe)</option>
                  <option value="General Outpatient Department (OPD)">General Outpatient Department (OPD)</option>
                  <option value="Pediatric Follow-up Clinic">Pediatric Follow-up Clinic</option>
                  <option value="Ophthalmology / Eye Clinic">Ophthalmology / Eye Clinic</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Time Slot</label>
                  <select
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="08:30 AM">08:30 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Clinical Follow-up Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Blood pressure titration, suture removal, HbA1c review..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              {/* SMS Dispatch Option */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-emerald-950 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Dispatch Instant SMS Reminder (Ethio Telecom)</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Shortcode 8282</span>
                </div>

                {sendSms && (
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                    <span className="text-emerald-900 font-semibold text-[11px]">SMS Language:</span>
                    <select
                      value={smsLanguage}
                      onChange={(e) => setSmsLanguage(e.target.value)}
                      className="px-2 py-0.5 border border-emerald-300 rounded-md bg-white text-xs"
                    >
                      <option value="en">English</option>
                      <option value="om">Afaan Oromoo</option>
                      <option value="am">አማርኛ (Amharic)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submitting ? 'Booking...' : 'Confirm Appointment & Send SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
