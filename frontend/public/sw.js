// NPDMS Ethiopian National Health Spine – PWA Service Worker
// Enables offline capability for rural health posts & emergency deployments
const CACHE_VERSION = 'npdms-v2.4.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_QUEUE_KEY = 'npdms_offline_queue';

// Core app shell files to cache for offline access
const APP_SHELL = [
  '/',
  '/index.html',
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
  console.log('[NPDMS-SW] Installing National Health Spine Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[NPDMS-SW] Caching application shell for offline deployment');
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('[NPDMS-SW] Shell cache partial failure (acceptable):', err.message);
      });
    })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────
// ACTIVATE: Clean up old caches
// ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[NPDMS-SW] Activating — clearing stale caches');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key.startsWith('npdms-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => {
            console.log('[NPDMS-SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
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

  // Strategy: API endpoints — Network First, Cache Fallback
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[NPDMS-SW] Network failed for API, serving cached:', url.pathname);
          return caches.match(request).then(cached => {
            if (cached) return cached;
            // Return structured offline response for API
            return new Response(JSON.stringify({
              offline: true,
              message: 'NPDMS operating in offline mode. Showing locally cached data. Changes will sync when connectivity is restored.',
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

  // Strategy: App shell & assets — Cache First, Network Fallback
  if (url.pathname.match(/\.(js|css|woff2?|png|svg|ico|jpg|jpeg|webp)$/) || url.pathname === '/') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // Return offline HTML shell for navigation requests
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  // All other requests: Network only
  event.respondWith(fetch(request).catch(() => {
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
  }));
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
