import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ phone: "", paymentPreference: "card" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/profile")
      .then((res) => {
        const d = res.data.data;
        setForm({
          phone: d.phone || "",
          paymentPreference: d.paymentPreference || "card",
        });
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.put("/users/profile", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    }
  };

  if (loading) return <p className="muted">Loading profile...</p>;

  return (
    <section>
      <h2>My Profile</h2>

      {/* ── Read-only info ── */}
      <div style={{
        background: "var(--color-background-secondary, #f9f0f5)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#f4c0d1", color: "#72243e",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 500, fontSize: "1.1rem", flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 500, fontSize: "1rem", margin: 0 }}>{user?.name}</p>
            <p style={{ fontSize: "0.85rem", color: "#888", margin: 0 }}>{user?.email}</p>
          </div>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#aaa", margin: "0.25rem 0 0" }}>
          Role: {user?.role}
        </p>
      </div>

      {/* ── Editable fields ── */}
      <form className="form" onSubmit={save} style={{ maxWidth: 420 }}>
        <h3 style={{ marginBottom: "1rem" }}>Contact &amp; preferences</h3>

        <label style={{ fontSize: "0.85rem", color: "#666", display: "block", marginBottom: "0.25rem" }}>
          Phone number
        </label>
        <input
          type="tel"
          placeholder="e.g. +94 77 123 4567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={{ marginBottom: "1rem" }}
        />

        <label style={{ fontSize: "0.85rem", color: "#666", display: "block", marginBottom: "0.25rem" }}>
          Preferred payment method
        </label>
        <select
          value={form.paymentPreference}
          onChange={(e) => setForm({ ...form, paymentPreference: e.target.value })}
          style={{ marginBottom: "1.25rem" }}
        >
          <option value="card">Credit / Debit card</option>
          <option value="paypal">PayPal</option>
          <option value="cod">Cash on delivery</option>
        </select>

        {error && <p className="error" style={{ marginBottom: "0.75rem" }}>{error}</p>}

        {saved && (
          <p style={{ color: "#2e7d52", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            ✓ Profile saved
          </p>
        )}

        <button type="submit">Save changes</button>
      </form>
    </section>
  );
}