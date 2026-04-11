import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";

const PAGE_SIZE = 50;

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinelRef = useRef(null);
  const postsLengthRef = useRef(0);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, profiles(id, fullname, username, avatar_url), comments(count)",
      )
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (!error) {
      const result = data ?? [];
      setPosts(result);
      postsLengthRef.current = result.length;
      setExhausted(result.length < PAGE_SIZE);
    }
    setLoading(false);
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    const from = postsLengthRef.current;
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, profiles(id, fullname, username, avatar_url), comments(count)",
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (!error && data) {
      setPosts((p) => [...p, ...data]);
      postsLengthRef.current = from + data.length;
      if (data.length < PAGE_SIZE) setExhausted(true);
    }
    setLoadingMore(false);
  }, [loadingMore, exhausted]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Intersection observer to trigger fetchMore
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setExhausted(false);
    postsLengthRef.current = 0;
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
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onRefresh={fetchPosts}
            />
          ))}

          {/* Sentinel + load more states */}
          <div ref={sentinelRef} className="pb-2">
            {loadingMore && (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            )}
            {exhausted && !loadingMore && (
              <p className="text-gray-600 text-xs text-center py-6">
                you're all caught up
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
