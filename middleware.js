const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = "https://feedbolt-beige.vercel.app";

const BOT_REGEX =
  /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|iframely|embedly|preview/i;

function escapeHtml(str) {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function fetchPost(postId) {
  const url = `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}&select=content,image_url,profiles(fullname,username)&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ?? null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/post\/([a-f0-9-]{36})$/i);
  if (!match) return;

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!BOT_REGEX.test(userAgent)) return;

  const postId = match[1];
  const post = await fetchPost(postId);

  const profile = post?.profiles;
  const author = profile?.username ?? profile?.fullname ?? "FeedBolt";
  const caption = post?.content
    ? post.content.slice(0, 200) + (post.content.length > 200 ? "…" : "")
    : "Check out this post on FeedBolt";
  const image = post?.image_url ?? `${SITE_URL}/FeedBolt.jpg`;
  const title = `${escapeHtml(author)} on FeedBolt`;
  const description = escapeHtml(caption);
  const postUrl = `${SITE_URL}/post/${postId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="FeedBolt" />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta http-equiv="refresh" content="0;url=${postUrl}" />
  </head>
  <body><p>Redirecting to <a href="${postUrl}">${title}</a>…</p></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = { matcher: "/post/:id*" };
