import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Account() {
  const { id } = useParams();
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getAccount(id)
      .then((data) => setAccount(Object.keys(data).length ? data : null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwnAccount = user && String(user.id) === String(id);

  return (
    <div className="container" style={{ maxWidth: 640, padding: "40px 24px 64px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>My account</div>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>Account #{id}</h1>

      {loading && <div className="card" style={{ padding: 24, color: "var(--ink-faint)" }}>Loading…</div>}
      {error && <div className="banner banner-error">{error}</div>}

      {!loading && !error && !account && (
        <div className="card" style={{ padding: 24, color: "var(--ink-faint)" }}>
          No account found with that ID.
        </div>
      )}

      {account && (
        <>
          {!isOwnAccount && (
            <div className="banner banner-info" style={{ marginBottom: 18 }}>
              You're viewing another customer's account — including their address and order
              history. A properly secured app would block this unless you're an admin.
            </div>
          )}

          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Profile</h2>
            <Row label="Name" value={account.name} />
            <Row label="Username" value={account.username} />
            <Row label="Email" value={account.email} />
            <Row label="Shipping address" value={account.address} />
            <Row
              label="Role"
              value={
                <span className={`badge ${account.role === "admin" ? "badge-admin" : "badge-user"}`}>
                  {account.role}
                </span>
              }
            />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Order history</h2>
            {account.orders && account.orders.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr><th>Order</th><th>Title</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {account.orders.map((o) => (
                    <tr key={o.ref}>
                      <td className="mono">{o.ref}</td>
                      <td>{o.title}</td>
                      <td>${o.total.toFixed(2)}</td>
                      <td>{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: "var(--ink-faint)" }}>No orders yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
      <dt style={{ color: "var(--ink-soft)", fontSize: 14, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: "right" }}>{value}</dd>
    </div>
  );
}
