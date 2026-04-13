import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import RichText from "./RichText";
import { timeAgo } from "../lib/timeAgo";

function ReplyItem({ reply, onReply, currentUser }) {
  const profile = reply.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const repliedTo = reply.replied_to_username;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from("comment_reply_likes")
      .select("user_id", { count: "exact" })
      .eq("reply_id", reply.id)
      .then(({ data, count, error }) => {
        if (error) return; // table may not exist yet
        setLikeCount(count ?? 0);
        setLiked(data?.some((l) => l.user_id === currentUser.id) ?? false);
      });
  }, [reply.id, currentUser]);

  const handleLike = async () => {
    if (!currentUser) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("comment_reply_likes")
        .delete()
        .eq("reply_id", reply.id)
        .eq("user_id", currentUser.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase
        .from("comment_reply_likes")
        .insert({ reply_id: reply.id, user_id: currentUser.id });
    }
  };

  return (
    <div className="flex mt-3">
      <Avatar src={profile?.avatar_url} size={26} className="mt-0.5 shrink-0" />
      <div className="ml-2 flex-1 bg-[#121218] rounded-xl px-3 py-2">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-xs">{username}</span>
            {repliedTo && (
              <>
                <span className="text-gray-600 text-xs">›</span>
                <span className="text-purple-400 text-xs">{repliedTo}</span>
              </>
            )}
          </div>
          <span className="text-gray-600 text-xs">
            {timeAgo(reply.created_at)}
          </span>
        </div>
        <RichText
          text={reply.content}
          className="text-gray-300 text-xs leading-5"
        />
        <div className="flex items-center gap-3 mt-1.5">
          <button onClick={handleLike} className="flex items-center gap-1">
            <Heart
              size={11}
              fill={liked ? "#a855f7" : "none"}
              color={liked ? "#a855f7" : "#6b7280"}
            />
            {likeCount > 0 && (
              <span className="text-gray-600 text-xs">{likeCount}</span>
            )}
          </button>
          <button
            onClick={() => onReply(username)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            <MessageCircle size={11} />
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommentItem({
  comment,
  onReply,
  replyTarget,
  onRegisterFetch,
}) {
  const { user } = useAuth();
  const profile = comment.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const timestamp = timeAgo(comment.created_at);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("comment_likes")
      .select("user_id", { count: "exact" })
      .eq("comment_id", comment.id)
      .then(({ data, count }) => {
        setLikeCount(count ?? 0);
        setLiked(data?.some((l) => l.user_id === user.id) ?? false);
      });
  }, [comment.id, user]);

  const fetchReplies = useCallback(async () => {
    const { data, error } = await supabase
      .from("comment_replies")
      .select(
        "*, profiles!comment_replies_user_id_fkey(id, fullname, username, avatar_url)",
      )
      .eq("comment_id", comment.id)
      .order("created_at", { ascending: true });
    if (data) {
      setReplies(data);
      setRepliesLoaded(true);
    }
  }, [comment.id]);

  useEffect(() => {
    if (!onRegisterFetch) return;
    onRegisterFetch((opts) => {
      fetchReplies();
      if (opts?.show) setShowReplies(true);
    });
  }, [onRegisterFetch, fetchReplies]);

  const handleToggleReplies = async () => {
    if (!showReplies && !repliesLoaded) await fetchReplies();
    setShowReplies((v) => !v);
  };

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase
        .from("comment_likes")
        .insert({ comment_id: comment.id, user_id: user.id });
    }
  };

  const isReplying = replyTarget?.commentId === comment.id;

  return (
    <div className="flex mb-4">
      <Avatar src={profile?.avatar_url} size={32} className="mt-0.5 shrink-0" />
      <div className="ml-3 flex-1">
        <div className="bg-[#1a1a24] rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-semibold text-xs">{username}</span>
            <span className="text-gray-600 text-xs">{timestamp}</span>
          </div>
          <RichText
            text={comment.content}
            className="text-gray-300 text-sm leading-5"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-1.5 px-1">
          <button onClick={handleLike} className="flex items-center gap-1">
            <Heart
              size={13}
              fill={liked ? "#a855f7" : "none"}
              color={liked ? "#a855f7" : "#6b7280"}
            />
            {likeCount > 0 && (
              <span className="text-gray-500 text-xs">{likeCount}</span>
            )}
          </button>
          <button
            onClick={() =>
              onReply({
                commentId: comment.id,
                commentOwnerId: comment.user_id,
                username,
              })
            }
            className={`flex items-center gap-1 text-xs transition-colors ${
              isReplying
                ? "text-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <MessageCircle size={13} />
            {isReplying ? "Replying..." : "Reply"}
          </button>
          {(replies.length > 0 || comment.reply_count > 0) && (
            <button
              onClick={handleToggleReplies}
              className="flex items-center gap-1 text-purple-500 hover:text-purple-400 text-xs transition-colors"
            >
              {showReplies ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
              {showReplies
                ? "Hide"
                : `${replies.length || comment.reply_count} repl${
                    (replies.length || comment.reply_count) === 1 ? "y" : "ies"
                  }`}
            </button>
          )}
        </div>

        {/* Replies list */}
        {showReplies &&
          replies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              currentUser={user}
              onReply={(targetUsername) =>
                onReply({
                  commentId: comment.id,
                  commentOwnerId: comment.user_id,
                  username: targetUsername,
                })
              }
            />
          ))}
        {showReplies && repliesLoaded && replies.length === 0 && (
          <p className="text-gray-600 text-xs px-1 mt-2">No replies yet.</p>
        )}
      </div>
    </div>
  );
}
