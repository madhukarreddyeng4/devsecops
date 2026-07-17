import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";
import BookCover from "../components/BookCover.jsx";

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setError("");
    api.getBook(id).then(setBook).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="container" style={{ padding: "40px 24px" }}>
        <div className="banner banner-error">{error}</div>
        <Link to="/">← Back to catalog</Link>
      </div>
    );
  }

  if (!book) {
    return <div className="container" style={{ padding: "40px 24px", color: "var(--ink-faint)" }}>Loading…</div>;
  }

  return (
    <div className="container" style={{ padding: "40px 24px 64px", maxWidth: 860 }}>
      <Link to="/" style={{ fontSize: 14 }}>← Back to catalog</Link>
      <div style={{ display: "flex", gap: 36, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          <BookCover title={book.title} author={book.author} height={300} />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <span className="badge badge-user" style={{ marginBottom: 10, display: "inline-block" }}>{book.genre}</span>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>{book.title}</h1>
          <div style={{ color: "var(--ink-soft)", fontSize: 16, marginBottom: 14 }}>by {book.author} · {book.year}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--indigo-dark)" }}>${book.price.toFixed(2)}</span>
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>★ {book.rating} / 5</span>
          </div>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 24 }}>
            A {book.genre.toLowerCase()} favorite from {book.author}. This edition ships within one
            business day and qualifies for free shipping on orders over $35.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary" onClick={() => { addItem(book); setAdded(true); }}>
              Add to cart
            </button>
            <button className="btn btn-secondary" onClick={() => { addItem(book); navigate("/cart"); }}>
              Buy now
            </button>
          </div>
          {added && (
            <div className="banner banner-success" style={{ marginTop: 16 }}>
              Added to your cart. <Link to="/cart">View cart →</Link>
            </div>
          )}
        </div>
      </div>

      <Reviews bookId={id} />
    </div>
  );
}

function Stars({ n }) {
  return (
    <span style={{ color: "var(--amber)", letterSpacing: 1 }} aria-label={`${n} out of 5`}>
      {"★".repeat(n)}<span style={{ color: "var(--border-strong)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Reviews({ bookId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ author: "", rating: 5, body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.listReviews(bookId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [bookId]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.body.trim()) {
      setError("Please write a review before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await api.addReview(bookId, form);
      setForm({ author: "", rating: 5, body: "" });
      load(); // reload so the new review shows immediately
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>Customer reviews</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0, marginBottom: 20 }}>
        {loading ? "Loading reviews…" : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {reviews.map((r) => (
          <div key={r.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong>{r.author}</strong>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{r.date}</span>
            </div>
            <div style={{ marginBottom: 8 }}><Stars n={r.rating} /></div>
            {/*
              [VULN-08] STORED XSS — review body is rendered as raw HTML via
              dangerouslySetInnerHTML with no sanitization. A review whose body
              is e.g. <img src=x onerror="..."> will execute JS for every
              visitor. SonarQube's SAST rules flag dangerouslySetInnerHTML here.
              Fix: render {r.body} as plain text, or sanitize with DOMPurify.
            */}
            <div
              style={{ color: "var(--ink-soft)", lineHeight: 1.55 }}
              dangerouslySetInnerHTML={{ __html: r.body }}
            />
          </div>
        ))}
        {!loading && reviews.length === 0 && (
          <div className="card" style={{ padding: 18, color: "var(--ink-faint)" }}>
            No reviews yet — be the first!
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 560 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Write a review</h3>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="rv-author">Your name</label>
              <input id="rv-author" value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} placeholder="Anonymous" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="rv-rating">Rating</label>
              <select
                id="rv-rating"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                style={{ padding: "10px 12px", border: "1px solid var(--border-strong)", borderRadius: 4, background: "var(--surface)" }}
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rv-body">Your review</label>
            <textarea
              id="rv-body"
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              style={{ resize: "vertical" }}
              placeholder="What did you think?"
            />
          </div>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? "Posting…" : "Post review"}
          </button>
        </form>
      </div>
    </section>
  );
}
