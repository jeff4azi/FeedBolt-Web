/**
 * Given a Cloudinary preview image URL (.jpg), returns the corresponding PDF URL.
 * e.g. https://res.cloudinary.com/.../file.jpg  →  .../file.pdf
 */
export function getPdfUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.replace(/\.jpg(\?.*)?$/, ".pdf");
}

/**
 * Derives a display title from the Cloudinary public_id or image_url filename.
 * Strips the version segment and underscores, trims common suffixes.
 */
export function getPdfTitle(imageUrl, fallback = "Study Material") {
  if (!imageUrl) return fallback;
  try {
    const filename = imageUrl
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, ""); // strip extension
    // Remove Cloudinary version prefix like "v1784028133_"
    const withoutVersion = filename.replace(/^v\d+_/, "");
    // Replace underscores/hyphens with spaces, decode URI
    return (
      decodeURIComponent(withoutVersion.replace(/[_-]/g, " ")).trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
}
