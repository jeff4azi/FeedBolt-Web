import { useState } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function YoutubePost({ post }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const handlePlay = async () => {
    if (videoUrl || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/video-info?id=${post.image_public_id}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
      const data = await res.json();
      setVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full aspect-video"
        />
      ) : (
        <>
          <img
            src={post.image_url}
            alt="YouTube thumbnail"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handlePlay}
              disabled={loading}
              className="bg-black/60 hover:bg-black/80 rounded-full p-4 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={28} color="#fff" className="animate-spin" />
              ) : (
                <Play size={28} color="#ff0000" fill="#ff0000" />
              )}
            </button>
          </div>
        </>
      )}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          <span>Couldn't load video: {error}</span>
        </div>
      )}
    </div>
  );
}
