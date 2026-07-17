import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../lib/cart.jsx";
import { api } from "../lib/api.js";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({ name: "", email: "", address: "", city: "", zip: "" });
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");

  const shipping = subtotal >= 35 ? 0 : 4.99;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError("");
    try {
      const result = await api.checkout(items);
      setConfirmation(result);
      clear();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (confirmation) {
    return (
      <div className="container" style={{ padding: "56px 24px", maxWidth: 560 }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999, background: "var(--green-bg)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 6 }}>Order confirmed</h1>
          <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
            Thanks for your order! A confirmation email is on its way.
          </p>
          <div className="card" style={{ padding: 16, margin: "20px 0", textAlign: "left", background: "var(--surface-sunken)" }}>
            <Row label="Order reference" value={confirmation.orderRef} />
            <Row label="Items" value={confirmation.itemCount} />
            <Row label="Total charged" value={`$${confirmation.total.toFixed(2)}`} />
            <Row label="Status" value={confirmation.status} />
          </div>
          <Link to="/" className="btn btn-primary">Continue shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "56px 24px", maxWidth: 560 }}>
        <div className="card" style={{ padding: 28, color: "var(--ink-faint)", textAlign: "center" }}>
          Your cart is empty.
          <div style={{ marginTop: 14 }}><Link to="/" className="btn btn-primary">Browse books</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 24px 64px", maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Checkout</h1>
      {error && <div className="banner banner-error">{error}</div>}
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <form onSubmit={placeOrder} style={{ flex: 1, minWidth: 300 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Shipping details</h2>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" required value={form.name} onChange={update("name")} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={update("email")} />
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <input id="address" required value={form.address} onChange={update("address")} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor="city">City</label>
                <input id="city" required value={form.city} onChange={update("city")} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="zip">ZIP</label>
                <input id="zip" required value={form.zip} onChange={update("zip")} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={placing} style={{ marginTop: 8 }}>
              {placing ? "Placing order…" : `Place order · $${(subtotal + shipping).toFixed(2)}`}
            </button>
          </div>
        </form>

        <div style={{ width: 280 }}>
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 14 }}>Order summary</h2>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
                <span style={{ color: "var(--ink-soft)" }}>{it.title} × {it.qty}</span>
                <span>${(it.price * it.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", margin: "10px 0" }} />
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <Row label="Shipping" value={shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`} />
            <Row label="Total" value={`$${(subtotal + shipping).toFixed(2)}`} bold />
          </div>
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
