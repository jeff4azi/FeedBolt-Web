import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Check,
  Download,
  ExternalLink,
  FileText,
  Send,
  X,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getOptimizedImageUrl, getPlaceholderUrl } from "../lib/imageUtils";
import { getPdfUrl, getPdfTitle } from "../lib/pdfUtils";
import {
  handleCommentNotification,
  handleLikeNotification,
  handleReplyNotification,
} from "../lib/notifications";
import { timeAgo } from "../lib/timeAgo";
import { trackEvent } from "../lib/analytics";
import Avatar from "../components/Avatar";
import ProgressiveImage from "../components/ProgressiveImage";
import CommentItem from "../components/CommentItem";
import { PostDetailSkeleton } from "../components/Skeleton";
import RichText from "../components/RichText";

export default function PdfDetailPage() {
  const navigate = useNavigate();
  const { pdfId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, profile: authProfile } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [resolvedNotificationTarget, setResolvedNotificationTarget] =
    useState(null);

  const fetchRepliesRef = useRef({});
  const inputRef = useRef(null);
  const commentsSectionRef = useRef(null);

  const targetCommentId =
    searchParams.get("comment") ?? resolvedNotificationTarget?.commentId;
  const targetReplyId =
    searchParams.get("reply") ?? resolvedNotificationTarget?.replyId;
  const notificationType = searchParams.get("fromNotification");
  const notificationActorId = searchParams.get("actor");
  const notificationSearchKey = searchParams.toString();

  // ── Keyboard aware padding ────────────────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const height = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(height);
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(id, fullname, username, avatar_url)")
      .eq("id", pdfId)
      .single();
    if (data) setPost(data);
    setLoading(false);
  }, [pdfId]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select(
        "*, profiles(id, fullname, username, avatar_url), reply_count:comment_replies(count)",
      )
      .eq("post_id", pdfId)
      .order("created_at", { ascending: true });
    if (data)
      setComments(
        data.map((c) => ({
          ...c,
          reply_count: c.reply_count?.[0]?.count ?? 0,
        })),
      );
  }, [pdfId]);

  const fetchLikes = useCallback(async () => {
    const { data, count } = await supabase
      .from("likes")
      .select("user_id", { count: "exact" })
      .eq("post_id", pdfId);
    setLikeCount(count ?? 0);
    setLiked(data?.some((l) => l.user_id === user?.id) ?? false);
  }, [pdfId, user]);

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchLikes();
  }, [fetchPost, fetchComments, fetchLikes]);

  // ── Notification deep-link resolution ────────────────────────────────────
  useEffect(() => {
    setResolvedNotificationTarget(null);
  }, [pdfId, notificationSearchKey]);

  useEffect(() => {
    if (!comments.length || targetCommentId || !notificationActorId) return;
    if (notificationType === "comment") {
      const match = [...comments]
        .reverse()
        .find((c) => c.user_id === notificationActorId);
      if (match) setResolvedNotificationTarget({ commentId: match.id });
      return;
    }
    if (notificationType !== "reply") return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("comment_replies")
        .select("id, comment_id")
        .in(
          "comment_id",
          comments.map((c) => c.id),
        )
        .eq("user_id", notificationActorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data)
        setResolvedNotificationTarget({
          commentId: data.comment_id,
          replyId: data.id,
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [comments, notificationActorId, notificationType, targetCommentId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", pdfId)
        .eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("likes").insert({ post_id: pdfId, user_id: user.id });
      trackEvent("Post", "like", pdfId);
      if (post?.user_id) {
        handleLikeNotification({
          postId: pdfId,
          postOwnerId: post.user_id,
          currentUserId: user.id,
          newCount: likeCount + 1,
        });
      }
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/pdf/${pdfId}`;
    if (navigator.share) {
      navigator.share({ title: title, url });
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const actorUsername =
      authProfile?.username ??
      authProfile?.fullname ??
      user.user_metadata?.full_name ??
      user.email ??
      "Someone";

    if (replyTarget) {
      const payload = {
        comment_id: replyTarget.commentId,
        user_id: user.id,
        content: text,
        replied_to_username: replyTarget.username,
      };
      const { data, error } = await supabase
        .from("comment_replies")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        setCommentText(text);
        return;
      }
      fetchRepliesRef.current[replyTarget.commentId]?.({ show: true });
      setReplyTarget(null);
      trackEvent("Comment", "reply", pdfId);
      if (replyTarget.commentOwnerId !== user.id) {
        handleReplyNotification({
          postId: pdfId,
          commentId: replyTarget.commentId,
          replyId: data?.id,
          replyOwnerId: replyTarget.commentOwnerId,
          actorId: user.id,
          actorUsername,
        });
      }
    } else {
      const { data, error } = await supabase
        .from("comments")
        .insert({ post_id: pdfId, user_id: user.id, content: text })
        .select("id")
        .single();
      if (error) {
        setCommentText(text);
        return;
      }
      trackEvent("Comment", "create", pdfId);
      fetchComments();
      if (post?.user_id && post.user_id !== user.id) {
        handleCommentNotification({
          postId: pdfId,
          commentId: data?.id,
          postOwnerId: post.user_id,
          actorId: user.id,
          actorUsername,
        });
      }
    }
  };

  const handleReply = (target) => {
    setReplyTarget(target);
    setCommentText("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setCommentText("");
  };

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => inputRef.current?.focus(), 400);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const profile = post?.profiles;
  const uploaderName = profile?.username ?? profile?.fullname ?? "Unknown";
  const previewUrl = post?.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_800" })
    : null;
  const placeholderUrl = post?.image_url
    ? getPlaceholderUrl(post.image_url)
    : null;
  const pdfUrl = getPdfUrl(post?.image_url);
  const title = post?.title || getPdfTitle(post?.image_url);
  const userAvatar = authProfile?.avatar_url ?? user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center px-4 py-3 border-b border-gray-800">
        <button
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate("/feed")
          }
          className="mr-3 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <FileText size={18} color="#a855f7" className="mr-2 shrink-0" />
        <h2 className="text-white text-lg font-semibold truncate">
          {post?.title || getPdfTitle(post?.image_url) || "Study Material"}
        </h2>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <PostDetailSkeleton />
        ) : post ? (
          <>
            {/* ── Document hero card ──────────────────────────────────────── */}
            <div className="bg-[#121218] mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-800/50">
              {/* Preview image */}
              {previewUrl ? (
                <div className="relative w-full bg-[#0f0f17]">
                  <ProgressiveImage
                    src={previewUrl}
                    placeholderSrc={placeholderUrl}
                    alt={title}
                    className="w-full object-contain max-h-96"
                  />
                  {/* PDF badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#0B0B0F]/80 backdrop-blur-sm border border-purple-700/50 rounded-lg px-2.5 py-1">
                    <FileText size={12} color="#a855f7" />
                    <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                      PDF
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-40 bg-linear-to-br from-[#1a1030] via-[#130e28] to-[#0B0B0F] flex items-center justify-center">
                  <FileText size={56} color="#6b21a8" strokeWidth={1.2} />
                </div>
              )}

              {/* Meta section */}
              <div className="p-4">
                {/* Title */}
                <div className="flex items-start gap-2 mb-2">
                  <BookOpen
                    size={16}
                    color="#a855f7"
                    className="mt-0.5 shrink-0"
                  />
                  <h1 className="text-white font-bold text-base leading-6">
                    {title}
                  </h1>
                </div>

                {/* Caption */}
                {post.content ? (
                  <RichText
                    hashtags
                    text={post.content}
                    className="text-gray-300 text-sm leading-6 mb-4 whitespace-pre-wrap"
                  />
                ) : null}

                {/* Uploader + date */}
                <div className="flex items-center gap-2.5 mb-4">
                  <button
                    onClick={() =>
                      profile?.id && navigate(`/user/${profile.id}`)
                    }
                  >
                    <Avatar src={profile?.avatar_url} size={32} />
                  </button>
                  <div>
                    <p className="text-white text-xs font-semibold">
                      {uploaderName}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                {/* CTA buttons */}
                {pdfUrl && (
                  <div className="flex gap-3 mb-4">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open PDF
                    </a>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a2e] hover:bg-[#20203a] border border-gray-700 hover:border-purple-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-5 pt-3 border-t border-gray-800">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-1.5"
                  >
                    <Heart
                      size={20}
                      fill={liked ? "#a855f7" : "none"}
                      color={liked ? "#a855f7" : "#6b7280"}
                    />
                    <span className="text-gray-400 text-sm">{likeCount}</span>
                  </button>
                  <button
                    onClick={scrollToComments}
                    className="flex items-center gap-1.5"
                  >
                    <MessageCircle size={18} color="#6b7280" />
                    <span className="text-gray-400 text-sm">
                      {comments.length}
                    </span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={18} color="#a855f7" />
                        <span className="text-purple-400 text-sm">Copied</span>
                      </>
                    ) : (
                      <Share2 size={18} color="#6b7280" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Comments section ──────────────────────────────────────────── */}
            <div ref={commentsSectionRef} className="px-4 mt-6">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
                Discussion
              </p>
              {comments.length === 0 ? (
                <p className="text-gray-600 text-center py-6">
                  No comments yet. Start the discussion!
                </p>
              ) : (
                comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={pdfId}
                    onReply={handleReply}
                    onDeleteComment={(id) =>
                      setComments((prev) => prev.filter((x) => x.id !== id))
                    }
                    replyTarget={replyTarget}
                    targetCommentId={targetCommentId}
                    targetReplyId={targetReplyId}
                    onRegisterFetch={(fn) => {
                      fetchRepliesRef.current[c.id] = fn;
                    }}
                  />
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Fixed comment input ─────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#0B0B0F] border-t border-gray-800 px-4 py-3 z-20 transition-all duration-200"
        style={{ bottom: kbHeight }}
      >
        {replyTarget && (
          <div className="max-w-2xl mx-auto flex items-center justify-between mb-2 px-1">
            <span className="text-purple-400 text-xs">
              Replying to{" "}
              <span className="font-semibold">{replyTarget.username}</span>
            </span>
            <button
              onClick={cancelReply}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Avatar src={userAvatar} size={32} />
          <form
            onSubmit={handleSubmit}
            className="flex-1 flex items-center gap-2"
          >
            <textarea
              ref={inputRef}
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                const isMobile = /Android|iPhone|iPad|iPod/i.test(
                  navigator.userAgent,
                );
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  if (commentText.trim()) handleSubmit(e);
                }
              }}
              placeholder={
                replyTarget
                  ? `Reply to ${replyTarget.username}...`
                  : "Add to the discussion..."
              }
              rows={1}
              className="flex-1 bg-[#121218] text-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none border border-gray-800 focus:border-purple-700 transition-colors placeholder-gray-600 resize-none overflow-hidden leading-5"
            />
            <button type="submit" className="shrink-0">
              <Send
                size={20}
                color={commentText.trim().length > 0 ? "#a855f7" : "#374151"}
              />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
