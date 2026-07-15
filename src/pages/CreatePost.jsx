import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ImagePlus, XCircle, Youtube, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadImageFile, uploadPdfPost } from "../lib/imageUtils";
import Avatar from "../components/Avatar";
import { trackEvent } from "../lib/analytics";
import { handleNewPostNotification } from "../lib/notifications";
import AlertDialog from "../components/AlertDialog";
import { useAlert } from "../hooks/useAlert";
import { extractVideoId } from "../lib/youtubeUtils";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);

  // PDF mode
  const [mode, setMode] = useState("image"); // "image" | "pdf"
  const [pickedPdf, setPickedPdf] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null); // canvas preview blob URL

  const { alert, state: alertState, handleClose } = useAlert();
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // ── YouTube ────────────────────────────────────────────────────────────────
  const handleYoutubeSave = () => {
    const id = extractVideoId(youtubeUrl);
    if (!id) return;
    setYoutubeVideoId(id);
    setShowYoutubeInput(false);
    clearImage();
  };

  const handleRemoveYoutube = () => {
    setYoutubeVideoId(null);
    setYoutubeUrl("");
  };

  // ── Image ──────────────────────────────────────────────────────────────────
  const clearImage = () => {
    setPickedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const clearPdf = () => {
    setPickedPdf(null);
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handlePickPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedPdf(file);

    // Render first page to canvas for preview
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      }).promise;
      canvas.toBlob(
        (blob) => {
          if (blob) setPdfPreviewUrl(URL.createObjectURL(blob));
        },
        "image/jpeg",
        0.85,
      );
    } catch {
      // preview failed, still allow upload
    }
  };

  // ── Mode switch ────────────────────────────────────────────────────────────
  const switchMode = (next) => {
    if (next === mode) return;
    // clear whatever was picked in the other mode
    clearImage();
    clearPdf();
    handleRemoveYoutube();
    setShowYoutubeInput(false);
    setYoutubeUrl("");
    setMode(next);
  };

  // ── YouTube thumbnail ──────────────────────────────────────────────────────
  const getThumbnailUrl = async (videoId) => {
    const max = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const sd = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
    try {
      const res = await fetch(max, { method: "HEAD" });
      return res.ok ? max : sd;
    } catch {
      return sd;
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (content.trim().length === 0 || posting) return;
    setPosting(true);
    try {
      const actorUsername =
        profile?.username ??
        profile?.fullname ??
        user?.user_metadata?.full_name ??
        "Someone";

      if (mode === "pdf") {
        if (!pickedPdf) {
          await alert("Please select a PDF file.");
          setPosting(false);
          return;
        }
        const result = await uploadPdfPost({
          pdfFile: pickedPdf,
          content: content.trim(),
          title: title.trim() || undefined,
          userId: user.id,
        });
        trackEvent("Post", "create", "pdf");
        handleNewPostNotification({
          postId: result.post_id,
          actorId: user.id,
          actorUsername,
        });
      } else {
        let image_url = null;
        let image_public_id = null;
        if (pickedFile) {
          const uploaded = await uploadImageFile(pickedFile);
          image_url = uploaded.image_url;
          image_public_id = uploaded.image_public_id;
        } else if (youtubeVideoId) {
          image_url = await getThumbnailUrl(youtubeVideoId);
          image_public_id = youtubeVideoId;
        }
        const { data: postData, error } = await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            content: content.trim(),
            title: title.trim() || null,
            image_url,
            image_public_id,
          })
          .select("id")
          .single();
        if (error) throw error;
        trackEvent("Post", "create", pickedFile ? "with_image" : "text_only");
        handleNewPostNotification({
          postId: postData.id,
          actorId: user.id,
          actorUsername,
        });
      }

      navigate(-1);
    } catch (err) {
      await alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  const avatar = profile?.avatar_url ?? user?.user_metadata?.avatar_url;
  const username =
    profile?.fullname ?? user?.user_metadata?.full_name ?? user?.email ?? "You";
  const canPost = content.trim().length > 0 && !posting;

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
      {alertState && (
        <AlertDialog message={alertState.message} onClose={handleClose} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold text-base">New Post</h2>
        <button
          onClick={handlePost}
          disabled={!canPost}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition-colors ${
            canPost
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      {/* Compose area */}
      <div className="flex-1 px-4 pt-5">
        <div className="flex gap-3">
          <Avatar src={avatar} size={40} className="shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-white font-semibold text-sm mb-2">{username}</p>
            {/* Optional title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                mode === "pdf" ? "PDF title (optional)" : "Title (optional)"
              }
              maxLength={150}
              className="w-full bg-transparent text-white text-base font-semibold leading-6 outline-none placeholder-gray-700 mb-1"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                mode === "pdf"
                  ? "Add a description for your PDF..."
                  : "What's on your mind?"
              }
              maxLength={1200}
              autoFocus
              rows={5}
              className="w-full bg-transparent text-gray-200 text-base leading-6 resize-none outline-none placeholder-gray-600"
            />

            {/* Image preview */}
            {mode === "image" && previewUrl && (
              <div className="relative mt-3">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full rounded-xl object-cover max-h-80"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>
            )}

            {/* YouTube preview */}
            {mode === "image" && youtubeVideoId && (
              <div className="relative mt-3">
                <img
                  src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                  alt="YouTube preview"
                  className="w-full rounded-xl object-cover max-h-80"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 rounded-full p-3">
                    <Youtube size={28} color="#ff0000" />
                  </div>
                </div>
                <button
                  onClick={handleRemoveYoutube}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>
            )}

            {/* YouTube URL input */}
            {mode === "image" && showYoutubeInput && (
              <div className="mt-3 flex gap-2">
                <input
                  autoFocus
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleYoutubeSave()}
                  placeholder="Paste YouTube link..."
                  className="flex-1 bg-[#1a1a24] text-gray-200 text-sm rounded-xl px-3 py-2 outline-none border border-gray-700 focus:border-purple-600 transition-colors placeholder-gray-600"
                />
                <button
                  onClick={handleYoutubeSave}
                  disabled={!extractVideoId(youtubeUrl)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowYoutubeInput(false);
                    setYoutubeUrl("");
                  }}
                  className="px-3 py-2 text-gray-500 hover:text-white text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* PDF picker area */}
            {mode === "pdf" && (
              <div className="mt-3">
                {pickedPdf ? (
                  <div className="relative rounded-xl overflow-hidden border border-purple-700/50 bg-[#1a1030]">
                    {/* Cover preview if available */}
                    {pdfPreviewUrl ? (
                      <img
                        src={pdfPreviewUrl}
                        alt="PDF cover"
                        className="w-full object-cover max-h-72"
                      />
                    ) : (
                      <div className="h-36 flex items-center justify-center">
                        <FileText size={48} color="#a855f7" strokeWidth={1.3} />
                      </div>
                    )}
                    {/* filename badge */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
                      <FileText size={14} color="#c084fc" />
                      <span className="text-purple-300 text-xs truncate">
                        {pickedPdf.name}
                      </span>
                    </div>
                    <button
                      onClick={clearPdf}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-purple-700/50 bg-[#1a1030]/60 flex flex-col items-center justify-center gap-2 text-purple-400 hover:border-purple-500 hover:bg-[#1a1030] transition-colors"
                  >
                    <FileText size={32} strokeWidth={1.3} />
                    <span className="text-sm">Tap to select a PDF</span>
                  </button>
                )}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePickPdf}
                />
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
              <div className="flex items-center gap-4">
                {/* Image mode buttons */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePickImage}
                />
                <button
                  onClick={() => {
                    switchMode("image");
                    handleRemoveYoutube();
                    fileInputRef.current?.click();
                  }}
                  className={`transition-colors ${
                    mode === "image" && pickedFile
                      ? "text-purple-400"
                      : "text-purple-400 hover:text-purple-300"
                  }`}
                  title="Add image"
                >
                  <ImagePlus size={20} />
                </button>

                <button
                  onClick={() => {
                    switchMode("image");
                    clearImage();
                    setShowYoutubeInput((v) => !v);
                  }}
                  className={`transition-colors ${
                    youtubeVideoId
                      ? "text-red-500"
                      : "text-purple-400 hover:text-purple-300"
                  }`}
                  title="Add YouTube video"
                >
                  <Youtube size={20} />
                </button>

                {/* PDF mode toggle */}
                <button
                  onClick={() => switchMode(mode === "pdf" ? "image" : "pdf")}
                  className={`transition-colors ${
                    mode === "pdf"
                      ? "text-purple-400"
                      : "text-gray-500 hover:text-purple-400"
                  }`}
                  title="Upload PDF"
                >
                  <FileText size={20} />
                </button>
              </div>

              <p
                className={`text-xs ${content.length > 1100 ? "text-red-400" : "text-gray-600"}`}
              >
                {1200 - content.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
