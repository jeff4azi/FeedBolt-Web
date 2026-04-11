import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Avatar from "../components/Avatar";

function Field({ label, inputClassName = "", ...props }) {
  return (
    <div>
      <label className="text-gray-500 text-xs mb-1.5 uppercase tracking-wider block">
        {label}
      </label>
      <input
        className={`w-full bg-[#121218] text-gray-200 rounded-xl px-4 py-3 text-sm border border-gray-800 outline-none focus:border-purple-700 transition-colors placeholder-gray-600 ${inputClassName}`}
        {...props}
      />
    </div>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.fullname ?? "");
          setUsername(data.username ?? "");
          setBio(data.bio ?? "");
          setAvatar(data.avatar_url ?? user?.user_metadata?.avatar_url ?? null);
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          fullname: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
        })
        .eq("id", user.id);
      if (error) throw error;
      navigate(-1);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold text-base">Edit Profile</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`font-semibold text-sm transition-colors ${saving ? "text-gray-600" : "text-purple-400 hover:text-purple-300"}`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar */}
        <div className="flex justify-center py-6">
          <Avatar
            src={avatar}
            size={96}
            className="border-2 border-purple-600"
          />
        </div>

        <div className="px-4 flex flex-col gap-5 pb-8">
          <Field
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <Field
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            autoCapitalize="none"
          />
          <div>
            <label className="text-gray-500 text-xs mb-1.5 uppercase tracking-wider block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              maxLength={160}
              rows={4}
              className="w-full bg-[#121218] text-gray-200 rounded-xl px-4 py-3 text-sm border border-gray-800 outline-none focus:border-purple-700 transition-colors placeholder-gray-600 resize-none"
            />
            <p className="text-gray-600 text-xs text-right -mt-1">
              {bio.length}/160
            </p>
          </div>

          <div>
            <label className="text-gray-500 text-xs mb-1.5 uppercase tracking-wider block">
              Email
            </label>
            <div className="bg-[#1a1a2e] rounded-xl px-4 py-3">
              <p className="text-gray-500 text-sm">{user?.email ?? "—"}</p>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              Email cannot be changed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
