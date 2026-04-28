import { useEffect } from "react";

export default function AlertDialog({ message, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#121218] border border-gray-800 rounded-2xl px-6 py-5 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-sm leading-6 mb-5">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
