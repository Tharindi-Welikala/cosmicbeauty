import { useState, useEffect } from "react";
import { api } from "../api";
import { Edit, Trash2, Plus, X } from "lucide-react";

export default function AddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ line1: "", city: "", state: "", postalCode: "", country: "Sri Lanka" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/users/addresses");
      setAddresses(res.data.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) {
        // FIX: use PUT not POST for updates
        await api.put(`/users/addresses/${editingId}`, form);
      } else {
        await api.post("/users/addresses", form);
      }
      resetForm();
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const edit = (address) => {
    setForm({
      line1: address.line1 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      country: address.country || "Sri Lanka",
    });
    setEditingId(address._id);
    // scroll to form
    setTimeout(() => document.getElementById("address-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const resetForm = () => {
    setForm({ line1: "", city: "", state: "", postalCode: "", country: "Sri Lanka" });
    setEditingId(null);
  };

  const remove = async (id) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api.delete(`/users/addresses/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete address");
    }
  };

  return (
    <section>
      <h2>Shipping Addresses</h2>

      <div style={{ marginBottom: "2rem" }}>
        {addresses.length === 0 && (
          <p className="muted">No addresses saved yet. Add one below.</p>
        )}
        {addresses.map((a) => (
          <div key={a._id} className="card" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.5rem" }}>
              {a.line1}, {a.city}, {a.state} {a.postalCode}, {a.country}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => edit(a)}
                style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => remove(a._id)}
                className="mutedBtn"
                style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div id="address-form" style={{ marginTop: "2rem" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {editingId ? <><Edit size={18} /> Edit Address</> : <><Plus size={18} /> Add Address</>}
        </h3>
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {[
            { key: "line1", placeholder: "Street Address" },
            { key: "city", placeholder: "City" },
            { key: "state", placeholder: "State/Province" },
            { key: "postalCode", placeholder: "Postal Code" },
            { key: "country", placeholder: "Country" },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required
            />
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Address" : "Save Address"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="mutedBtn" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}