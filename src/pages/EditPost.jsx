import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function EditPostPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { state } = useLocation();
  const [content, setContent] = useState(state?.content ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("posts")
      .update({ content: content.trim() })
      .eq("id", postId);
    if (error) {
      alert(error.message);
      setSaving(false);
    } else {
      navigate(-1);
    }
  };

  const canSave = content.trim().length > 0 && !saving;

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
        <h2 className="text-white font-semibold text-base">Edit Post</h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition-colors ${
            canSave
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex-1 px-4 pt-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={1200}
          autoFocus
          rows={6}
          className="w-full bg-transparent text-gray-200 text-base leading-6 resize-none outline-none placeholder-gray-600"
        />
        <p
          className={`text-xs text-right mt-2 ${content.length > 1100 ? "text-red-400" : "text-gray-600"}`}
        >
          {1200 - content.length}
        </p>
      </div>
    </div>
  );
}
