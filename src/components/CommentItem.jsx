import { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";

function ReplyItem({ reply }) {
  const profile = reply.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  return (
    <div className="flex mt-3">
      <Avatar src={profile?.avatar_url} size={26} className="mt-0.5 shrink-0" />
      <div className="ml-2 flex-1 bg-[#121218] rounded-xl px-3 py-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-white font-semibold text-xs">{username}</span>
          <span className="text-gray-600 text-xs">
            {new Date(reply.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-gray-300 text-xs leading-5">{reply.content}</p>
      </div>
    </div>
  );
}

export default function CommentItem({ comment }) {
  const { user } = useAuth();
  const profile = comment.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const timestamp = new Date(comment.created_at).toLocaleDateString();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

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

  const fetchReplies = async () => {
    const { data } = await supabase
      .from("comment_replies")
      .select("*, profiles(id, fullname, username, avatar_url)")
      .eq("comment_id", comment.id)
      .order("created_at", { ascending: true });
    if (data) setReplies(data);
  };

  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0) await fetchReplies();
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

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    setReplyText("");
    const { error } = await supabase.from("comment_replies").insert({
      comment_id: comment.id,
      user_id: user.id,
      content: text,
    });
    if (error) {
      setReplyText(text);
    } else {
      await fetchReplies();
      setShowReplies(true);
      setReplying(false);
    }
  };

  return (
    <div className="flex mb-4">
      <Avatar src={profile?.avatar_url} size={32} className="mt-0.5 shrink-0" />
      <div className="ml-3 flex-1">
        <div className="bg-[#1a1a24] rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-semibold text-xs">{username}</span>
            <span className="text-gray-600 text-xs">{timestamp}</span>
          </div>
          <p className="text-gray-300 text-sm leading-5">{comment.content}</p>
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
            onClick={() => setReplying((v) => !v)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            <MessageCircle size={13} />
            Reply
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
                : `${replies.length || comment.reply_count} repl${(replies.length || comment.reply_count) === 1 ? "y" : "ies"}`}
            </button>
          )}
        </div>

        {/* Reply input */}
        {replying && (
          <form
            onSubmit={handleReplySubmit}
            className="flex items-center gap-2 mt-2"
          >
            <Avatar src={user?.user_metadata?.avatar_url} size={24} />
            <input
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${username}...`}
              className="flex-1 bg-[#121218] text-gray-200 rounded-full px-3 py-1.5 text-xs outline-none border border-gray-800 focus:border-purple-700 transition-colors placeholder-gray-600"
            />
            <button type="submit" className="shrink-0">
              <Send
                size={14}
                color={replyText.trim() ? "#a855f7" : "#374151"}
              />
            </button>
          </form>
        )}

        {/* Replies list */}
        {showReplies && replies.map((r) => <ReplyItem key={r.id} reply={r} />)}
      </div>
    </div>
  );
}
