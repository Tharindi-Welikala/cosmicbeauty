import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { Clock, CheckCircle, RotateCcw, Truck, Package, X, ExternalLink, AlertCircle, User } from "lucide-react";

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Order not found");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const getStatusColor = (status) => {
    const colors = {
      "Pending": "#f59e0b",
      "Confirmed": "#3b82f6",
      "Processing": "#8b5cf6",
      "Shipped": "#06b6d4",
      "Delivered": "#10b981",
      "Cancelled": "#ef4444",
      "Returned": "#6366f1"
    };
    return colors[status] || "#6b7280";
  };

  const getStatusIcon = (status) => {
    const icons = {
      "Pending": <Clock size={16} />,
      "Confirmed": <CheckCircle size={16} />,
      "Processing": <RotateCcw size={16} />,
      "Shipped": <Truck size={16} />,
      "Delivered": <Package size={16} />,
      "Cancelled": <X size={16} />,
      "Returned": <RotateCcw size={16} />
    };
    return icons[status] || <AlertCircle size={16} />;
  };

  const getProgressPercentage = (status) => {
    const progress = {
      "Pending": 10,
      "Confirmed": 25,
      "Processing": 50,
      "Shipped": 75,
      "Delivered": 100,
      "Cancelled": 0,
      "Returned": 0
    };
    return progress[status] || 0;
  };

  if (loading) {
    return (
      <section>
        <h1>Order Tracking</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem" }}><Clock size={32} /></div>
          <p>Loading order details...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Order Tracking</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", color: "#ef4444" }}><X size={32} /></div>
          <p style={{ color: "#ef4444" }}>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Order Tracking</h1>

      <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        {/* Order Header */}
        <div style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <h2>Order #{order._id.slice(-8)}</h2>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
          
          {/* Admin: show customer info */}
          {isAdmin && order.user && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.5rem 0.75rem",
              background: "#f8f0f4",
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: "#5c2333"
            }}>
              <User size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              <strong>{order.user.name || "Customer"}</strong>
              {order.user.email && (
                <span style={{ color: "#888", marginLeft: "6px" }}>· {order.user.email}</span>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "bold", color: getStatusColor(order.status) }}>
              {getStatusIcon(order.status)} {order.status}
            </span>
            <span style={{ fontSize: "0.9rem", color: "#666" }}>
              {getProgressPercentage(order.status)}% Complete
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${getProgressPercentage(order.status)}%`,
                height: "100%",
                backgroundColor: getStatusColor(order.status),
                transition: "width 0.3s ease"
              }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div style={{ marginBottom: "2rem" }}>
          <h3>Order Timeline</h3>
          <div style={{ paddingLeft: "1rem" }}>
            {[
              { icon: <Clock size={16} />, label: "Order Placed", active: true },
              { icon: <CheckCircle size={16} />, label: "Order Confirmed", active: ["Confirmed", "Processing", "Shipped", "Delivered"].includes(order.status) },
              { icon: <RotateCcw size={16} />, label: "Processing",    active: ["Processing", "Shipped", "Delivered"].includes(order.status) },
              { icon: <Truck size={16} />, label: "Shipped",        active: ["Shipped", "Delivered"].includes(order.status) },
              { icon: <Package size={16} />, label: "Delivered",      active: order.status === "Delivered" },
            ].map(({ icon, label, active }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem", opacity: active ? 1 : 0.4 }}>
                <span style={{ marginRight: "0.5rem" }}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking Info */}
        {order.trackingNumber && (
          <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
            <h4>Tracking Information</h4>
            <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
            {order.carrier && <p><strong>Carrier:</strong> {order.carrier}</p>}
            <a
              href={`https://www.google.com/search?q=${order.trackingNumber}+${order.carrier || "tracking"}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#c2417a", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              Track Package <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Order Items */}
        <div style={{ marginBottom: "2rem" }}>
          <h3>Order Items</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {order.items.map((item, index) => (
              <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <span style={{ fontWeight: "bold" }}>{item.name}</span>
                  <span style={{ color: "#666", marginLeft: "0.5rem" }}>× {item.quantity}</span>
                </div>
                <span>LKR {(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span>Subtotal:</span>
            <span>LKR {order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span>Discount:</span>
              <span style={{ color: "#10b981" }}>- LKR {order.discount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>Total:</span>
            <span>LKR {order.total.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#666", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            <span>Payment</span>
            <span>{order.paymentStatus} · {order.paymentMethod}</span>
          </div>
        </div>

        {/* Existing Refund Request */}
        {order.refundRequest && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: order.refundRequest.status === "approved" ? "#f0fdf4" :
                             order.refundRequest.status === "rejected" ? "#fef2f2" : "#fefce8",
            borderRadius: "6px",
            border: `1px solid ${
              order.refundRequest.status === "approved" ? "#86efac" :
              order.refundRequest.status === "rejected" ? "#fca5a5" : "#fde047"
            }`
          }}>
            <h4>Refund Request</h4>
            <p><strong>Status:</strong> {order.refundRequest.status}</p>
            <p><strong>Type:</strong> {order.refundRequest.type}</p>
            <p><strong>Amount:</strong> LKR {order.refundRequest.amount.toFixed(2)}</p>
            <p><strong>Reason:</strong> {order.refundRequest.reason}</p>
            {order.refundRequest.adminNote && (
              <p><strong>Admin Note:</strong> {order.refundRequest.adminNote}</p>
            )}
          </div>
        )}

        {/* Request Refund Button - Customer only */}
        {!isAdmin && !order.refundRequest && (["Delivered", "Shipped", "Confirmed", "delivered", "shipped", "confirmed"].includes(order.status) || order.paymentStatus === "paid") && (
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => navigate(`/refund/${order._id}`)}
              style={{
                backgroundColor: "#c2417a",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 600,
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#a83566"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#c2417a"}
            >
              Request Refund
            </button>
          </div>
        )}
      </div>
    </section>
  );
}