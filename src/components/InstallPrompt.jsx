import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "pwa-install-dismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mb-3 bg-[#121218] border border-purple-700/40 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center shrink-0">
        <Download size={18} color="#a855f7" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Install FeedBolt</p>
        <p className="text-gray-500 text-xs">
          Add to your home screen for the best experience.
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-gray-600 hover:text-gray-400 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
