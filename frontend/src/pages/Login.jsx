import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { displayNameFromEmail, setCurrentUserName } from "../data/currentUser";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const email = form.querySelector('input[type="email"]')?.value || "";
    const password = form.querySelector('input[type="password"]')?.value || "";

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      window.localStorage.setItem("syncspace-authenticated", "true");
      window.localStorage.setItem("syncspace-token", data.token);
      setCurrentUserName(data.user?.name || displayNameFromEmail(email) || "You");

      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      navigate(returnTo || "/dashboard", { replace: true });
    } catch (err) {
      setError("Could not reach server. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="syncspace-brand">
          <div className="syncspace-logo">S</div>
          <h1>SyncSpace</h1>
          <p>Collaborate. Create. Connect.</p>
        </div>

        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Sign in to continue to your workspace</p>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email</label>
              <input type="email" placeholder="Enter your email" required />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" required />
            </div>

            <div className="forgot-password">
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="register-link">
            Don't have an account? <Link to="/register">Create account</Link>
          </p>
        </div>

        <p className="login-footer">© 2026 SyncSpace</p>
      </div>
    </div>
  );
}

export default Login;