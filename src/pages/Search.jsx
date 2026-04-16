import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, Users, Hash, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import { PostCardSkeleton } from "../components/Skeleton";
import { trackEvent } from "../lib/analytics";

// ── Trending hashtag pill ──────────────────────────────────────────────────
function TrendingTag({ tag, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 transition-colors rounded-xl group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-purple-600/15 flex items-center justify-center shrink-0">
          <Hash size={15} color="#a855f7" />
        </div>
        <div className="text-left">
          <p className="text-white text-sm font-medium">{tag}</p>
          <p className="text-gray-500 text-xs">{count} posts</p>
        </div>
      </div>
      <TrendingUp
        size={14}
        color="#6b7280"
        className="group-hover:text-purple-400 transition-colors"
      />
    </button>
  );
}

// ── User result row ────────────────────────────────────────────────────────
function UserRow({ profile, currentUserId, onNavigate }) {
  const username = profile.username ?? profile.fullname ?? "Unknown";
  const isMe = profile.id === currentUserId;
  return (
    <button
      onClick={() => onNavigate(isMe ? "/profile" : `/user/${profile.id}`)}
      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors rounded-xl"
    >
      <Avatar src={profile.avatar_url} size={40} />
      <div className="text-left min-w-0">
        <p className="text-white text-sm font-semibold truncate">{username}</p>
        {profile.fullname && profile.username && (
          <p className="text-gray-500 text-xs truncate">{profile.fullname}</p>
        )}
      </div>
      {isMe && (
        <span className="ml-auto text-xs text-purple-400 font-medium shrink-0">
          You
        </span>
      )}
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-5 pb-2">
      <Icon size={14} color="#a855f7" />
      <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });
  const [tab, setTab] = useState("top"); // top | people | posts
  const [loading, setLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [results, setResults] = useState({ users: [], posts: [] });
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Fetch trending / suggested on mount ──────────────────────────────────
  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase.rpc("get_trending_hashtags");
      if (data)
        setTrendingTags(
          data.map(({ hashtag, usage_count }) => ({
            tag: hashtag,
            count: usage_count,
          })),
        );
    };

    // Suggested users: highest follower count excluding self
    const fetchSuggested = async () => {
      const { data } = await supabase.rpc("get_suggested_users", {
        p_user_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
      });
      if (data) setSuggestedUsers(data);
    };

    fetchTrending();
    fetchSuggested();
  }, [user]);

  // ── Debounced search ──────────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    const term = q.trim();

    const [usersRes, postsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, fullname, username, avatar_url")
        .or(`username.ilike.%${term}%,fullname.ilike.%${term}%`)
        .limit(10),
      supabase
        .from("posts")
        .select(
          "*, profiles(id, fullname, username, avatar_url), comments(count)",
        )
        .ilike("content", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setResults({
      users: usersRes.data ?? [],
      posts: postsRes.data ?? [],
    });
    trackEvent("Search", "query", term);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ users: [], posts: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const handleTagClick = (tag) => {
    setQuery(`${tag}`);
    setTab("posts");
    inputRef.current?.focus();
  };

  const isSearching = query.trim().length > 0;

  // ── Tabs for search results ───────────────────────────────────────────────
  const tabs = [
    { id: "top", label: "Top" },
    { id: "people", label: "People" },
    { id: "posts", label: "Posts" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3 bg-[#121218] border border-gray-800 rounded-2xl px-4 py-2.5 focus-within:border-purple-700 transition-colors">
          <Search size={16} color="#6b7280" className="shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, people, topics..."
            className="flex-1 bg-transparent text-gray-200 text-sm outline-none placeholder-gray-600"
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")} className="shrink-0">
              <X size={15} color="#6b7280" />
            </button>
          )}
        </div>

        {/* Tabs — only shown when searching */}
        {isSearching && (
          <div className="flex gap-1 mt-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Discovery (no query) ── */}
      {!isSearching && (
        <div className="pb-8">
          {/* Trending Now */}
          {trendingTags.length > 0 && (
            <>
              <SectionHeader icon={TrendingUp} label="Trending Now" />
              <div className="px-2">
                {trendingTags.map(({ tag, count }) => (
                  <TrendingTag
                    key={tag}
                    tag={tag}
                    count={count}
                    onClick={() => handleTagClick(tag)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Suggested People */}
          {suggestedUsers.length > 0 && (
            <>
              <SectionHeader icon={Users} label="People to Follow" />
              <div className="px-2">
                {suggestedUsers.map((p) => (
                  <UserRow
                    key={p.id}
                    profile={p}
                    currentUserId={user?.id}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty state when no hashtags found */}
          {trendingTags.length === 0 && suggestedUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-full bg-[#121218] flex items-center justify-center">
                <Search size={24} color="#4b5563" />
              </div>
              <p className="text-gray-500 text-sm">
                Search for posts or people
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Search results ── */}
      {isSearching && (
        <div className="pb-8">
          {loading ? (
            <div className="px-4 pt-4">
              {[1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* TOP tab */}
              {tab === "top" && (
                <>
                  {results.users.length === 0 && results.posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <p className="text-gray-500 text-sm">
                        No results for "{query}"
                      </p>
                    </div>
                  ) : (
                    <>
                      {results.users.length > 0 && (
                        <>
                          <SectionHeader icon={Users} label="People" />
                          <div className="px-2">
                            {results.users.slice(0, 3).map((p) => (
                              <UserRow
                                key={p.id}
                                profile={p}
                                currentUserId={user?.id}
                                onNavigate={navigate}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      {results.posts.length > 0 && (
                        <>
                          <SectionHeader icon={Hash} label="Posts" />
                          {results.posts.slice(0, 5).map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              currentUserId={user?.id}
                              onRefresh={() => runSearch(query)}
                            />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {/* PEOPLE tab */}
              {tab === "people" && (
                <>
                  {results.users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-gray-500 text-sm">No people found</p>
                    </div>
                  ) : (
                    <div className="px-2 pt-2">
                      {results.users.map((p) => (
                        <UserRow
                          key={p.id}
                          profile={p}
                          currentUserId={user?.id}
                          onNavigate={navigate}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* POSTS tab */}
              {tab === "posts" && (
                <>
                  {results.posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-gray-500 text-sm">No posts found</p>
                    </div>
                  ) : (
                    <div className="pt-2">
                      {results.posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={user?.id}
                          onRefresh={() => runSearch(query)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
