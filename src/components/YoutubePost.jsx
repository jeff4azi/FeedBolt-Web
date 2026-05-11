import { useState } from "react";
import { extractVideoId } from "../lib/youtubeUtils";

export default function YoutubePost({ post }) {
  const [playing, setPlaying] = useState(false);

  const videoId = extractVideoId(post.image_public_id) ?? extractVideoId(post.image_url);
  const thumbnail =
    post.image_url ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (!videoId) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video">
      {playing ? (
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(true);
          }}
          className="relative w-full h-full group"
          aria-label="Play video"
        >
          <img
            src={thumbnail}
            alt="YouTube thumbnail"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="group-hover:scale-110 transition-transform duration-200">
              <svg
                width="68"
                height="48"
                viewBox="0 0 68 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.13 13.06 0 24 0 24s.13 10.94 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.87 34.94 68 24 68 24s-.13-10.94-1.48-16.26z"
                  fill="#FF0000"
                />
                <path d="M27.2 34.3l17.6-10.3-17.6-10.3v20.6z" fill="white" />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
