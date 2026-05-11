const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export const extractVideoId = (value) => {
  if (!value) return null;

  const text = String(value).trim();
  if (YOUTUBE_ID_PATTERN.test(text)) return text;

  try {
    const parsed = new URL(text);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const id =
        parsed.searchParams.get("v") ??
        parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (hostname === "img.youtube.com" || hostname === "i.ytimg.com") {
      const id = parsed.pathname.match(/\/vi\/([a-zA-Z0-9_-]{11})/)?.[1];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
  } catch {
    const id = text.match(
      /(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/)|youtu\.be\/|img\.youtube\.com\/vi\/|i\.ytimg\.com\/vi\/)([a-zA-Z0-9_-]{11})/,
    )?.[1];
    return id ?? null;
  }

  return null;
};

export const isYoutubeLink = (text) => Boolean(extractVideoId(text));
