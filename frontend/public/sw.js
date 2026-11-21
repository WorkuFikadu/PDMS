// NPDMS Ethiopian National Health Spine – PWA Service Worker
// Enables offline capability for rural health posts & emergency deployments
const CACHE_VERSION = 'npdms-v2.5.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_QUEUE_KEY = 'npdms_offline_queue';

// Core app shell files to cache for offline access (manifest only; HTML is network-first)
const APP_SHELL = [
  '/manifest.json'
];

// API endpoints to cache for offline reading (GET only)
const CACHEABLE_API_ROUTES = [
  '/api/facilities',
  '/api/facilities/all',
  '/api/patients',
  '/api/health'
];

// ─────────────────────────────────────────────────────────
// INSTALL: Cache app shell on service worker install
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[NPDMS-SW] Installing National Health Spine Service Worker (v2.5.0)...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────
// ACTIVATE: Clean up all older caches immediately
// ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[NPDMS-SW] Activating v2.5.0 — purging old caches');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => {
            console.log('[NPDMS-SW] Deleted legacy cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────
// FETCH: Network-first with offline fallback strategy
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: Non-GET mutations (POST/PUT/DELETE) — handled by offline queue in app
  if (request.method !== 'GET') return;

  // Skip: Browser extension requests and non-HTTP
  if (!request.url.startsWith('http')) return;

  // 1. Navigation & HTML: ALWAYS Network-First so updates show up immediately
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then(cached => cached || caches.match('/'));
        })
    );
    return;
  }

  // 2. Strategy: API endpoints — Network First, Cache Fallback
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;
            return new Response(JSON.stringify({
              offline: true,
              message: 'NPDMS operating in offline mode. Showing locally cached data.',
              cached_at: new Date().toISOString()
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'X-NPDMS-Offline': 'true' }
            });
          });
        })
    );
    return;
  }

  // 3. Strategy: Static assets (JS/CSS/fonts/images) — Cache First, Network Fallback
  if (url.pathname.match(/\.(js|css|woff2?|png|svg|ico|jpg|jpeg|webp)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // All other requests: Network only
  event.respondWith(fetch(request));
});

// ─────────────────────────────────────────────────────────
// BACKGROUND SYNC: Auto-sync queued offline records
// when internet connectivity is restored
// ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'npdms-offline-sync') {
    console.log('[NPDMS-SW] Background sync triggered — flushing offline consultation queue');
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'NPDMS_SYNC_REQUESTED',
        message: 'Background sync triggered. Flushing offline consultation records to National Health Spine...'
      });
    }
  } catch (err) {
    console.error('[NPDMS-SW] Background sync failed:', err);
  }
}

// ─────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS: Security alerts & appointment reminders
// ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'NPDMS Alert', body: 'You have a new notification from the National Health Spine.', icon: '/manifest.json', badge: '/manifest.json' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/manifest.json',
      badge: payload.badge || '/manifest.json',
      tag: payload.tag || 'npdms-notification',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
      actions: payload.actions || []
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('[NPDMS-SW] Ethiopian National Health Spine Service Worker ready. Offline resilience active.');
