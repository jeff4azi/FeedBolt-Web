import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X, ImagePlus, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { uploadImageFile, deletePostImage } from "../lib/imageUtils";
import AlertDialog from "../components/AlertDialog";
import { useAlert } from "../hooks/useAlert";

export default function EditPostPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { state } = useLocation();

  const [title, setTitle] = useState(state?.title ?? "");
  const [content, setContent] = useState(state?.content ?? "");

  // existing image on the post (from Supabase)
  const [existingImageUrl, setExistingImageUrl] = useState(
    state?.image_url ?? null,
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // newly picked replacement image
  const [pickedFile, setPickedFile] = useState(null);
  const [pickedPreviewUrl, setPickedPreviewUrl] = useState(null);

  const [saving, setSaving] = useState(false);
  const { alert, state: alertState, handleClose } = useAlert();
  const fileInputRef = useRef(null);

  // If nav state didn't carry image_url, fetch from Supabase
  useEffect(() => {
    if (state?.image_url !== undefined) return; // already have it
    supabase
      .from("posts")
      .select("title, content, image_url")
      .eq("id", postId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title ?? "");
        setContent(data.content ?? "");
        setExistingImageUrl(data.image_url ?? null);
      });
  }, [postId, state]);

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPickedPreviewUrl(URL.createObjectURL(file));
    setRemoveExistingImage(true); // replacing means old one goes away
  };

  const handleRemoveNewImage = () => {
    setPickedFile(null);
    if (pickedPreviewUrl) URL.revokeObjectURL(pickedPreviewUrl);
    setPickedPreviewUrl(null);
    setRemoveExistingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveExistingImage = () => {
    setRemoveExistingImage(true);
  };

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      let image_url = existingImageUrl;
      let image_public_id = state?.image_public_id ?? undefined;

      // Delete old image from Cloudinary if user removed or replaced it
      if (removeExistingImage && existingImageUrl) {
        await deletePostImage(postId).catch(() => {});
        image_url = null;
        image_public_id = null;
      }

      // Upload new image if picked
      if (pickedFile) {
        const uploaded = await uploadImageFile(pickedFile);
        image_url = uploaded.image_url;
        image_public_id = uploaded.image_public_id;
      }

      const updatePayload = {
        title: title.trim() || null,
        content: content.trim(),
        image_url,
        ...(image_public_id !== undefined && { image_public_id }),
      };

      const { error } = await supabase
        .from("posts")
        .update(updatePayload)
        .eq("id", postId);

      if (error) throw error;
      navigate(-1);
    } catch (err) {
      await alert(err.message);
      setSaving(false);
    }
  };

  const canSave = content.trim().length > 0 && !saving;

  // What image to show in the preview area
  const previewSrc =
    pickedPreviewUrl ?? (!removeExistingImage ? existingImageUrl : null);

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
        <h2 className="text-white font-semibold text-base">Edit Post</h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition-colors ${
            canSave
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Compose area */}
      <div className="flex-1 px-4 pt-5">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={150}
          className="w-full bg-transparent text-white text-base font-semibold leading-6 outline-none placeholder-gray-700 mb-1"
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={1200}
          autoFocus={!title}
          rows={6}
          className="w-full bg-transparent text-gray-200 text-base leading-6 resize-none outline-none placeholder-gray-600"
        />

        {/* Image preview */}
        {previewSrc && (
          <div className="relative mt-3">
            <img
              src={previewSrc}
              alt="preview"
              className="w-full rounded-xl object-cover max-h-80"
            />
            <button
              onClick={
                pickedPreviewUrl
                  ? handleRemoveNewImage
                  : handleRemoveExistingImage
              }
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-purple-400 hover:text-purple-300 transition-colors"
              title={previewSrc ? "Replace image" : "Add image"}
            >
              <ImagePlus size={20} />
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
  );
}
