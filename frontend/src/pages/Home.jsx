import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import BookCover from "../components/BookCover.jsx";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [genre, setGenre] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listBooks().then(setBooks).finally(() => setLoading(false));
  }, []);

  const genres = useMemo(
    () => ["All", ...Array.from(new Set(books.map((b) => b.genre))).sort()],
    [books]
  );
  const shown = genre === "All" ? books : books.filter((b) => b.genre === genre);

  return (
    <div className="container" style={{ padding: "32px 24px 64px" }}>
      <section
        style={{
          background: "linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dark) 100%)",
          borderRadius: 10,
          padding: "38px 36px",
          color: "white",
          marginBottom: 32,
        }}
      >
        <div className="eyebrow" style={{ color: "#9fb3e8" }}>Staff picks this week</div>
        <h1 style={{ color: "white", fontSize: 30, marginTop: 8, marginBottom: 10 }}>
          Stories worth turning the page for.
        </h1>
        <p style={{ color: "#cfd9f0", maxWidth: 500, margin: 0 }}>
          Free shipping over $35. New arrivals every Thursday, and a 30-day no-fuss return policy.
        </p>
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>Browse the catalog</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={g === genre ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24, color: "var(--ink-faint)" }}>Loading catalog…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 20,
          }}
        >
          {shown.map((b) => (
            <Link key={b.id} to={`/book/${b.id}`} className="card book-card" style={{ padding: 14, textDecoration: "none", color: "inherit" }}>
              <BookCover title={b.title} author={b.author} height={190} />
              <div style={{ fontWeight: 600, marginTop: 12, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>{b.author}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--indigo-dark)" }}>${b.price.toFixed(2)}</span>
                <span style={{ fontSize: 12, color: "var(--amber)" }}>★ {b.rating}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
