import { supabase } from "./supabase";

const LIKE_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

// ── Insert a notification row ─────────────────────────────────────────────
async function insertNotification({
  userId,
  type,
  postId,
  commentId,
  replyId,
  actorId,
  actorUsername,
  message,
}) {
  const row = {
    user_id: userId,
    type,
    post_id: postId ?? null,
    comment_id: commentId ?? null,
    reply_id: replyId ?? null,
    actor_id: actorId ?? null,
    actor_username: actorUsername ?? null,
    message,
  };

  const { error } = await supabase.from("notifications").insert(row);

  if (error && (commentId || replyId)) {
    const legacyRow = { ...row };
    delete legacyRow.comment_id;
    delete legacyRow.reply_id;
    await supabase.from("notifications").insert(legacyRow);
  }
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
  commentId,
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
    commentId,
    actorId,
    actorUsername,
    message,
  });
}

// ── Called after a reply is added ────────────────────────────────────────
export async function handleReplyNotification({
  postId,
  commentId,
  replyId,
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
    commentId,
    replyId,
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

// ── Called after a new post is created — notifies all followers ───────────
export async function handleNewPostNotification({
  postId,
  actorId,
  actorUsername,
}) {
  const { data: followers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", actorId);

  if (!followers?.length) return;

  const rows = followers.map(({ follower_id }) => ({
    user_id: follower_id,
    type: "new_post",
    post_id: postId,
    actor_id: actorId,
    actor_username: actorUsername,
    message: `${actorUsername} just posted something new`,
  }));

  await supabase.from("notifications").insert(rows);
}

export async function requestNotificationPermission() {
  return "unsupported";
}
