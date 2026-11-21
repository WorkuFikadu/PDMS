// frontend/src/components/PwaInstallPrompt.jsx
// PWA Install banner for rural health clinics — shows when browser triggers beforeinstallprompt
import React, { useState, useEffect } from 'react';
import { Download, X, Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMsg, setSyncMsg] = useState('');
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    // Capture PWA install prompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      const dismissed = localStorage.getItem('npdms_pwa_dismissed');
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      setShowBanner(false);
    }

    // Online/Offline status
    const goOnline = () => {
      setIsOnline(true);
      setSyncMsg('🌐 Connection restored — syncing queued records to National Health Spine...');
      setTimeout(() => setSyncMsg(''), 5000);
    };
    const goOffline = () => {
      setIsOnline(false);
      setSyncMsg('📡 Network offline — Working in resilient offline mode. Records saved locally.');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Service Worker message: background sync
    const bgSyncHandler = (e) => {
      setSyncMsg(`⚡ ${e.detail?.message || 'Background sync complete.'}`);
      setTimeout(() => setSyncMsg(''), 6000);
    };
    window.addEventListener('npdms-bg-sync', bgSyncHandler);

    // Check SW registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('npdms-bg-sync', bgSyncHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('npdms_pwa_dismissed', '1');
  };

  return (
    <>
      {/* Offline mode indicator bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 text-[11px] font-bold px-4 py-1.5 flex items-center justify-center gap-2 z-50 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
          OFFLINE MODE — Resilient cache active. All changes stored locally and queued for sync.
        </div>
      )}

      {/* Background sync / network message */}
      {syncMsg && (
        <div className="bg-sky-600 text-white text-[11px] font-bold px-4 py-1.5 flex items-center justify-center gap-2 z-50 shrink-0 animate-in slide-in-from-top-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {syncMsg}
        </div>
      )}

      {/* PWA Install Banner */}
      {showBanner && !installed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white">Install NPDMS App</div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Install on this device for <strong className="text-sky-400">offline access</strong> in rural health posts without internet. Works on tablet, phone, and desktop.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition cursor-pointer"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SW Active Badge — shows in corner when PWA is fully ready */}
      {swReady && isOnline && installed && (
        <div className="fixed bottom-2 right-2 z-40">
          <div className="bg-emerald-900/80 border border-emerald-500/40 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold shadow">
            <CheckCircle2 className="w-3 h-3" />
            Installed & Offline Ready
          </div>
        </div>
      )}
    </>
  );
}
