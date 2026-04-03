import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <form className="form auth-form" onSubmit={submit}>
      <h2>Create account</h2>
      <input placeholder="Name" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input
        placeholder="Password"
        type="password"
        minLength={6}
        required
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Register</button>
      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
        Already have an account? <a href="/login" style={{ color: "#c2417a", textDecoration: "none" }}>Login instead</a>
      </p>
    </form>
  );
}
