import { useEffect, useState } from "react";
import { api } from "../api";

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [reply, setReply] = useState({});
  const [replyStatus, setReplyStatus] = useState({});
  const [sending, setSending] = useState({});

  const load = async () => {
    try {
      const res = await api.get("/tickets");
      setTickets(res.data.data);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  const sendReply = async (id) => {
    const message = reply[id]?.trim() || "Received. We are reviewing.";
    setSending((prev) => ({ ...prev, [id]: true }));
    setReplyStatus((prev) => ({ ...prev, [id]: null }));

    try {
      await api.post(`/tickets/${id}/reply`, { message, status: "in_progress" });
      setReply((prev) => ({ ...prev, [id]: "" }));
      setReplyStatus((prev) => ({ ...prev, [id]: { ok: true, msg: "Reply sent." } }));
      load();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to send reply";
      setReplyStatus((prev) => ({ ...prev, [id]: { ok: false, msg } }));
    } finally {
      setSending((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <section>
      <h2>Support Desk</h2>

      {tickets.length === 0 && <p className="muted">No tickets yet.</p>}

      <div className="grid">
        {tickets.map((t) => (
          <article key={t._id} className="card">
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontWeight: 600, margin: "0 0 2px" }}>{t.subject}</p>
              <p style={{ fontSize: "0.82rem", color: "#888", margin: 0 }}>
                Type: {t.type} &nbsp;·&nbsp; Customer: {t.customer?.name || "Unknown"}
              </p>
            </div>

            <p style={{ marginBottom: "0.75rem" }}>
              <span style={{
                background: t.status === "open" ? "#fff3cd" : t.status === "in_progress" ? "#cce5ff" : "#d4edda",
                color: t.status === "open" ? "#856404" : t.status === "in_progress" ? "#004085" : "#155724",
                padding: "2px 8px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700
              }}>
                {t.status}
              </span>
            </p>

            {/* Message thread */}
            <div style={{ background: "#f8f8f8", borderRadius: "6px", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", maxHeight: 140, overflowY: "auto" }}>
              {t.messages?.map((m, i) => {
                // FIX: compare as strings — ObjectId === ObjectId always false in JS
                const isCustomer = m.by?.toString() === t.customer?._id?.toString();
                return (
                  <div key={i} style={{ marginBottom: "0.4rem", fontSize: "0.83rem" }}>
                    <strong style={{ color: isCustomer ? "#333" : "#c2417a" }}>
                      {isCustomer ? t.customer?.name || "Customer" : "Support"}:
                    </strong>{" "}
                    {m.text}
                  </div>
                );
              })}
            </div>

            <textarea
              placeholder="Type your reply..."
              value={reply[t._id] || ""}
              onChange={(e) => setReply({ ...reply, [t._id]: e.target.value })}
              style={{ width: "100%", minHeight: 70, marginBottom: "0.5rem", resize: "vertical" }}
            />

            {replyStatus[t._id] && (
              <p style={{
                fontSize: "0.82rem",
                color: replyStatus[t._id].ok ? "#155724" : "#721c24",
                marginBottom: "0.5rem"
              }}>
                {replyStatus[t._id].msg}
              </p>
            )}

            <button
              onClick={() => sendReply(t._id)}
              disabled={sending[t._id]}
              style={{ opacity: sending[t._id] ? 0.6 : 1 }}
            >
              {sending[t._id] ? "Sending..." : "Reply"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}