import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ImagePlus, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadImageFile } from "../lib/imageUtils";
import Avatar from "../components/Avatar";
import { trackEvent } from "../lib/analytics";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setPickedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (content.trim().length === 0 || posting) return;
    setPosting(true);
    try {
      let image_url = null;
      let image_public_id = null;
      if (pickedFile) {
        const uploaded = await uploadImageFile(pickedFile);
        image_url = uploaded.image_url;
        image_public_id = uploaded.image_public_id;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url,
        image_public_id,
      });
      if (error) throw error;
      trackEvent("Post", "create", pickedFile ? "with_image" : "text_only");
      navigate(-1);
    } catch (err) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  const avatar = user?.user_metadata?.avatar_url;
  const username = user?.user_metadata?.full_name ?? user?.email ?? "You";
  const canPost = content.trim().length > 0 && !posting;

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={500}
              autoFocus
              rows={5}
              className="w-full bg-transparent text-gray-200 text-base leading-6 resize-none outline-none placeholder-gray-600"
            />
            {previewUrl && (
              <div className="relative mt-3">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full rounded-xl object-cover max-h-80"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>
            )}

            {/* Toolbar row: image picker + char count */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
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
                title="Add image"
              >
                <ImagePlus size={20} />
              </button>
              <p
                className={`text-xs ${content.length > 450 ? "text-red-400" : "text-gray-600"}`}
              >
                {500 - content.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
