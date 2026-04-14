import { useNavigate } from "react-router-dom";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const PHONE_REGEX = /(\+?[\d][\d\s\-\.]{5,18}[\d])/g;
const HASHTAG_REGEX = /(#\w+)/g;

function HashtagLink({ tag }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/search?q=${encodeURIComponent(tag)}`);
      }}
      className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
    >
      {tag}
    </button>
  );
}

function renderPart(part, i, hashtags) {
  // URLs
  if (URL_REGEX.test(part)) {
    return (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors break-all"
      >
        {part}
      </a>
    );
  }

  // Split remaining text by phone numbers first, then hashtags
  const phoneParts = part.split(PHONE_REGEX);
  return phoneParts.map((p, j) => {
    const digits = p.replace(/\D/g, "");
    if (PHONE_REGEX.test(p) && digits.length >= 7 && digits.length <= 15) {
      return (
        <a
          key={`${i}-${j}`}
          href={`tel:${digits}`}
          onClick={(e) => e.stopPropagation()}
          className="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors"
        >
          {p}
        </a>
      );
    }

    // Hashtags — only if enabled
    if (hashtags) {
      const hashParts = p.split(HASHTAG_REGEX);
      return hashParts.map((h, k) =>
        HASHTAG_REGEX.test(h) ? (
          <HashtagLink key={`${i}-${j}-${k}`} tag={h} />
        ) : (
          h
        ),
      );
    }

    return p;
  });
}

export default function RichText({ text, className, hashtags = false }) {
  if (!text) return <p className={className} />;
  URL_REGEX.lastIndex = 0;
  HASHTAG_REGEX.lastIndex = 0;
  const parts = text.split(URL_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) => renderPart(part, i, hashtags))}
    </p>
  );
}
