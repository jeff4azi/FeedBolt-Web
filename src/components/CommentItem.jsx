import Avatar from "./Avatar";

export default function CommentItem({ comment }) {
  const profile = comment.profiles;
  const username = profile?.username ?? profile?.fullname ?? "Unknown";
  const timestamp = new Date(comment.created_at).toLocaleDateString();

  return (
    <div className="flex mb-4">
      <Avatar src={profile?.avatar_url} size={32} className="mt-0.5 shrink-0" />
      <div className="ml-3 flex-1 bg-[#1a1a24] rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-semibold text-xs">{username}</span>
          <span className="text-gray-600 text-xs">{timestamp}</span>
        </div>
        <p className="text-gray-300 text-sm leading-5">{comment.content}</p>
      </div>
    </div>
  );
}
