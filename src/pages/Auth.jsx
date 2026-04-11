import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function GoogleIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-between px-8 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ backgroundColor: "#7c3aed", filter: "blur(60px)" }}
      />

      <div />

      {/* Brand */}
      <div className="flex flex-col items-center z-10">
        <div className="bg-[#16161E] p-6 rounded-[32px] mb-8 border border-gray-800/50 shadow-2xl">
          <img
            src="/src/assets/feedbolt.jpg"
            alt="FeedBolt"
            className="w-20 h-20 rounded-2xl object-contain"
          />
        </div>
        <h1 className="text-white text-5xl font-bold tracking-tighter">
          FeedBolt
        </h1>
        <p className="text-gray-400 text-lg mt-3 text-center font-medium">
          Your feed, supercharged.
        </p>
      </div>

      {/* Sign in */}
      <div className="w-full max-w-sm z-10">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
        <p className="text-gray-600 text-xs text-center mt-4">
          By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
