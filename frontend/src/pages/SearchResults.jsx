import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import BookCover from "../components/BookCover.jsx";

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    api
      .search(q)
      .then((rows) => setResults(rows))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="container" style={{ padding: "36px 24px 64px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Search results</div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>
        Books matching “{q || "…"}”
      </h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        {results ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Searching the catalog…"}
      </p>

      {loading && <div className="card" style={{ padding: 24, color: "var(--ink-faint)" }}>Searching…</div>}
      {error && <div className="banner banner-error">{error}</div>}

      {results && results.length === 0 && !loading && (
        <div className="card" style={{ padding: 24, color: "var(--ink-faint)" }}>
          No books matched that search.
        </div>
      )}

      {results && results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 20,
          }}
        >
          {results.map((b) => (
            <Link key={b.id} to={`/book/${b.id}`} className="card book-card" style={{ padding: 14, textDecoration: "none", color: "inherit" }}>
              <BookCover title={b.title} author={b.author} height={190} />
              <div style={{ fontWeight: 600, marginTop: 12, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>{b.author}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--indigo-dark)" }}>${b.price.toFixed(2)}</span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{b.genre}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
