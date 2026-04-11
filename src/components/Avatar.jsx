import { User } from "lucide-react";

export default function Avatar({ src, size = 40, className = "" }) {
  const style = { width: size, height: size, minWidth: size };
  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        className={`rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-[#1a1a2e] flex items-center justify-center ${className}`}
      style={style}
    >
      <User size={size * 0.45} color="#a855f7" />
    </div>
  );
}
