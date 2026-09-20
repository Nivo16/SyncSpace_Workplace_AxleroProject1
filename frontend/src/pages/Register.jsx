import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setCurrentUserName } from "../data/currentUser";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const fullName = form.querySelector('input[type="text"]')?.value || "";
    const email = form.querySelector('input[type="email"]')?.value || "";
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    const password = passwordInputs[0]?.value || "";
    const confirmPassword = passwordInputs[1]?.value || "";

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      window.localStorage.setItem("syncspace-authenticated", "true");
      window.localStorage.setItem("syncspace-token", data.token);
      setCurrentUserName(data.user?.name || fullName || "You");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Could not reach server. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-brand">
          <div className="register-logo">S</div>
          <h1>SyncSpace</h1>
          <p>Collaborate. Create. Connect.</p>
        </div>

        <div className="register-card">
          <h2>Create Account</h2>
          <p className="register-subtitle">Join SyncSpace and start collaborating</p>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <form onSubmit={handleRegister}>
            <div className="register-input-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your full name" required />
            </div>

            <div className="register-input-group">
              <label>Email</label>
              <input type="email" placeholder="Enter your email" required />
            </div>

            <div className="register-input-group">
              <label>Password</label>
              <input type="password" placeholder="Create a password" required />
            </div>

            <div className="register-input-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Confirm your password" required />
            </div>

            <button type="submit" className="register-button" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>

        <p className="register-footer">© 2026 SyncSpace</p>
      </div>
    </div>
  );
}

export default Register;