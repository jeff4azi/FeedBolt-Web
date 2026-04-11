import { useState } from "react";

/**
 * Loads a tiny blurred placeholder first, then swaps to the full image.
 * Props:
 *   src         — full-res URL
 *   placeholderSrc — tiny URL (w_50,q_10)
 *   alt, className, style, onClick, loading
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
    <div
      className={`relative overflow-hidden ${className}`}
      style={style}
      onClick={onClick}
    >
      {/* Blurred placeholder */}
      {placeholderSrc && !loaded && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg"
        />
      )}
      {/* Full image */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
