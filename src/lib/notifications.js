import { supabase } from "./supabase";

const LIKE_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const BASE_URL = import.meta.env.VITE_BASE_URL;

// ── Send push via backend ─────────────────────────────────────────────────
async function sendPushToUser(userId, title, body, url = "/notifications") {
  try {
    await fetch(`${BASE_URL}/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, url }),
    });
  } catch (err) {
    console.error("Push send failed:", err);
  }
}

// ── Convert VAPID key to Uint8Array ───────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Request permission + save subscription to DB ──────────────────────────
export async function requestNotificationPermission(userId) {
  if (!("Notification" in window) || !("serviceWorker" in navigator))
    return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, subscription: subscription.toJSON() },
        { onConflict: "user_id" },
      );
  } catch (err) {
    console.error("Push subscription failed:", err);
  }

  return "granted";
}

// ── Insert a notification row ─────────────────────────────────────────────
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
  if (postOwnerId === currentUserId) return;
  if (!LIKE_MILESTONES.includes(newCount)) return;

  const message = `Your post reached ${newCount} like${newCount === 1 ? "" : "s"}!`;
  await insertNotification({
    userId: postOwnerId,
    type: "like_milestone",
    postId,
    actorId: currentUserId,
    message,
  });
  sendPushToUser(postOwnerId, "FeedBolt 🎉", message, `/post/${postId}`);
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
  sendPushToUser(postOwnerId, "FeedBolt", message, `/post/${postId}`);
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
  sendPushToUser(replyOwnerId, "FeedBolt 💬", message, `/post/${postId}`);
}
