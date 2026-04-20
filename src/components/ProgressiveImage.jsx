import { useState, useRef } from "react";

/**
 * Loads a tiny blurred placeholder first, then swaps to the full image.
 * Images taller than 4:5 aspect ratio are center-cropped (top & bottom cut).
 * Images at 4:5 or wider render at their natural size.
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
  const [isTall, setIsTall] = useState(false);
  const imgRef = useRef(null);

  const handleLoad = () => {
    setLoaded(true);
    const img = imgRef.current;
    if (img) {
      // 4:5 means height/width > 1.25
      const ratio = img.naturalHeight / img.naturalWidth;
      setIsTall(ratio > 1.25);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        // When tall: lock container to 4:5 (125% padding trick)
        // When normal: let the image drive its own height
        ...(isTall ? { paddingBottom: "125%", height: 0 } : {}),
        ...style,
      }}
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
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${
          isTall
            ? // Tall: fill the 4:5 container, center-crop top & bottom
              "absolute inset-0 w-full h-full object-cover object-center"
            : // Normal: natural width/height, no cropping
              "w-full block"
        }`}
      />
    </div>
  );
}
