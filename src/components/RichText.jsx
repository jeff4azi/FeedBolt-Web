const URL_REGEX = /(https?:\/\/[^\s]+)/g;
// Matches phone numbers: optional +, then digits/spaces/dashes/dots, 7–15 digits total
const PHONE_REGEX = /(\+?[\d][\d\s\-\.]{5,18}[\d])/g;

function renderPart(part, i) {
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

  // Split by phone numbers
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
    return p;
  });
}

export default function RichText({ text, className }) {
  if (!text) return <p className={className} />;
  // Reset regex state
  URL_REGEX.lastIndex = 0;
  const parts = text.split(URL_REGEX);

  return (
    <p className={className}>{parts.map((part, i) => renderPart(part, i))}</p>
  );
}
