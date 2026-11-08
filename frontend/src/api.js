// frontend/src/api.js
// Centralized resilient API fetch helper with automatic Vercel backend fallback

export const PRODUCTION_BACKEND_URL = 'https://backend-one-ebon-72.vercel.app';

export async function apiFetch(endpoint, options = {}) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return fetch(endpoint, options);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(cleanEndpoint, options);
    // If relative path gave 404 on a non-localhost domain, fallback to live backend
    if (res.status === 404 && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      const fallbackUrl = `${PRODUCTION_BACKEND_URL}${cleanEndpoint}`;
      return await fetch(fallbackUrl, options);
    }
    return res;
  } catch (err) {
    // If relative request threw network error on remote frontend, retry via live backend
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      const fallbackUrl = `${PRODUCTION_BACKEND_URL}${cleanEndpoint}`;
      return await fetch(fallbackUrl, options);
    }
    throw err;
  }
}
