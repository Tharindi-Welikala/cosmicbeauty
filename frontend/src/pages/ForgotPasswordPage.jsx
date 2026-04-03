import { useState } from "react";
import { api } from "../api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Reset link sent");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request reset");
    }
  };

  return (
    <form className="form auth-form" onSubmit={submit}>
      <h2>Forgot Password</h2>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit">Send reset link</button>
    </form>
  );
}
