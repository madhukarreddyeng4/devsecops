// Generates a deterministic, decent-looking book cover from the title +
// author, so the store has real-feeling cover art with zero external image
// assets. Same book always renders the same cover.

const PALETTES = [
  ["#2b3a67", "#496a9c"],
  ["#3e8989", "#2d6868"],
  ["#8a4b3b", "#b3745f"],
  ["#4a3c68", "#6d5b9c"],
  ["#245c45", "#3c8a68"],
  ["#8a5d02", "#c08a1e"],
  ["#7a2e3a", "#a8515f"],
  ["#2f4858", "#4a6b80"],
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function BookCover({ title, author, width = "100%", height = 220 }) {
  const h = hashString(title + author);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const gradId = `g${h % 100000}`;
  const stripeY = 40 + (h % 30);

  // Truncate long titles into up to 3 lines for the cover.
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 16) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);

  return (
    <svg
      viewBox="0 0 160 220"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${title} by ${author}`}
      style={{ display: "block", borderRadius: 4 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="160" height="220" fill={`url(#${gradId})`} />
      <rect x="0" y="0" width="8" height="220" fill="rgba(0,0,0,0.18)" />
      <rect x={16} y={stripeY} width={128} height="2" fill="rgba(255,255,255,0.35)" />
      <rect x={16} y={stripeY + 6} width={90} height="2" fill="rgba(255,255,255,0.22)" />
      {shown.map((ln, i) => (
        <text
          key={i}
          x="80"
          y={110 + i * 20}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="15"
          fontWeight="700"
          fill="#fff"
        >
          {ln}
        </text>
      ))}
      <text
        x="80"
        y="195"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="9"
        fill="rgba(255,255,255,0.85)"
        letterSpacing="0.5"
      >
        {author.toUpperCase()}
      </text>
    </svg>
  );
}
