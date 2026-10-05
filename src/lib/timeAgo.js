export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

// Format a count the way X (Twitter) does: 0–999 as-is, then K/M with 1 decimal
// trimmed if it's a round number. e.g. 82000 → "82K", 2900 → "2.9K", 1200000 → "1.2M"
export function formatCount(n) {
  if (!n || n < 1) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return (Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, "")) + "K";
  }
  const m = n / 1_000_000;
  return (Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, "")) + "M";
}
