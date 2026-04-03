import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { Link } from "react-router-dom";
import { User, Package, ChevronRight } from "lucide-react";

function StatusBadge({ status }) {
  const colours = {
    Pending:    { bg: "#fff3cd", color: "#856404" },
    Confirmed:  { bg: "#cce5ff", color: "#004085" },
    Processing: { bg: "#e2d9f3", color: "#5a1d96" },
    Shipped:    { bg: "#d4edda", color: "#155724" },
    Delivered:  { bg: "#d1ecf1", color: "#0c5460" },
    Cancelled:  { bg: "#f8d7da", color: "#721c24" },
    Returned:   { bg: "#fde8d8", color: "#7d3a00" },
  };
  const style = colours[status] || { bg: "#e9ecef", color: "#495057" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "2px 10px", borderRadius: "999px",
      fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.02em"
    }}>
      {status}
    </span>
  );
}

function TicketStatusBadge({ status }) {
  const map = {
    open:        { bg: "#cce5ff", color: "#004085" },
    in_progress: { bg: "#fff3cd", color: "#856404" },
    closed:      { bg: "#d4edda", color: "#155724" },
  };
  const s = map[status] || { bg: "#e9ecef", color: "#495057" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: "999px",
      fontSize: "0.75rem", fontWeight: 600
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=400&q=60";

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [tickets, setTickets]   = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ticketForm, setTicketForm] = useState({ type: "inquiry", subject: "", message: "" });

  // ── Admin ticket reply state ─────────────────────────────────────────────
  // replyDraft[ticketId] = { message: "", status: "in_progress" }
  const [replyDraft, setReplyDraft]   = useState({});
  const [replySending, setReplySending] = useState({});
  const [replyError, setReplyError]   = useState({});

  const loadAll = () => {
    if (user?.role === "customer" || user?.role === "admin") {
      api.get("/orders").then((res) => setOrders(res.data.data.items || [])).catch(() => {});
    }
    api.get("/tickets").then((res) => setTickets(res.data.data || [])).catch(() => {});
    if (user?.role === "customer") {
      api.get("/users/wishlist").then((res) => setWishlist(res.data.data || [])).catch(() => {});
    }
  };

  useEffect(() => { loadAll(); }, [user]);

  // ── Customer: create ticket ──────────────────────────────────────────────
  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tickets", ticketForm);
      setTicketForm({ type: "inquiry", subject: "", message: "" });
      const res = await api.get("/tickets");
      setTickets(res.data.data || []);
    } catch (_err) {}
  };

  // ── Admin: reply to ticket ───────────────────────────────────────────────
  const sendReply = async (ticketId) => {
    const draft = replyDraft[ticketId] || {};
    if (!draft.message?.trim()) return;

    setReplySending((prev) => ({ ...prev, [ticketId]: true }));
    setReplyError((prev) => ({ ...prev, [ticketId]: "" }));

    try {
      await api.post(`/tickets/${ticketId}/reply`, {
        message: draft.message.trim(),
        status: draft.status || "in_progress",
      });
      // Clear draft and reload tickets
      setReplyDraft((prev) => ({ ...prev, [ticketId]: { message: "", status: "in_progress" } }));
      const res = await api.get("/tickets");
      setTickets(res.data.data || []);
    } catch (err) {
      setReplyError((prev) => ({
        ...prev,
        [ticketId]: err.response?.data?.message || "Failed to send reply",
      }));
    } finally {
      setReplySending((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/users/wishlist/${productId}`);
      setWishlist((prev) => prev.filter((p) => p._id !== productId));
    } catch {}
  };

  const isAdmin   = user?.role === "admin";
  const isSupport = user?.role === "support";

  return (
    <section>
      <h2>Personal Dashboard</h2>
      <p>Welcome, {user?.name}</p>

      {/* ── Order History ────────────────────────────────────────────────── */}
      <h3 style={{ marginTop: "1.5rem" }}>Order History</h3>
      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="grid">
          {orders.map((o) => (
            <article
              key={o._id}
              className="card"
              style={{ transition: "box-shadow 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(194,65,122,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <StatusBadge status={o.status} />
                <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                  {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              <p style={{ margin: "0.25rem 0", fontSize: "0.72rem", color: "#bbb", fontFamily: "monospace" }}>#{o._id}</p>

              {/* ── Admin: show customer info ──── */}
              {isAdmin && o.user && (
                <div style={{
                  margin: "0.4rem 0",
                  padding: "0.4rem 0.6rem",
                  background: "#f8f0f4",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  color: "#5c2333"
                }}>
                  <User size={14} style={{ marginRight: "4px" }} />
                  <strong>{o.user.name || "Customer"}</strong>
                  {o.user.email && (
                    <span style={{ color: "#888", marginLeft: "4px" }}>· {o.user.email}</span>
                  )}
                </div>
              )}

              <p style={{ margin: "0.4rem 0 0", fontWeight: 700, fontSize: "1rem" }}>LKR {o.total?.toFixed(2)}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#888" }}>
                {o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}
              </p>
              {(o.trackingNumber || o.carrier) && (
                <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#2e7d52", fontWeight: 600 }}>
                  <Package size={14} style={{ marginRight: "4px" }} /> Tracking available
                </p>
              )}

              <div style={{ margin: "8px 0 0", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Link
                  to={`/track/${o._id}`}
                  style={{ fontSize: "0.78rem", color: "#c2417a", textDecoration: "none", fontWeight: 600 }}
                >
                  {isAdmin ? "View Order" : "Track Order"} <ChevronRight size={14} />
                </Link>
                {!isAdmin && ["Delivered", "Shipped"].includes(o.status) && !o.refundRequest && (
                  <Link
                    to={`/refund/${o._id}`}
                    style={{ fontSize: "0.78rem", color: "#ef4444", textDecoration: "none", fontWeight: 600 }}
                  >
                    Refund →
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Wishlist (customers only) ─────────────────────────────────────── */}
      {user?.role === "customer" && (
        <>
          <h3 style={{ marginTop: "2rem" }}>My Wishlist</h3>
          {wishlist.length === 0 ? (
            <p className="muted">No saved items yet. Browse products and click ♡ Save.</p>
          ) : (
            <div className="grid">
              {wishlist.map((p) => (
                <article key={p._id} className="card">
                  <img
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "8px", marginBottom: "0.5rem" }}
                    src={p.images?.[0] || PLACEHOLDER}
                    alt={p.name}
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                  />
                  <p style={{ fontWeight: 500, margin: "0 0 2px" }}>{p.name}</p>
                  <p style={{ fontSize: "0.82rem", color: "#888", margin: "0 0 4px" }}>{p.brand}</p>
                  <p style={{ fontWeight: 700, margin: "0 0 8px" }}>LKR {p.discountPrice || p.price}</p>
                  <button onClick={() => removeFromWishlist(p._id)} className="mutedBtn" style={{ fontSize: "0.82rem" }}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Help Desk form (customers only) ──────────────────────────────── */}
      {user?.role === "customer" && (
        <>
          <h3 style={{ marginTop: "2rem" }}>Help Desk</h3>
          <form className="form" onSubmit={createTicket}>
            <select value={ticketForm.type} onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}>
              <option value="inquiry">Inquiry</option>
              <option value="complaint">Complaint</option>
              <option value="return">Return</option>
              <option value="feedback">Feedback</option>
            </select>
            <input
              placeholder="Subject"
              value={ticketForm.subject}
              onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
            />
            <textarea
              placeholder="Message"
              value={ticketForm.message}
              onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
            />
            <button type="submit">Submit Ticket</button>
          </form>
        </>
      )}

      {/* ── Tickets list ─────────────────────────────────────────────────── */}
      <h3 style={{ marginTop: "2rem" }}>
        {isAdmin || isSupport ? "Support Tickets" : "My Tickets"}
      </h3>
      {tickets.length === 0 ? (
        <p className="muted">No tickets yet.</p>
      ) : (
        <div className="grid">
          {tickets.map((t) => (
            <article className="card" key={t._id}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <p style={{ fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>{t.subject}</p>
                <TicketStatusBadge status={t.status} />
              </div>

              <p style={{ fontSize: "0.78rem", color: "#888", margin: "0 0 4px", textTransform: "capitalize" }}>
                {t.type}
              </p>

              {/* Admin/support: show customer info */}
              {(isAdmin || isSupport) && t.customer && (
                <div style={{
                  padding: "0.35rem 0.6rem",
                  background: "#f8f0f4",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  color: "#5c2333",
                  marginBottom: "0.5rem"
                }}>
                  <User size={14} style={{ marginRight: "4px" }} />
                  <strong>{t.customer.name}</strong>
                  <span style={{ color: "#888", marginLeft: "4px" }}>· {t.customer.email}</span>
                </div>
              )}

              {/* Message thread preview */}
              {t.messages?.length > 0 && (
                <div style={{ margin: "0.4rem 0 0.6rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {t.messages.slice(-3).map((m, i) => (
                    <div key={i} style={{
                      background: "#f9f4f7",
                      borderRadius: "6px",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.8rem",
                      color: "#444",
                      borderLeft: "2px solid #e0a0b8"
                    }}>
                      {m.text}
                    </div>
                  ))}
                  {t.messages.length > 3 && (
                    <p style={{ fontSize: "0.75rem", color: "#bbb", margin: 0 }}>
                      +{t.messages.length - 3} earlier message{t.messages.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Admin/support: reply box */}
              {(isAdmin || isSupport) && (
                <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <textarea
                    placeholder="Type a reply..."
                    rows={2}
                    value={replyDraft[t._id]?.message || ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({
                        ...prev,
                        [t._id]: { ...prev[t._id], message: e.target.value },
                      }))
                    }
                    style={{ width: "100%", resize: "vertical", fontSize: "0.85rem" }}
                  />
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={replyDraft[t._id]?.status || "in_progress"}
                      onChange={(e) =>
                        setReplyDraft((prev) => ({
                          ...prev,
                          [t._id]: { ...prev[t._id], status: e.target.value },
                        }))
                      }
                      style={{ fontSize: "0.82rem", padding: "0.35rem 0.5rem" }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      onClick={() => sendReply(t._id)}
                      disabled={replySending[t._id] || !replyDraft[t._id]?.message?.trim()}
                      style={{ fontSize: "0.82rem", padding: "0.35rem 0.9rem" }}
                    >
                      {replySending[t._id] ? "Sending..." : "Reply"}
                    </button>
                  </div>
                  {replyError[t._id] && (
                    <p className="error" style={{ fontSize: "0.8rem", margin: 0 }}>{replyError[t._id]}</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}