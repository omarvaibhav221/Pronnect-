import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@pronnect.dev");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      if (!err?.response) {
        setError("Cannot connect to backend server (http://localhost:4000). Please make sure the backend is running!");
      } else if (err.response.data?.error?.details?.includes("Can't reach database server")) {
        setError("Backend is running, but cannot connect to PostgreSQL database. Please ensure PostgreSQL is running and configured in backend/.env");
      } else {
        setError(err.response.data?.error?.message ?? "Login failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Pronnect</h1>
        <p className="muted">Sign in to the project dashboard</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? "Signing in\u2026" : "Sign in"}</button>
        <p className="muted small">
          Seeded accounts (password Password123!): admin@pronnect.dev, pm1@pronnect.dev, dev1@pronnect.dev\u2026
        </p>
      </form>
    </div>
  );
}
