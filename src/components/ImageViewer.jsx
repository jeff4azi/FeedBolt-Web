import { useEffect } from "react";
import { X } from "lucide-react";
import ProgressiveImage from "./ProgressiveImage";
import { getPlaceholderUrl } from "../lib/imageUtils";

export default function ImageViewer({ uri, visible, onClose }) {
  useEffect(() => {
    if (!visible) return;
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
      <ProgressiveImage
        src={uri}
        placeholderSrc={getPlaceholderUrl(uri)}
        alt="full size"
        loading="eager"
        className="max-w-full max-h-full"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        onClick={(e) => e.stopPropagation()}
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
