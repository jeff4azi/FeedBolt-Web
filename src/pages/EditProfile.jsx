import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadAvatarFile, deleteAvatarImage } from "../lib/imageUtils";
import Avatar from "../components/Avatar";
import { trackEvent } from "../lib/analytics";
import AlertDialog from "../components/AlertDialog";
import { useAlert } from "../hooks/useAlert";

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
  const { user, setProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickedFile, setPickedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [hasExistingAvatar, setHasExistingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const { alert, state: alertState, handleClose } = useAlert();

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
          setHasExistingAvatar(!!data.avatar_public_id);
        }
      });
  }, [user]);

  const handlePickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      await alert("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      let newAvatarUrl = avatar;
      let newAvatarPublicId = undefined;
      if (pickedFile) {
        if (hasExistingAvatar) {
          await deleteAvatarImage(user.id).catch(() => {}); // non-fatal
        }
        const uploaded = await uploadAvatarFile(pickedFile, user.id);
        newAvatarUrl = uploaded.image_url;
        newAvatarPublicId = uploaded.image_public_id;
      }
      const updatePayload = {
        fullname: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: newAvatarUrl,
        ...(newAvatarPublicId !== undefined && {
          avatar_public_id: newAvatarPublicId,
        }),
      };
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);
      if (error) throw error;
      setProfile({
        fullname: displayName.trim(),
        username: username.trim(),
        avatar_url: newAvatarUrl,
      });
      trackEvent("Profile", "update", pickedFile ? "with_avatar" : "info_only");
      navigate(-1);
    } catch (err) {
      await alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
      {alertState && (
        <AlertDialog message={alertState.message} onClose={handleClose} />
      )}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickAvatar}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative"
          >
            <Avatar
              src={previewUrl ?? avatar}
              size={96}
              className="border-2 border-purple-600"
            />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Camera size={22} className="text-white" />
            </div>
          </button>
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
