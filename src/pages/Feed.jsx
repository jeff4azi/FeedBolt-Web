import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";
import InstallPrompt from "../components/InstallPrompt";

const PAGE_SIZE = 50;

// Module-level cache — survives remounts/navigation, resets on full page reload
let postsCache = null;
let exhaustedCache = false;

export default function FeedPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [posts, setPosts] = useState(() => postsCache ?? []);
  const [loading, setLoading] = useState(postsCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(exhaustedCache);

  const sentinelRef = useRef(null);
  const postsLengthRef = useRef(postsCache?.length ?? 0);
  const restoredRef = useRef(false);

  // ─── Fetch from offset 0, write to cache ───────────────────────────────────
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_scored_posts", {
      from_offset: 0,
      page_size: PAGE_SIZE,
      current_user_id: user?.id ?? null,
    });
    if (!error) {
      const result = data ?? [];
      postsCache = result;
      exhaustedCache = result.length < PAGE_SIZE;
      setPosts(result);
      postsLengthRef.current = result.length;
      setExhausted(exhaustedCache);
    }
    setLoading(false);
  }, [user?.id]);

  // ─── Mount: use cache if available, otherwise fetch ────────────────────────
  useEffect(() => {
    if (postsCache !== null) {
      // Already have data — nothing to do, state was initialised from cache
      setLoading(false);
      return;
    }
    fetchPosts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restore scroll after posts appear ─────────────────────────────────────
  useEffect(() => {
    if (!loading && !restoredRef.current) {
      restoredRef.current = true;
      const saved = sessionStorage.getItem("feed-scroll");
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
        sessionStorage.removeItem("feed-scroll");
      }
    }
  }, [loading]);

  // ─── Infinite scroll ────────────────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    const from = postsLengthRef.current;
    const { data, error } = await supabase.rpc("get_scored_posts", {
      from_offset: from,
      page_size: PAGE_SIZE,
      current_user_id: user?.id ?? null,
    });
    if (!error && data) {
      const next = [...(postsCache ?? []), ...data];
      postsCache = next;
      exhaustedCache = data.length < PAGE_SIZE;
      setPosts(next);
      postsLengthRef.current = from + data.length;
      setExhausted(exhaustedCache);
    }
    setLoadingMore(false);
  }, [loadingMore, exhausted, user?.id]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchMore]);

  // ─── Manual refresh — only way to get fresh data ───────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    postsCache = null;
    exhaustedCache = false;
    postsLengthRef.current = 0;
    setExhausted(false);
    await fetchPosts();
    setRefreshing(false);
  };

  // ─── Optimistic post update (likes, bookmarks, etc.) ───────────────────────
  // Call this instead of a full refetch when a single post changes
  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === updatedPost.id ? updatedPost : p));
      postsCache = next;
      return next;
    });
  }, []);

  const avatar = profile?.avatar_url ?? user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <h1 className="text-white text-2xl font-bold lg:text-lg lg:font-semibold">
          Feed<span className="text-purple-400 lg:hidden">Bolt</span>
          <span className="hidden lg:inline text-white"> — Latest</span>
        </h1>

        {/* Mobile actions */}
        <div className="flex items-center gap-3 lg:hidden">
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

        {/* Desktop refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="hidden lg:block text-gray-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin text-purple-400" : ""}
          />
        </button>
      </div>

      {/* Mobile sub-header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between lg:hidden">
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

      {/* ── Content ── */}
      <InstallPrompt />

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
              onUpdate={handlePostUpdate} // optimistic single-post update
              onRefresh={handleRefresh} // escape hatch for destructive actions (delete, etc.)
            />
          ))}

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
