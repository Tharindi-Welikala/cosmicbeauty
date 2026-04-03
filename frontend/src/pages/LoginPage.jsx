import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <form className="form auth-form" onSubmit={submit}>
      <h2>Login</h2>
      <input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input
        placeholder="Password"
        type="password"
        required
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign in</button>
      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
        <Link to="/forgot-password" style={{ color: "#c2417a", textDecoration: "none" }}>Forgot password?</Link>
      </p>
      <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.9rem" }}>
        New here? <Link to="/register" style={{ color: "#c2417a", textDecoration: "none" }}>Create account</Link>
      </p>
    </form>
  );
}
