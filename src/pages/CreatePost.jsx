import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ImagePlus, XCircle, Youtube } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadImageFile } from "../lib/imageUtils";
import Avatar from "../components/Avatar";
import { trackEvent } from "../lib/analytics";
import { handleNewPostNotification } from "../lib/notifications";
import AlertDialog from "../components/AlertDialog";
import { useAlert } from "../hooks/useAlert";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const { alert, state: alertState, handleClose } = useAlert();
  const fileInputRef = useRef(null);

  const extractYoutubeId = (url) => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match?.[1] ?? null;
  };

  const handleYoutubeSave = () => {
    const id = extractYoutubeId(youtubeUrl.trim());
    if (!id) return;
    setYoutubeVideoId(id);
    setShowYoutubeInput(false);
    // Clear any picked image since we're using YouTube
    setPickedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveYoutube = () => {
    setYoutubeVideoId(null);
    setYoutubeUrl("");
  };

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
      } else if (youtubeVideoId) {
        image_url = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
        image_public_id = youtubeVideoId;
      }
      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim(),
          image_url,
          image_public_id,
        })
        .select("id")
        .single();
      if (error) throw error;
      trackEvent("Post", "create", pickedFile ? "with_image" : "text_only");
      const actorUsername =
        profile?.username ??
        profile?.fullname ??
        user?.user_metadata?.full_name ??
        "Someone";
      handleNewPostNotification({
        postId: postData.id,
        actorId: user.id,
        actorUsername,
      });
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={1200}
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

            {/* YouTube preview */}
            {youtubeVideoId && (
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
            {showYoutubeInput && (
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
                  disabled={!extractYoutubeId(youtubeUrl.trim())}
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

            {/* Toolbar row: image picker + youtube + char count */}
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
                  onClick={() => {
                    handleRemoveYoutube();
                    fileInputRef.current?.click();
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  title="Add image"
                >
                  <ImagePlus size={20} />
                </button>
                <button
                  onClick={() => {
                    handleRemoveImage();
                    setShowYoutubeInput((v) => !v);
                  }}
                  className={`transition-colors ${youtubeVideoId ? "text-red-500" : "text-purple-400 hover:text-purple-300"}`}
                  title="Add YouTube video"
                >
                  <Youtube size={20} />
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