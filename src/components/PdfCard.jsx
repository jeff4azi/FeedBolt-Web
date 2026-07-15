import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Check,
  FileText,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getOptimizedImageUrl,
  getPlaceholderUrl,
  deletePostImage,
} from "../lib/imageUtils";
import { getPdfUrl, getPdfTitle } from "../lib/pdfUtils";
import { timeAgo } from "../lib/timeAgo";
import Avatar from "./Avatar";
import ProgressiveImage from "./ProgressiveImage";
import ConfirmDialog from "./ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

// ── Owner menu (same pattern as PostCard) ─────────────────────────────────────
function OwnerMenu({ post, onDeleted, onDeletingChange }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setOpen(false);
    const ok = await confirm("Delete this PDF post?");
    if (!ok) return;
    setDeleting(true);
    onDeletingChange?.(true);
    try {
      if (post?.image_public_id) await deletePostImage(post.id).catch(() => {});
      await supabase.from("posts").delete().eq("id", post.id);
      onDeleted?.();
    } finally {
      setDeleting(false);
      onDeletingChange?.(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setOpen(false);
    navigate(`/edit-post/${post.id}`, {
      state: {
        title: post.title ?? "",
        content: post.content,
        image_url: post.image_url ?? null,
        image_public_id: post.image_public_id ?? null,
        is_pdf: true,
      },
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      {state && (
        <ConfirmDialog
          message={state.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={deleting}
        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {deleting ? (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <Trash2 size={13} /> Deleting...
          </span>
        ) : (
          <MoreHorizontal size={18} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 bg-[#1a1a2e] border border-gray-800 rounded-xl shadow-xl overflow-hidden min-w-37.5">
          <button
            onClick={handleEdit}
            className="flex items-center gap-3 w-full px-4 py-3 text-white hover:bg-[#121218] transition-colors text-sm"
          >
            <Pencil size={16} color="#a855f7" /> Edit post
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-[#121218] transition-colors text-sm"
          >
            <Trash2 size={16} /> Delete post
          </button>
        </div>
      )}
    </div>
  );
}

// ── PdfCard ───────────────────────────────────────────────────────────────────
export default function PdfCard({
  post,
  currentUserId,
  onRefresh,
  showOwnerActions,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = post.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const timestamp = timeAgo(post.created_at);

  const previewUrl = post.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_400" })
    : null;
  const placeholderUrl = post.image_url
    ? getPlaceholderUrl(post.image_url)
    : null;
  const pdfUrl = getPdfUrl(post.image_url);
  const title = post.title || getPdfTitle(post.image_url);

  const isOwner = showOwnerActions && user?.id === post.user_id;
  const [deleting, setDeleting] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(
    post.comments?.[0]?.count ?? 0,
  );
  const [copied, setCopied] = useState(false);

  const cardRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          await supabase.rpc("increment_post_impression", {
            p_user_id: user.id,
            p_post_id: post.id,
          });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("likes")
      .select("user_id", { count: "exact" })
      .eq("post_id", post.id)
      .then(({ data, count }) => {
        setLikeCount(count ?? 0);
        setLiked(data?.some((l) => l.user_id === user.id) ?? false);
      });
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [post.id, user]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: user.id });
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = window.location.origin + "/pdf/" + post.id;
    if (navigator.share) {
      navigator.share({ title: title, url: url });
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!profile?.id) return;
    if (profile.id === currentUserId) {
      navigate("/profile");
    } else {
      navigate("/user/" + profile.id);
    }
  };

  const handleCardClick = () => {
    sessionStorage.setItem("feed-scroll", window.scrollY);
    navigate("/pdf/" + post.id);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className="group bg-[#121218] rounded-2xl mb-3 mx-4 cursor-pointer overflow-hidden border border-gray-800/40 transition-all duration-300 hover:border-purple-700/60 hover:shadow-[0_8px_30px_rgba(168,85,247,0.12)] hover:-translate-y-0.5"
      style={{ opacity: isOwner && deleting ? 0.4 : 1 }}
    >
      <div className="flex sm:flex-row flex-col">
        {/* ── Thumbnail ─────────────────────────────────────────────────── */}
        <div className="relative w-full sm:w-40 h-40 sm:h-auto shrink-0 overflow-hidden bg-linear-to-br from-[#1a1030] via-[#130e28] to-[#0B0B0F] flex items-center justify-center">
          {previewUrl ? (
            <ProgressiveImage
              src={previewUrl}
              placeholderSrc={placeholderUrl}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <FileText
              size={40}
              color="#a855f7"
              strokeWidth={1.3}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-purple-600/40 rounded-md px-2 py-1">
            <FileText size={12} color="#c084fc" />
            <span className="text-purple-300 text-[10px] font-bold uppercase tracking-wider">
              PDF
            </span>
          </div>
        </div>

        {/* ── Info block ───────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 flex flex-col justify-between p-4">
          <div>
            {/* Title row with optional owner menu */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-white font-semibold text-sm sm:text-base leading-5 line-clamp-2 group-hover:text-purple-300 transition-colors duration-200 flex-1">
                {title}
              </p>
              {isOwner && (
                <div className="shrink-0 -mt-1 -mr-1">
                  <OwnerMenu
                    post={post}
                    onDeleted={onRefresh}
                    onDeletingChange={setDeleting}
                  />
                </div>
              )}
            </div>

            {post.content ? (
              <p className="text-gray-400 text-xs leading-5 mt-1 line-clamp-2">
                {post.content}
              </p>
            ) : null}

            <div className="flex items-center gap-2 mt-2.5">
              <button onClick={handleAvatarClick} className="shrink-0">
                <Avatar src={profile?.avatar_url} size={20} />
              </button>
              <span className="text-gray-500 text-xs truncate">{username}</span>
              <span className="text-gray-700 text-xs">.</span>
              <span className="text-gray-600 text-xs">{timestamp}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800/60 my-3" />

          {/* Action bar */}
          <div className="flex items-center gap-5">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 transition-transform active:scale-90"
            >
              <Heart
                size={17}
                fill={liked ? "#a855f7" : "none"}
                color={liked ? "#a855f7" : "#6b7280"}
                className="transition-colors duration-150"
              />
              <span className="text-gray-400 text-xs">{likeCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate("/pdf/" + post.id);
              }}
              className="flex items-center gap-1.5 transition-transform active:scale-90"
            >
              <MessageCircle size={16} color="#6b7280" />
              <span className="text-gray-400 text-xs">{commentCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 transition-transform active:scale-90"
            >
              {copied ? (
                <>
                  <Check size={16} color="#a855f7" />
                  <span className="text-purple-400 text-xs">Copied</span>
                </>
              ) : (
                <Share2 size={16} color="#6b7280" />
              )}
            </button>

            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                onClick={(e) => e.stopPropagation()}
                className="ml-auto flex items-center gap-1.5 text-gray-500 hover:text-purple-400 hover:scale-110 transition-all"
                title="Download PDF"
              >
                <Download size={16} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
