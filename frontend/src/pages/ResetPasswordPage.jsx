import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setMessage(res.data.message || "Password updated");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    }
  };

  return (
    <form className="form auth-form" onSubmit={submit}>
      <h2>Reset Password</h2>
      <input
        type="password"
        minLength={6}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
      />
      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit">Update password</button>
    </form>
  );
}
