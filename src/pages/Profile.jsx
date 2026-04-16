import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { PostCardSkeleton, ProfileSkeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [
      { data: profileData },
      { data: postsData },
      { count: followers },
      { count: followingC },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("posts")
        .select(
          "*, profiles(id, fullname, username, avatar_url), comments(count)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id),
    ]);
    if (profileData) setProfile(profileData);
    if (postsData) setPosts(postsData);
    setFollowerCount(followers ?? 0);
    setFollowingCount(followingC ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [fetchData]);

  const handleSignOut = async () => {
    const ok = await confirm("Are you sure you want to sign out?");
    if (!ok) return;
    try {
      await signOut();
      navigate("/auth");
    } catch (err) {
      alert(err.message);
    }
  };

  const displayName =
    profile?.fullname ??
    user?.user_metadata?.full_name ??
    user?.email ??
    "User";
  const username = profile?.username ?? user?.user_metadata?.full_name ?? "";
  const avatar = profile?.avatar_url ?? user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto">
      {state && (
        <ConfirmDialog
          message={state.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <h2 className="text-white text-lg font-semibold">Profile</h2>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </div>

      {/* Profile info */}
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="flex flex-col items-center px-4 py-6">
          <Avatar
            src={avatar}
            size={96}
            className="border-2 border-purple-600"
          />
          <h3 className="text-white text-xl font-bold mt-4">{displayName}</h3>
          {username && (
            <p className="text-purple-400 text-sm mt-1">@{username}</p>
          )}
          {user?.email && (
            <p className="text-gray-500 text-xs mt-1">{user.email}</p>
          )}
          {profile?.bio && (
            <p className="text-gray-400 text-sm text-center mt-3 leading-5 px-4">
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

          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-5 px-8 py-2.5 border border-gray-700 rounded-full text-gray-300 text-sm font-medium hover:border-gray-500 transition-colors flex items-center gap-2"
          >
            <Pencil size={14} /> Edit Profile
          </button>
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
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onRefresh={fetchData}
            showOwnerActions
          />
        ))
      )}
    </div>
  );
}
