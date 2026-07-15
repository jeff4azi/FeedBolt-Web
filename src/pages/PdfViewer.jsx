import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Loader,
} from "lucide-react";

/**
 * Triggered download for cross-origin files.
 * Fetches the file as a blob so the browser treats it as a download
 * rather than navigation (the `download` attr alone doesn't work cross-origin).
 */
async function forceDownload(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "document.pdf";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch {
    // Fallback: open in new tab if fetch fails (e.g. CORS)
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function PdfViewerPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const pdfUrl = state?.pdfUrl ?? null;
  const title = state?.title ?? "Document";
  const filename = state?.filename ?? "document.pdf";

  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfUrl) {
      setError("No PDF URL provided.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: "https://unpkg.com/pdfjs-dist/cmaps/",
          cMapPacked: true,
        }).promise;

        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load PDF. " + (err.message ?? ""));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // ── Render page ───────────────────────────────────────────────────────────
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    // Reuse or create canvas
    let canvas = containerRef.current.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(canvas);
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.maxWidth = `${viewport.width}px`;

    const ctx = canvas.getContext("2d");
    const task = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;

    try {
      await task.promise;
    } catch (err) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Render error:", err);
      }
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const goTo = (page) => {
    if (!pdfDoc) return;
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    await forceDownload(pdfUrl, filename);
    setDownloading(false);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        goTo(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(currentPage - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, totalPages, pdfDoc]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0B0F]">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-300 transition-colors shrink-0"
        >
          <ArrowLeft size={22} />
        </button>

        <p className="text-white font-semibold text-sm truncate flex-1">
          {title}
        </p>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-gray-500 text-xs w-10 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 text-gray-400 hover:text-purple-400 disabled:opacity-50 transition-colors shrink-0"
          title="Download PDF"
        >
          {downloading ? (
            <Loader size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
        </button>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-4 px-2">
        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 mt-20">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading PDF…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 mt-20 px-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {!loading && !error && (
          <div
            ref={containerRef}
            className="w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl bg-white"
          />
        )}
      </div>

      {/* ── Bottom pagination bar ───────────────────────────────────────── */}
      {!loading && !error && totalPages > 0 && (
        <div className="sticky bottom-0 bg-[#0B0B0F]/95 backdrop-blur-sm border-t border-gray-800 flex items-center justify-center gap-4 py-3 px-4">
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) goTo(v);
              }}
              className="w-12 text-center bg-[#1a1a2e] text-white text-sm rounded-lg py-1 outline-none border border-gray-700 focus:border-purple-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-gray-500 text-sm">/ {totalPages}</span>
          </div>

          <button
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
