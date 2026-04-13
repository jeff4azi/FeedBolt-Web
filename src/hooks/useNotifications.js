import { useAuth } from "../context/AuthContext";

export function useUnreadCount() {
  const { unreadCount } = useAuth();
  return unreadCount;
}
