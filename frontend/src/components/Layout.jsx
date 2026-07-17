import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useCart } from "../lib/cart.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearchSubmit(e) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", gap: 24, height: 66 }}
        >
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
          >
            <LogoMark />
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--indigo-dark)" }}>
              PageTurn
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 460 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books by title or author…"
              aria-label="Search books"
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-sunken)",
                fontSize: 14,
              }}
            />
          </form>

          <nav style={{ display: "flex", alignItems: "center", gap: 18, marginLeft: "auto" }}>
            <Link to="/" style={navLinkStyle}>Browse</Link>
            <Link to="/ops" style={navLinkStyle}>Store Ops</Link>
            {user ? (
              <>
                <Link to={`/account/${user.id}`} style={navLinkStyle}>My Account</Link>
                <button className="btn btn-secondary" onClick={logout}>Sign out</button>
              </>
            ) : (
              <Link to="/login" style={navLinkStyle}>Sign in</Link>
            )}
            <Link to="/cart" className="cart-link" aria-label="Cart" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <CartIcon />
              {count > 0 && (
                <span style={{
                  position: "absolute", top: -8, right: -10,
                  background: "var(--teal)", color: "#fff",
                  fontSize: 11, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 5px",
                }}>
                  {count}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, width: "100%" }}>{children}</main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 0", marginTop: 48 }}>
        <div className="container" style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          PageTurn Books — demo storefront built for the Zero to Hero DevSecOps playlist. Not a real store.
        </div>
      </footer>
    </>
  );
}

const navLinkStyle = { color: "var(--ink-soft)", fontWeight: 600, fontSize: 14 };

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="6" fill="var(--indigo)" />
      <path d="M8 8.5C8 8.5 10 7.5 14 9V20C10 18.5 8 19.5 8 19.5V8.5Z" fill="white" fillOpacity="0.9" />
      <path d="M20 8.5C20 8.5 18 7.5 14 9V20C18 18.5 20 19.5 20 19.5V8.5Z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
