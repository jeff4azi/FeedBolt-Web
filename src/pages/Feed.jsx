import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, profiles(id, fullname, username, avatar_url), comments(count)",
      )
      .order("created_at", { ascending: false });
    if (!error) setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const avatar = user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <h1 className="text-white text-2xl font-bold">
          Feed<span className="text-purple-400">Bolt</span>
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/create-post")}
            className="w-9 h-9 bg-[#121218] rounded-full flex items-center justify-center border border-gray-800 hover:border-purple-700 transition-colors"
          >
            <Plus size={20} color="#a855f7" />
          </button>
          <button onClick={() => navigate("/profile")}>
            <Avatar
              src={avatar}
              size={36}
              className="border border-purple-700"
            />
          </button>
        </div>
      </div>

      {/* Refresh button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-gray-500 text-xs uppercase tracking-widest">
          Latest Posts
        </span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin text-purple-400" : ""}
          />
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        [1, 2, 3].map((i) => <PostCardSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <p className="text-gray-600 text-center mt-12">
          No posts yet. Be the first!
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onRefresh={fetchPosts}
          />
        ))
      )}
    </div>
  );
}
