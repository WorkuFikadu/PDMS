// backend/sms.js — NPDMS National SMS Gateway (AfricasTalking + Ethio Telecom)
// Sends real SMS via AfricasTalking API when credentials are set,
// falls back to structured console simulation for local dev / staging.

const AT_USERNAME = process.env.AT_USERNAME || '';
const AT_API_KEY  = process.env.AT_API_KEY  || '';
const AT_SANDBOX  = process.env.AT_SANDBOX  === 'true' || (!AT_USERNAME && !AT_API_KEY);

let _atClient = null;

function getATClient() {
  if (_atClient) return _atClient;
  try {
    const AfricasTalking = require('africastalking');
    _atClient = AfricasTalking({
      username: AT_USERNAME || 'sandbox',
      apiKey:   AT_API_KEY  || 'sandbox-key',
    });
    return _atClient;
  } catch (err) {
    console.warn('[SMS] AfricasTalking SDK not loaded, using simulation mode.');
    return null;
  }
}

// In-memory log (last 200 messages) — also persisted to DB if available
const smsLog = [];

/**
 * sendSms(to, message, options)
 * @param {string} to       - E.164 format: +251912345678
 * @param {string} message  - UTF-8 text (up to 160 chars per segment)
 * @param {object} options  - { type: 'OTP'|'ALERT'|'GENERAL', patientId, userId }
 * @returns {Promise<{success, messageId, cost, status, simulated}>}
 */
async function sendSms(to, message, options = {}) {
  const { type = 'GENERAL', patientId = null, userId = null } = options;
  const timestamp = new Date().toISOString();
  const logEntry = { to, message, type, patientId, userId, timestamp, status: 'PENDING', simulated: false };

  // Sanitize phone: ensure E.164 for Ethiopian numbers
  let phone = to.replace(/\s+/g, '');
  if (phone.startsWith('0')) phone = '+251' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;

  // --- SIMULATION MODE (no credentials or sandbox) ---
  if (AT_SANDBOX || !AT_USERNAME || !AT_API_KEY) {
    logEntry.status    = 'SIMULATED';
    logEntry.simulated = true;
    logEntry.messageId = 'SIM-' + Date.now();
    logEntry.cost      = '0.00 ETB';

    console.log(`\n📱 [SMS GATEWAY — SIMULATION MODE]`);
    console.log(`   To      : ${phone}`);
    console.log(`   Type    : ${type}`);
    console.log(`   Message : ${message}`);
    console.log(`   Time    : ${timestamp}\n`);

    _pushToLog(logEntry);
    return { success: true, ...logEntry };
  }

  // --- REAL AFRICASTALKING SEND ---
  try {
    const client = getATClient();
    if (!client) throw new Error('SDK unavailable');

    const smsService = client.SMS;
    const result = await smsService.send({
      to:      [phone],
      message: message,
      from:    process.env.AT_SENDER_ID || 'NPDMS-MOH',
    });

    const rec = result.SMSMessageData?.Recipients?.[0] || {};
    logEntry.status    = rec.status    || 'Success';
    logEntry.messageId = rec.messageId || 'AT-' + Date.now();
    logEntry.cost      = rec.cost      || '?';
    logEntry.simulated = false;

    console.log(`✅ [SMS SENT] To: ${phone} | Type: ${type} | ID: ${logEntry.messageId}`);
    _pushToLog(logEntry);
    return { success: true, ...logEntry };

  } catch (err) {
    logEntry.status = 'FAILED';
    logEntry.error  = err.message;
    console.error(`❌ [SMS FAILED] To: ${phone} | Error: ${err.message}`);
    _pushToLog(logEntry);
    return { success: false, ...logEntry };
  }
}

function _pushToLog(entry) {
  smsLog.unshift(entry);
  if (smsLog.length > 200) smsLog.pop();

  // Persist to DB if database module is available
  try {
    const { getDb } = require('./database');
    const db = getDb();
    db.prepare(`
      INSERT INTO sms_logs (to_phone, message, type, patient_id, user_id, status, message_id, cost, simulated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.to, entry.message, entry.type,
      entry.patientId || null, entry.userId || null,
      entry.status, entry.messageId || null,
      entry.cost || null,
      entry.simulated ? 1 : 0,
      entry.timestamp
    );
  } catch (_) { /* DB not ready or table missing — log only in memory */ }
}

/**
 * sendOtp(phone, otp, patientName)
 * Convenience wrapper for OTP delivery.
 */
async function sendOtp(phone, otp, patientName = 'Patient') {
  const msg = `NPDMS-MOH: Your one-time access code for ${patientName} is ${otp}. Valid for 10 minutes. Do NOT share. Powered by FDRE Ministry of Health.`;
  return sendSms(phone, msg, { type: 'OTP' });
}

/**
 * sendSecurityAlert(phone, alertText)
 * Sends immediate security alert SMS to admin/governance.
 */
async function sendSecurityAlert(phone, alertText) {
  const msg = `🚨 NPDMS SECURITY ALERT: ${alertText} — FDRE Ministry of Health Cyber Defense`;
  return sendSms(phone, msg, { type: 'SECURITY_ALERT' });
}

/**
 * getSmsLogs() — returns in-memory log (last 200)
 */
function getSmsLogs() {
  return smsLog;
}

module.exports = { sendSms, sendOtp, sendSecurityAlert, getSmsLogs };
