import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, User, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const avatar = user?.user_metadata?.avatar_url;

  const navItem = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-purple-600/15 text-purple-400"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-60 border-r border-gray-800/60 px-4 py-6 z-30">
        {/* Logo */}
        <div className="px-4 mb-8">
          <span className="text-white text-xl font-bold">
            Feed<span className="text-purple-400">Bolt</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/feed" className={navItem}>
            <Home size={19} />
            Feed
          </NavLink>
          <NavLink to="/profile" className={navItem}>
            <User size={19} />
            Profile
          </NavLink>
        </nav>

        {/* New post button */}
        <button
          onClick={() => navigate("/create-post")}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors mt-4"
        >
          <Plus size={18} />
          New Post
        </button>

        {/* User pill */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 mt-4 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          <Avatar src={avatar} size={34} />
          <div className="text-left min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {user?.user_metadata?.full_name ?? user?.email ?? "You"}
            </p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </button>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <div className="flex-1 pb-16 lg:pb-0">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#121218]/95 backdrop-blur-sm border-t border-[#1f1f2e] flex justify-around z-30 h-16">
        <NavLink
          to="/feed"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium transition-colors ${
              isActive ? "text-purple-400" : "text-gray-500"
            }`
          }
        >
          <Home size={22} />
          Feed
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium transition-colors ${
              isActive ? "text-purple-400" : "text-gray-500"
            }`
          }
        >
          <User size={22} />
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
