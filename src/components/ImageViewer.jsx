import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ImageViewer({ uri, placeholderUri, visible, onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoaded(false);
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Blurred placeholder shown while full image loads */}
      {placeholderUri && !loaded && (
        <img
          src={placeholderUri}
          alt=""
          aria-hidden="true"
          className="absolute max-w-full max-h-full object-contain blur-lg scale-105"
          style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        />
      )}
      <img
        src={uri}
        alt="full size"
        loading="eager"
        onLoad={() => setLoaded(true)}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-w-full max-h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-black/60 rounded-full p-2 text-white hover:bg-black/80 transition-colors"
      >
        <X size={24} />
      </button>
    </div>
  );
}
