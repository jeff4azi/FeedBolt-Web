import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getOptimizedImageUrl, getPlaceholderUrl } from "../lib/imageUtils";
import CommentItem from "../components/CommentItem";
import ImageViewer from "../components/ImageViewer";
import { PostDetailSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";
import ProgressiveImage from "../components/ProgressiveImage";

export default function PostDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kbHeight, setKbHeight] = useState(0);

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

  const fetchLikes = useCallback(async () => {
    const { data, count } = await supabase
      .from("likes")
      .select("user_id", { count: "exact" })
      .eq("post_id", postId);
    setLikeCount(count ?? 0);
    setLiked(data?.some((l) => l.user_id === user?.id) ?? false);
  }, [postId, user]);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(id, fullname, username, avatar_url)")
      .eq("id", postId)
      .single();
    if (data) setPost(data);
    setLoading(false);
  }, [postId]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select(
        "*, profiles(id, fullname, username, avatar_url), reply_count:comment_replies(count)",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data)
      setComments(
        data.map((c) => ({
          ...c,
          reply_count: c.reply_count?.[0]?.count ?? 0,
        })),
      );
  }, [postId]);

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchLikes();
  }, [fetchPost, fetchComments, fetchLikes]);

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    });
    if (error) {
      setCommentText(text);
    } else {
      fetchComments();
    }
  };

  const profile = post?.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const imageUri = post?.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_400" })
    : null;
  const imagePlaceholder = post?.image_url
    ? getPlaceholderUrl(post.image_url)
    : null;
  const imageViewerUri = post?.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_700" })
    : null;
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-white text-lg font-semibold">Post</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <PostDetailSkeleton />
        ) : post ? (
          <div className="px-4">
            <div className="bg-[#121218] rounded-2xl p-4 my-4">
              <div className="flex items-center mb-3">
                <button
                  onClick={() => profile?.id && navigate(`/user/${profile.id}`)}
                >
                  <Avatar src={profile?.avatar_url} size={44} />
                </button>
                <div className="ml-3">
                  <p className="text-white font-semibold">{username}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-gray-200 text-base leading-6 mb-4 whitespace-pre-wrap">
                {post.content}
              </p>
              {imageUri && (
                <button
                  onClick={() => setImageViewerOpen(true)}
                  className="w-full mb-4"
                >
                  <ProgressiveImage
                    src={imageUri}
                    placeholderSrc={imagePlaceholder}
                    alt="post"
                    loading="lazy"
                    className="w-full rounded-xl"
                    style={{ aspectRatio: "16/9" }}
                  />
                </button>
              )}
              <div className="flex items-center gap-5 pt-3 border-t border-gray-800">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5"
                >
                  <Heart
                    size={22}
                    fill={liked ? "#a855f7" : "none"}
                    color={liked ? "#a855f7" : "#6b7280"}
                  />
                  <span className="text-gray-400 text-sm">{likeCount}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <MessageCircle size={20} color="#6b7280" />
                  <span className="text-gray-400 text-sm">
                    {comments.length}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
              Comments
            </p>

            {comments.length === 0 ? (
              <p className="text-gray-600 text-center py-6">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((c) => <CommentItem key={c.id} comment={c} />)
            )}
          </div>
        ) : null}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-[#0B0B0F] border-t border-gray-800 px-4 py-3 z-20 transition-all duration-200"
        style={{ bottom: kbHeight }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Avatar src={userAvatar} size={32} />
          <form
            onSubmit={handleAddComment}
            className="flex-1 flex items-center gap-2"
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[#121218] text-gray-200 rounded-full px-4 py-2.5 text-sm outline-none border border-gray-800 focus:border-purple-700 transition-colors placeholder-gray-600"
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

      {imageViewerUri && (
        <ImageViewer
          uri={imageViewerUri}
          visible={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </div>
  );
}
