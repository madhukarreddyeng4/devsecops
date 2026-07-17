import { Link } from "react-router-dom";
import { useCart } from "../lib/cart.jsx";
import BookCover from "../components/BookCover.jsx";

export default function Cart() {
  const { items, setQty, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "48px 24px", maxWidth: 640 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Your cart</h1>
        <div className="card" style={{ padding: 28, color: "var(--ink-faint)", textAlign: "center" }}>
          Your cart is empty.
          <div style={{ marginTop: 14 }}>
            <Link to="/" className="btn btn-primary">Browse books</Link>
          </div>
        </div>
      </div>
    );
  }

  const shipping = subtotal >= 35 ? 0 : 4.99;

  return (
    <div className="container" style={{ padding: "40px 24px 64px", maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Your cart</h1>

      <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
        {items.map((it, idx) => (
          <div
            key={it.id}
            style={{
              display: "flex", alignItems: "center", gap: 16, padding: 16,
              borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ width: 48, flexShrink: 0 }}>
              <BookCover title={it.title} author={it.author} height={66} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{it.author}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setQty(it.id, it.qty - 1)}>−</button>
              <span style={{ minWidth: 22, textAlign: "center", fontWeight: 600 }}>{it.qty}</span>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setQty(it.id, it.qty + 1)}>+</button>
            </div>
            <div style={{ width: 72, textAlign: "right", fontWeight: 600 }}>
              ${(it.price * it.qty).toFixed(2)}
            </div>
            <button
              onClick={() => removeItem(it.id)}
              aria-label="Remove"
              style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 18 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div className="card" style={{ padding: 20, width: 280 }}>
          <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
          <Row label="Shipping" value={shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`} />
          <div style={{ borderTop: "1px solid var(--border)", margin: "10px 0" }} />
          <Row label="Total" value={`$${(subtotal + shipping).toFixed(2)}`} bold />
          <Link to="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? "var(--ink)" : "var(--ink-soft)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
