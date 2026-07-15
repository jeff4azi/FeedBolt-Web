/**
 * Given a Cloudinary preview image URL (.jpg), returns the corresponding raw PDF URL.
 * Handles both the path segment (image/upload → raw/upload) and extension (.jpg → .pdf).
 *
 * e.g. https://res.cloudinary.com/x/image/upload/v1/file.jpg
 *   →  https://res.cloudinary.com/x/raw/upload/v1/file.pdf
 */
export function getPdfUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl
    .replace("/image/upload/", "/raw/upload/")
    .replace(/\.jpg(\?.*)?$/, ".pdf");
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
