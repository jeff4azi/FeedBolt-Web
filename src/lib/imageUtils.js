const BASE_URL = import.meta.env.VITE_BASE_URL;

export function getOptimizedImageUrl(url, options = {}) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const {
    format = "f_auto",
    quality = "q_auto:eco",
    width,
    crop = "c_limit",
  } = options;
  const transforms = [format, quality, width, crop].filter(Boolean).join(",");
  return url.replace("/upload/", `/upload/${transforms}/`);
}

export function getPlaceholderUrl(url) {
  return getOptimizedImageUrl(url, {
    width: "w_50",
    quality: "q_10",
    crop: "c_limit",
  });
}

export async function uploadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(",")[1];
        const res = await fetch(`${BASE_URL}/upload-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64,
            mimeType: file.type,
            fileName: file.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Image upload failed.");
        resolve({
          image_url: data.image_url,
          image_public_id: data.image_public_id,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export async function deletePostImage(postId) {
  const res = await fetch(`${BASE_URL}/delete-post-image`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to delete image (${res.status}).`);
  }
}
