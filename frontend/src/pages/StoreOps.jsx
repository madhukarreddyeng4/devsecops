import { useState } from "react";
import { api } from "../lib/api.js";

export default function StoreOps() {
  return (
    <div className="container" style={{ padding: "40px 24px 64px", maxWidth: 760 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Internal tools</div>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Store operations</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 32, fontSize: 14 }}>
        Utilities the fulfillment team uses day to day — checking supplier hosts and
        previewing order confirmation emails before a send.
      </p>

      <SupplierDiagnostics />
      <div style={{ height: 28 }} />
      <EmailTemplatePreview />
    </div>
  );
}

function SupplierDiagnostics() {
  const [host, setHost] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const { output } = await api.ping(host);
      setOutput(output);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Supplier connectivity check</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Check whether a distributor or print-partner host is reachable.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          type="text"
          placeholder="e.g. ingram-supply.internal"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 4, border: "1px solid var(--border-strong)" }}
        />
        <button className="btn btn-primary" disabled={loading || !host}>
          {loading ? "Checking…" : "Check host"}
        </button>
      </form>
      {error && <div className="banner banner-error" style={{ marginTop: 14 }}>{error}</div>}
      {output && (
        <pre className="mono" style={{ marginTop: 14, background: "var(--surface-sunken)", padding: 14, borderRadius: 4, fontSize: 13, overflowX: "auto", whiteSpace: "pre-wrap" }}>
          {output}
        </pre>
      )}
    </section>
  );
}

function EmailTemplatePreview() {
  const [template, setTemplate] = useState(
    "Hi <%= name %>, your order <%= orderRef %> has shipped!"
  );
  const [name, setName] = useState("Alice");
  const [orderRef, setOrderRef] = useState("PT-10442");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPreview("");
    try {
      const result = await api.renderPreview(template, { name, orderRef });
      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Order email preview</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Render a shipping-confirmation email with sample data before sending it out.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="template">Template</label>
          <textarea
            id="template"
            rows={3}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="name">Sample name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="orderRef">Sample order ref</label>
            <input id="orderRef" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Rendering…" : "Render preview"}
        </button>
      </form>
      {error && <div className="banner banner-error" style={{ marginTop: 14 }}>{error}</div>}
      {preview && (
        <div style={{ marginTop: 14, background: "var(--surface-sunken)", padding: 14, borderRadius: 4, fontSize: 14 }}>
          {preview}
        </div>
      )}
    </section>
  );
}
