import { supabase } from "./supabase";

const LIKE_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

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
}

// ── Called after a user is followed ──────────────────────────────────────
export async function handleFollowNotification({
  followedUserId,
  actorId,
  actorUsername,
}) {
  if (followedUserId === actorId) return;
  const message = `${actorUsername} started following you`;
  await insertNotification({
    userId: followedUserId,
    type: "follow",
    actorId,
    actorUsername,
    message,
  });
}

export async function requestNotificationPermission() {
  return "unsupported";
}
