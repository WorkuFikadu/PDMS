// frontend/src/rbac.js
// Strict Role-Based Access Control (RBAC) Permissions Map
export const ROLE_PERMISSIONS = {
  SYSTEM_ADMIN: ['*'],
  FACILITY_ADMIN: ['patients', 'cross-hospital', 'timeline', 'admissions', 'referrals', 'appointments', 'pharmacy', 'diagnostics', 'blood-bank', 'duplicates', 'audit', 'analytics', 'hospital-network', 'admin'],
  DOCTOR: ['patients', 'cross-hospital', 'ai-hub', 'timeline', 'surgeries', 'admissions', 'referrals', 'appointments', 'maternal-child', 'pharmacy', 'diagnostics', 'blood-bank', 'patient-portal'],
  NURSE: ['patients', 'cross-hospital', 'timeline', 'admissions', 'appointments', 'maternal-child', 'diagnostics', 'blood-bank'],
  PHARMACIST: ['patients', 'timeline', 'pharmacy', 'appointments'],
  LAB_TECH: ['patients', 'timeline', 'diagnostics', 'blood-bank'],
  REGISTRATION_OFFICER: ['patients', 'appointments', 'duplicates'],
  PATIENT: ['patient-portal', 'timeline', 'appointments']
};

export function hasPermission(role, tabId) {
  if (!role) return true; // Default allow in guest/demo mode
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (allowed.includes('*')) return true;
  return allowed.includes(tabId);
}
