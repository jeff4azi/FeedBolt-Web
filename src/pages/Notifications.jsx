import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  ArrowLeft,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { timeAgo } from "../lib/timeAgo";

const TYPE_META = {
  like_milestone: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  comment: {
    icon: MessageCircle,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  reply: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  follow: { icon: UserPlus, color: "text-green-400", bg: "bg-green-500/10" },
  warning: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
  new_post: {
    icon: FileText,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
};

function NotifRow({ notif, onClick }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.comment;
  const Icon = meta.icon;
  const timeStr = timeAgo(notif.created_at);

  return (
    <button
      onClick={() => onClick(notif)}
      className={`flex items-start gap-3 w-full px-4 py-3.5 hover:bg-white/5 transition-colors text-left ${
        !notif.read ? "bg-purple-600/5 border-l-2 border-purple-600" : ""
      }`}
    >
      {/* Icon badge */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}
      >
        <Icon size={16} className={meta.color} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-5 ${notif.read ? "text-gray-400" : "text-white"}`}
        >
          {notif.message}
        </p>
        <p className="text-gray-600 text-xs mt-0.5">{timeStr}</p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
      )}
    </button>
  );
}

export default function NotificationsPage() {
  const { user, setUnreadCount } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchNotifs();
  }, [fetchNotifs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => setNotifs((prev) => [payload.new, ...prev]),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleClick = async (notif) => {
    if (!notif.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notif.post_id) navigate(`/post/${notif.post_id}`);
    else if (notif.type === "follow" && notif.actor_id)
      navigate(`/user/${notif.actor_id}`);
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0B0F]/95 backdrop-blur-sm flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="lg:hidden text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-white text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-gray-500 hover:text-purple-400 text-xs transition-colors"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col gap-1 px-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 animate-pulse"
              >
                <div className="w-9 h-9 rounded-full bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-full bg-[#121218] flex items-center justify-center">
              <Bell size={24} color="#4b5563" />
            </div>
            <p className="text-gray-500 text-sm">No notifications yet</p>
            <p className="text-gray-600 text-xs">
              We'll let you know when something happens
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {notifs.map((n) => (
              <NotifRow key={n.id} notif={n} onClick={handleClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
