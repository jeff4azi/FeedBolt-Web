import { supabase } from "./supabase";

const LIKE_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

// ── Push notification via Service Worker ─────────────────────────────────
export function sendBrowserNotification(title, body, url = "/notifications") {
  if (Notification.permission !== "granted") return;
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "SHOW_NOTIFICATION",
    title,
    body,
    url,
  });
}

// ── Request permission ────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

// ── Insert a notification row + fire browser push ────────────────────────
async function insertNotification({
  userId,
  type,
  postId,
  actorId,
  actorUsername,
  message,
}) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    post_id: postId ?? null,
    actor_id: actorId ?? null,
    actor_username: actorUsername ?? null,
    message,
  });
}

// ── Called after a like is added ─────────────────────────────────────────
export async function handleLikeNotification({
  postId,
  postOwnerId,
  currentUserId,
  newCount,
}) {
  if (postOwnerId === currentUserId) return; // don't notify yourself
  if (!LIKE_MILESTONES.includes(newCount)) return;

  const message = `Your post reached ${newCount} like${newCount === 1 ? "" : "s"}!`;
  await insertNotification({
    userId: postOwnerId,
    type: "like_milestone",
    postId,
    actorId: currentUserId,
    message,
  });
  sendBrowserNotification("FeedBolt 🎉", message, `/post/${postId}`);
}

// ── Called after a comment is added ──────────────────────────────────────
export async function handleCommentNotification({
  postId,
  postOwnerId,
  actorId,
  actorUsername,
}) {
  if (postOwnerId === actorId) return;

  const message = `${actorUsername} commented on your post`;
  await insertNotification({
    userId: postOwnerId,
    type: "comment",
    postId,
    actorId,
    actorUsername,
    message,
  });
  sendBrowserNotification("FeedBolt 💬", message, `/post/${postId}`);
}

// ── Called after a reply is added ────────────────────────────────────────
export async function handleReplyNotification({
  postId,
  replyOwnerId,
  actorId,
  actorUsername,
}) {
  if (replyOwnerId === actorId) return;

  const message = `${actorUsername} replied to your comment`;
  await insertNotification({
    userId: replyOwnerId,
    type: "reply",
    postId,
    actorId,
    actorUsername,
    message,
  });
  sendBrowserNotification("FeedBolt 💬", message, `/post/${postId}`);
}
