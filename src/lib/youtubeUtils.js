export const isYoutubeLink = (text) =>
  text?.includes("youtube.com/watch") || text?.includes("youtu.be/");

export const extractVideoId = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
};
