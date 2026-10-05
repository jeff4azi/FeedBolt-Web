import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Heart,
  MessageCircle,
  Download,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  X,
  BarChart2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getOptimizedImageUrl, getPlaceholderUrl } from "../lib/imageUtils";
import { getPdfUrl, getPdfTitle } from "../lib/pdfUtils";
import { timeAgo, formatCount } from "../lib/timeAgo";
import Avatar from "../components/Avatar";
import ProgressiveImage from "../components/ProgressiveImage";
import { SkeletonBox } from "../components/Skeleton";

const PAGE_SIZE = 18;

// ── Skeleton card ────────────────────────────────────────────────────────────
function ArchiveCardSkeleton() {
  return (
    <div className="bg-[#121218] rounded-2xl overflow-hidden border border-gray-800/40 flex flex-col">
      <SkeletonBox className="w-full aspect-3/4 rounded-none" />
      <div className="p-3 flex flex-col gap-2">
        <SkeletonBox className="w-3/4 h-3" />
        <SkeletonBox className="w-1/2 h-2.5" />
        <div className="flex gap-3 mt-1">
          <SkeletonBox className="w-8 h-2.5" />
          <SkeletonBox className="w-8 h-2.5" />
        </div>
      </div>
    </div>
  );
}

// ── Book card ────────────────────────────────────────────────────────────────
function ArchiveCard({ post, currentUserId }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // The RPC returns profiles as jsonb; the table query returns it as an object.
  // Both shapes end up the same after PostgREST parsing.
  const profile = post.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";

  const previewUrl = post.image_url
    ? getOptimizedImageUrl(post.image_url, { width: "w_400" })
    : null;
  const placeholderUrl = post.image_url
    ? getPlaceholderUrl(post.image_url)
    : null;
  const pdfUrl = getPdfUrl(post.image_url);
  const title = post.title || getPdfTitle(post.image_url);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

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
    supabase
      .from("post_impressions")
      .select("times_seen")
      .eq("post_id", post.id)
      .then(({ data }) => {
        const total = (data ?? []).reduce(
          (sum, r) => sum + (r.times_seen ?? 0),
          0,
        );
        setViewCount(total);
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

  const handleCardClick = () => {
    sessionStorage.setItem("archives-scroll", window.scrollY);
    navigate("/pdf/" + post.id);
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!profile?.id) return;
    if (profile.id === currentUserId) navigate("/profile");
    else navigate("/user/" + profile.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-[#121218] rounded-2xl overflow-hidden border border-gray-800/40 cursor-pointer flex flex-col transition-all duration-300 hover:border-purple-700/50 hover:shadow-[0_8px_32px_rgba(168,85,247,0.13)] hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative w-full aspect-3/4 bg-linear-to-br from-[#1a1030] via-[#130e28] to-[#0B0B0F] overflow-hidden shrink-0">
        {previewUrl ? (
          <ProgressiveImage
            src={previewUrl}
            placeholderSrc={placeholderUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-linear-to-b from-purple-800/40 via-purple-600/30 to-purple-900/40 rounded-l-2xl" />
            <FileText
              size={36}
              color="#a855f7"
              strokeWidth={1.2}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#121218] via-transparent to-transparent opacity-80" />

        {/* PDF badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#0B0B0F]/75 backdrop-blur-sm border border-purple-700/40 rounded-md px-1.5 py-0.5">
          <FileText size={10} color="#c084fc" />
          <span className="text-purple-300 text-[9px] font-bold uppercase tracking-wider">
            PDF
          </span>
        </div>

        {/* Download on hover */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-[#0B0B0F]/80 backdrop-blur-sm border border-gray-700/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:border-purple-600"
            title="Download PDF"
          >
            <Download size={13} color="#a855f7" />
          </a>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-white text-xs font-semibold leading-4 line-clamp-2 mb-1 group-hover:text-purple-300 transition-colors duration-200">
          {title}
        </p>
        <button
          onClick={handleAvatarClick}
          className="flex items-center gap-1.5 mb-2 mt-0.5 min-w-0"
        >
          <Avatar src={profile?.avatar_url} size={16} />
          <span className="text-gray-500 text-[10px] truncate hover:text-gray-300 transition-colors">
            {username}
          </span>
        </button>

        <div className="flex items-center gap-3.5 mt-auto pt-2 border-t border-gray-800/60">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 transition-transform active:scale-90"
          >
            <Heart
              size={13}
              fill={liked ? "#a855f7" : "none"}
              color={liked ? "#a855f7" : "#6b7280"}
              className="transition-colors duration-150"
            />
            <span className="text-gray-500 text-[10px]">{likeCount}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/pdf/" + post.id);
            }}
            className="flex items-center gap-1 transition-transform active:scale-90"
          >
            <MessageCircle size={12} color="#6b7280" />
            <span className="text-gray-500 text-[10px]">{commentCount}</span>
          </button>
          <div className="flex items-center gap-1">
            <BarChart2 size={12} color="#4b5563" />
            <span className="text-gray-600 text-[10px]">
              {formatCount(viewCount)}
            </span>
          </div>
          <span className="text-gray-700 text-[10px] ml-auto">
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Sort pill ────────────────────────────────────────────────────────────────
function SortPill({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? "bg-purple-600/20 text-purple-300 border border-purple-700/60"
          : "bg-[#121218] text-gray-500 border border-gray-800/60 hover:text-gray-300 hover:border-gray-700"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

// ── Archives page ────────────────────────────────────────────────────────────
export default function ArchivesPage() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [sort, setSort] = useState("recent");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Generation counter — incremented on every new sort/search so stale
  // in-flight fetches are silently discarded when they resolve.
  const genRef = useRef(0);
  // For "recent": tracks the DB offset for pagination.
  // For "popular": tracks how many RPC rows we've consumed (RPC is already sorted).
  const offsetRef = useRef(0);
  const sentinelRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 380);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  // "recent" — plain table query ordered by created_at
  const fetchRecent = (from, search) =>
    supabase
      .from("posts")
      .select(
        "id, title, content, image_url, image_public_id, user_id, created_at, profiles(id, fullname, username, avatar_url)",
      )
      .eq("is_pdf", true)
      .ilike("title", search.trim() ? `%${search.trim()}%` : "%")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

  // "popular" — get_scored_posts RPC with filter_pdf=true so Supabase handles
  // all PDF filtering server-side. Title search is still client-side since
  // the RPC has no search param; we over-fetch when searching to compensate.
  const fetchPopular = (from, search) =>
    supabase
      .rpc("get_scored_posts", {
        from_offset: from,
        page_size: search.trim() ? PAGE_SIZE * 4 : PAGE_SIZE,
        current_user_id: user?.id ?? null,
        filter_pdf: true,
      })
      .then(({ data, error }) => {
        if (error || !data) return { data: [], error };
        const result = search.trim()
          ? data.filter((p) =>
              (p.title ?? "")
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
            )
          : data;
        return { data: result.slice(0, PAGE_SIZE), error: null };
      });

  // ── Shared append helper ───────────────────────────────────────────────────
  const appendPosts = (incoming) => {
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const fresh = incoming.filter((p) => !existingIds.has(p.id));
      offsetRef.current = prev.length + fresh.length;
      return [...prev, ...fresh];
    });
  };

  // ── Initial / re-fetch when sort or search changes ────────────────────────
  useEffect(() => {
    const gen = ++genRef.current;
    offsetRef.current = 0;
    setPosts([]);
    setExhausted(false);
    setLoading(true);

    const fetch =
      sort === "popular"
        ? fetchPopular(0, debouncedQuery)
        : fetchRecent(0, debouncedQuery);

    fetch.then(({ data, error }) => {
      if (genRef.current !== gen) return; // stale — discard
      if (!error) {
        const result = data ?? [];
        setPosts(result);
        offsetRef.current = result.length;
        setExhausted(result.length < PAGE_SIZE);
      }
      setLoading(false);
    });
  }, [sort, debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll position
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem("archives-scroll");
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
        sessionStorage.removeItem("archives-scroll");
      }
    }
  }, [loading]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const fetchMore = async () => {
    if (loadingMore || exhausted || loading) return;
    const gen = genRef.current;
    setLoadingMore(true);

    const fetch =
      sort === "popular"
        ? fetchPopular(offsetRef.current, debouncedQuery)
        : fetchRecent(offsetRef.current, debouncedQuery);

    fetch.then(({ data, error }) => {
      if (genRef.current !== gen) {
        setLoadingMore(false);
        return;
      }
      if (!error && data && data.length > 0) {
        appendPosts(data);
        setExhausted(data.length < PAGE_SIZE);
      } else {
        setExhausted(true);
      }
      setLoadingMore(false);
    });
  };

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore, exhausted, loading, sort, debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSearch = () => {
    setShowSearch((v) => {
      if (!v) setTimeout(() => searchInputRef.current?.focus(), 80);
      return !v;
    });
    if (showSearch) setQuery("");
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600/15 border border-purple-700/40 rounded-lg flex items-center justify-center">
              <BookOpen size={16} color="#a855f7" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">
                Archives
              </h1>
              <p className="text-gray-600 text-[10px] mt-0.5">PDF Documents</p>
            </div>
          </div>

          <button
            onClick={toggleSearch}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
              showSearch
                ? "bg-purple-600/15 border-purple-700/40 text-purple-400"
                : "bg-[#121218] border-gray-800/60 text-gray-500 hover:text-gray-300 hover:border-gray-700"
            }`}
          >
            {showSearch ? <X size={15} /> : <Search size={15} />}
          </button>
        </div>

        {/* Collapsible search */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showSearch ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 sm:px-6 pb-3">
            <div className="relative">
              <Search
                size={14}
                color="#6b7280"
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title…"
                className="w-full bg-[#121218] border border-gray-800 focus:border-purple-700 rounded-xl pl-8 pr-4 py-2 text-gray-200 text-sm placeholder-gray-600 outline-none transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pb-3">
          <SlidersHorizontal size={13} color="#6b7280" className="shrink-0" />
          <div className="flex gap-2">
            <SortPill
              active={sort === "recent"}
              onClick={() => setSort("recent")}
              icon={Clock}
              label="Most Recent"
            />
            <SortPill
              active={sort === "popular"}
              onClick={() => setSort("popular")}
              icon={TrendingUp}
              label="Most Viewed"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 pb-8 pt-4">
        {debouncedQuery && !loading && (
          <p className="text-gray-500 text-xs mb-4">
            {posts.length === 0
              ? `No results for "${debouncedQuery}"`
              : `${posts.length}${exhausted ? "" : "+"} result${
                  posts.length !== 1 ? "s" : ""
                } for "${debouncedQuery}"`}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ArchiveCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-[#121218] border border-gray-800 rounded-2xl flex items-center justify-center">
              <BookOpen size={28} color="#374151" />
            </div>
            <div className="text-center">
              <p className="text-gray-400 font-medium text-sm">
                {debouncedQuery ? "No documents found" : "No archives yet"}
              </p>
              <p className="text-gray-600 text-xs mt-1">
                {debouncedQuery
                  ? "Try a different search term"
                  : "PDF posts will appear here"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {posts.map((post) => (
              <ArchiveCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="pb-2">
          {loadingMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArchiveCardSkeleton key={i} />
              ))}
            </div>
          )}
          {exhausted && posts.length > 0 && !loadingMore && (
            <p className="text-gray-700 text-xs text-center py-8">
              — end of archives —
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
