import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Avatar from "../components/Avatar";

export default function FollowListPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { pathname } = useLocation();
  const type = pathname.endsWith("/followers") ? "followers" : "following";
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      let data;
      if (type === "followers") {
        // people who follow userId
        const { data: rows } = await supabase
          .from("follows")
          .select(
            "profiles!follows_follower_id_fkey(id, fullname, username, avatar_url)",
          )
          .eq("following_id", userId);
        data = rows?.map((r) => r.profiles) ?? [];
      } else {
        // people userId is following
        const { data: rows } = await supabase
          .from("follows")
          .select(
            "profiles!follows_following_id_fkey(id, fullname, username, avatar_url)",
          )
          .eq("follower_id", userId);
        data = rows?.map((r) => r.profiles) ?? [];
      }
      setList(data);
      setLoading(false);
    }
    fetch();
  }, [userId, type]);

  const handleUserClick = (id) => {
    if (id === user?.id) navigate("/profile");
    else navigate(`/user/${id}`);
  };

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <div className="max-w-2xl mx-auto min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-white text-lg font-semibold">{title}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-12">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-gray-600 text-center mt-12">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <div className="divide-y divide-gray-800/50">
          {list.map((profile) => {
            const name = profile?.fullname ?? "Unknown";
            const username = profile?.username;
            return (
              <button
                key={profile.id}
                onClick={() => handleUserClick(profile.id)}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <Avatar src={profile?.avatar_url} size={44} />
                <div>
                  <p className="text-white font-semibold text-sm">{name}</p>
                  {username && (
                    <p className="text-purple-400 text-xs">@{username}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
