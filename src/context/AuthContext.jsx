import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

async function showBrowserNotification(message) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;

  // Android Chrome doesn't support new Notification() — always use SW
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (!isMobile && document.visibilityState === "visible") {
    new Notification("FeedBolt", { body: message, icon: "/FeedBolt.jpg" });
    return;
  }

  // Use service worker (required on Android, fallback when page is hidden)
  if (!("serviceWorker" in navigator)) return;
  const sw = await navigator.serviceWorker.ready;
  sw?.active?.postMessage({
    type: "SHOW_NOTIFICATION",
    title: "FeedBolt",
    body: message,
    url: "/notifications",
  });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const channelRef = useRef(null);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, fullname, username, avatar_url")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Request notification permission once logged in
  useEffect(() => {
    if (
      session &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [session]);

  // Global realtime subscription — always alive
  useEffect(() => {
    const user = session?.user;
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial count
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count: c }) => setUnreadCount(c ?? 0));

    // Subscribe to changes
    const channel = supabase
      .channel(`global-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          showBrowserNotification(payload.new?.message ?? "New notification");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false)
            .then(({ count: c }) => setUnreadCount(c ?? 0));
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [session]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        unreadCount,
        setUnreadCount,
        profile,
        setProfile,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
