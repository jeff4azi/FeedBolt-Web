import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Check,
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
import { timeAgo } from "../lib/timeAgo";
import Avatar from "./Avatar";
import ConfirmDialog from "./ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import ProgressiveImage from "./ProgressiveImage";
import RichText from "./RichText";

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
    const ok = await confirm("Delete this post?");
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
    navigate(`/edit-post/${post.id}`, { state: { content: post.content } });
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
        <div className="absolute right-0 top-7 z-20 bg-[#1a1a2e] border border-gray-800 rounded-xl shadow-xl overflow-hidden min-w-[150px]">
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

export default function PostCard({
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
  const imageUri400 = post.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_400" })
    : null;
  const imageUri500 = post.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_500" })
    : null;
  const imagePlaceholder = post.image_url
    ? getPlaceholderUrl(post.image_url)
    : null;
  const commentCount = post.comments?.[0]?.count ?? 0;
  const isOwner = showOwnerActions && user?.id === post.user_id;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

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

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!profile?.id) return;
    if (profile.id === currentUserId) navigate("/profile");
    else navigate(`/user/${profile.id}`);
  };

  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: "FeedBolt post", url });
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={() => {
        sessionStorage.setItem("feed-scroll", window.scrollY);
        navigate(`/post/${post.id}`);
      }}
      className="bg-[#121218] rounded-2xl p-4 mb-3 mx-4 cursor-pointer hover:bg-[#16161e] transition-colors"
      style={{ opacity: isOwner && deleting ? 0.4 : 1 }}
    >
      <div className="flex items-center mb-3">
        <button onClick={handleAvatarClick} className="shrink-0">
          <Avatar src={profile?.avatar_url} size={40} />
        </button>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {username}
          </p>
          <p className="text-gray-500 text-xs">{timestamp}</p>
        </div>
        {isOwner && (
          <OwnerMenu
            post={post}
            onDeleted={onRefresh}
            onDeletingChange={setDeleting}
          />
        )}
      </div>

      <RichText
        hashtags
        text={post.content}
        className="text-gray-200 text-sm leading-5 mb-4 whitespace-pre-wrap"
      />

      {imageUri400 && (
        <ProgressiveImage
          src={imageUri500}
          placeholderSrc={imagePlaceholder}
          alt="post"
          loading="lazy"
          className="w-full mb-4"
          style={{ maxHeight: "700px" }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="flex items-center gap-5">
        <button onClick={handleLike} className="flex items-center gap-1.5">
          <Heart
            size={20}
            fill={liked ? "#a855f7" : "none"}
            color={liked ? "#a855f7" : "#6b7280"}
          />
          <span className="text-gray-400 text-xs">{likeCount}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/post/${post.id}`);
          }}
          className="flex items-center gap-1.5"
        >
          <MessageCircle size={18} color="#6b7280" />
          <span className="text-gray-400 text-xs">{commentCount}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 transition-colors"
        >
          {copied ? (
            <>
              <Check size={18} color="#a855f7" />
              <span className="text-purple-400 text-xs">Copied</span>
            </>
          ) : (
            <Share2 size={18} color="#6b7280" />
          )}
        </button>
      </div>
    </div>
  );
}
