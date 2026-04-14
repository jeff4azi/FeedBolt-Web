import { useState } from "react";

/**
 * Loads a tiny blurred placeholder first, then swaps to the full image.
 * The image drives its own height naturally — no forced aspect ratio.
 * Props:
 *   src, placeholderSrc, alt, className, style, onClick, loading
 */
export default function ProgressiveImage({
  src,
  placeholderSrc,
  alt = "",
  className = "",
  style,
  onClick,
  loading = "lazy",
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${className}`} style={style} onClick={onClick}>
      {/* Blurred placeholder — shown until full image loads */}
      {placeholderSrc && !loaded && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg rounded-xl"
        />
      )}
      {/* Full image — drives container height naturally */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`w-full block rounded-xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
