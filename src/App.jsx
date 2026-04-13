import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import AuthPage from "./pages/Auth";
import FeedPage from "./pages/Feed";
import ProfilePage from "./pages/Profile";
import PostDetailPage from "./pages/PostDetail";
import CreatePostPage from "./pages/CreatePost";
import UserProfilePage from "./pages/UserProfile";
import EditProfilePage from "./pages/EditProfile";
import EditPostPage from "./pages/EditPost";
import SearchPage from "./pages/Search";
import NotificationsPage from "./pages/Notifications";
import { trackPageView } from "./lib/analytics";

function RootNavigator() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Track page views on every route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  // Request browser notification permission once user is logged in
  useEffect(() => {
    if (
      session &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [session]);

  useEffect(() => {
    if (loading) return;
    const inAuth = location.pathname === "/auth";
    if (!session && !inAuth) navigate("/auth", { replace: true });
    else if (session && inAuth) navigate("/feed", { replace: true });
  }, [session, loading, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="/post/:postId" element={<PostDetailPage />} />
      <Route path="/create-post" element={<CreatePostPage />} />
      <Route path="/user/:userId" element={<UserProfilePage />} />
      <Route path="/edit-profile" element={<EditProfilePage />} />
      <Route path="/edit-post/:postId" element={<EditPostPage />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </BrowserRouter>
  );
}
