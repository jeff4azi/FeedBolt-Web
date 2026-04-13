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

const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.82;

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Scale down if larger than MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas compression failed."));
          resolve(blob);
        },
        "image/jpeg",
        COMPRESS_QUALITY,
      );
    };
    img.onerror = () =>
      reject(new Error("Failed to load image for compression."));
    img.src = objectUrl;
  });
}

export async function uploadImageFile(file) {
  const compressed = await compressImage(file);

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
            mimeType: "image/jpeg",
            fileName: file.name.replace(/\.[^.]+$/, ".jpg"),
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
    reader.readAsDataURL(compressed);
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
