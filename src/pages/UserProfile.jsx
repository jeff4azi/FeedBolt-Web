import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { PostCardSkeleton, ProfileSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";
import { handleFollowNotification } from "../lib/notifications";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchData = useCallback(async () => {
    const [{ data: profileData }, { data: postsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("posts")
        .select(
          "*, profiles(id, fullname, username, avatar_url), comments(count)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    if (profileData) setProfile(profileData);
    if (postsData) setPosts(postsData);
    setLoading(false);
  }, [userId]);

  const fetchFollowData = useCallback(async () => {
    if (!user) return;
    const [{ count: followers }, { count: followingC }, { data: isFollowing }] =
      await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
        supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId),
      ]);
    setFollowerCount(followers ?? 0);
    setFollowingCount(followingC ?? 0);
    setFollowing((isFollowing?.length ?? 0) > 0);
  }, [userId, user]);

  useEffect(() => {
    fetchData();
    fetchFollowData();
  }, [fetchData, fetchFollowData]);

  const handleFollow = async () => {
    if (!user) return;
    if (following) {
      setFollowing(false);
      setFollowerCount((c) => c - 1);
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
    } else {
      setFollowing(true);
      setFollowerCount((c) => c + 1);
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });
      handleFollowNotification({
        followedUserId: userId,
        actorId: user.id,
        actorUsername:
          authProfile?.username ??
          authProfile?.fullname ??
          user.user_metadata?.full_name ??
          "Someone",
      });
    }
  };

  const displayName = profile?.fullname ?? "Unknown";
  const username = profile?.username ?? "";

  if (!profile && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center px-4 py-3 border-b border-gray-800/50">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-white text-lg font-semibold">
          {username ? `@${username}` : displayName}
        </h2>
      </div>

      {/* Profile info */}
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="flex flex-col items-center px-4 py-6">
          <Avatar
            src={profile?.avatar_url}
            size={96}
            className="border-2 border-purple-600"
          />
          <h3 className="text-white text-xl font-bold mt-4">{displayName}</h3>
          {username && (
            <p className="text-purple-400 text-sm mt-1">@{username}</p>
          )}
          {profile?.bio && (
            <p className="text-gray-400 text-sm text-center mt-3 leading-5">
              {profile.bio}
            </p>
          )}

          <div className="flex gap-8 mt-6">
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-lg">
                {posts.length}
              </span>
              <span className="text-gray-500 text-xs">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-lg">
                {followerCount}
              </span>
              <span className="text-gray-500 text-xs">Followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-lg">
                {followingCount}
              </span>
              <span className="text-gray-500 text-xs">Following</span>
            </div>
          </div>

          {user?.id !== userId && (
            <button
              onClick={handleFollow}
              className={`mt-5 px-10 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                following
                  ? "border border-gray-600 text-gray-300 hover:border-gray-400"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {following ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>
      )}

      <div className="border-t border-gray-800 mx-4 mb-4" />
      <p className="text-gray-500 text-xs uppercase tracking-widest px-4 mb-3">
        Posts
      </p>

      {loading ? (
        [1, 2].map((i) => <PostCardSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <p className="text-gray-600 text-center mt-8">No posts yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))
      )}
    </div>
  );
}
