import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { api } from "../lib/api.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      login(token);
      navigate("/");
    } catch (err) {
      setError("That username and password don't match our records.");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="container" style={{ maxWidth: 440, padding: "64px 24px" }}>
        <div className="banner banner-success">
          You're signed in as <strong>{user.username}</strong>.
        </div>
        <Link to="/" className="btn btn-secondary btn-block">Back to store</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 420, padding: "56px 24px" }}>
      <div className="card" style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Sign in to PageTurn</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
          Access your orders, saved books, and account details.
        </p>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 18, marginBottom: 0 }}>
          Demo accounts: <code className="mono">alice / alicepw</code> or <code className="mono">marcus / marcus2024</code>
        </p>
      </div>
    </div>
  );
}
