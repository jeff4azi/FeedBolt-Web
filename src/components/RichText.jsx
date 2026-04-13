const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function RichText({ text, className }) {
  const parts = text.split(URL_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
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
        ) : (
          part
        ),
      )}
    </p>
  );
}
