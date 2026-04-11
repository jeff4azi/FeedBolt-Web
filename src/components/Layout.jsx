import { NavLink, Outlet } from "react-router-dom";
import { Home, User } from "lucide-react";

export default function Layout() {
  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-6 py-2 text-xs font-medium transition-colors ${
      isActive ? "text-purple-400" : "text-gray-500 hover:text-gray-300"
    }`;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#121218] border-t border-[#1f1f2e] flex justify-around z-30 h-16">
        <NavLink to="/feed" className={tabClass}>
          <Home size={22} />
          Feed
        </NavLink>
        <NavLink to="/profile" className={tabClass}>
          <User size={22} />
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
