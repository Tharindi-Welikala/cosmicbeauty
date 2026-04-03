import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function RefundRequestPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    refundType: "full",
    refundAmount: "",
    reason: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data.data);
        setFormData(prev => ({
          ...prev,
          refundAmount: res.data.data.total.toString()
        }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        reason: formData.reason,
        refundType: formData.refundType
      };

      if (formData.refundType === "partial") {
        payload.refundAmount = parseFloat(formData.refundAmount);
      }

      await api.post(`/refunds/request/${orderId}`, payload);
      alert("Refund request submitted successfully!");
      navigate(`/track/${orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h1>Request Refund</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem" }}>⏳</div>
          <p>Loading order details...</p>
        </div>
      </section>
    );
  }

  if (error && !order) {
    return (
      <section>
        <h1>Request Refund</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", color: "#ef4444" }}>❌</div>
          <p style={{ color: "#ef4444" }}>{error}</p>
        </div>
      </section>
    );
  }

  // Check if order is eligible for refund
  const eligibleStatuses = ["Delivered", "Shipped", "Confirmed", "delivered", "shipped", "confirmed"];
  if (!eligibleStatuses.includes(order.status) && order.paymentStatus !== "paid") {
    return (
      <section>
        <h1>Request Refund</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", color: "#f59e0b" }}>⚠️</div>
          <p>This order is not eligible for refund.</p>
          <p>Current order status: <strong>{order.status}</strong></p>
          <p>Payment status: <strong>{order.paymentStatus}</strong></p>
          <p>Orders must be confirmed, paid, delivered, or shipped to request a refund.</p>
          <button
            onClick={() => navigate(`/track/${orderId}`)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            View Order
          </button>
        </div>
      </section>
    );
  }

  // Check if refund already requested
  if (order.refundRequest) {
    return (
      <section>
        <h1>Request Refund</h1>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", color: "#f59e0b" }}>📋</div>
          <p>A refund request has already been submitted for this order.</p>
          <p><strong>Status:</strong> {order.refundRequest.status}</p>
          <button
            onClick={() => navigate(`/track/${orderId}`)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            View Order
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Request Refund</h1>
      
      <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        {/* Order Summary */}
        <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
          <h3>Order Summary</h3>
          <p><strong>Order:</strong> #{order._id.slice(-8)}</p>
          <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
          <p><strong>Status:</strong> {order.status}</p>
        </div>

        {/* Refund Form */}
        <form onSubmit={handleSubmit}>
          {/* Refund Type */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Refund Type *
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="full"
                  checked={formData.refundType === "full"}
                  onChange={(e) => setFormData(prev => ({ ...prev, refundType: e.target.value }))}
                  style={{ marginRight: "0.5rem" }}
                />
                Full Refund (${order.total.toFixed(2)})
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="partial"
                  checked={formData.refundType === "partial"}
                  onChange={(e) => setFormData(prev => ({ ...prev, refundType: e.target.value }))}
                  style={{ marginRight: "0.5rem" }}
                />
                Partial Refund
              </label>
            </div>
          </div>

          {/* Refund Amount (for partial) */}
          {formData.refundType === "partial" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
                Refund Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={order.total - 0.01}
                value={formData.refundAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, refundAmount: e.target.value }))}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
              <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                Maximum: ${(order.total - 0.01).toFixed(2)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Reason for Refund *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
              minLength={10}
              maxLength={500}
              rows={4}
              placeholder="Please explain why you are requesting a refund..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                resize: "vertical"
              }}
            />
            <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {formData.reason.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ 
              marginBottom: "1rem", 
              padding: "0.75rem", 
              backgroundColor: "#fef2f2", 
              color: "#dc2626", 
              borderRadius: "4px",
              border: "1px solid #fca5a5"
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: submitting ? "#9ca3af" : "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "1rem"
              }}
            >
              {submitting ? "Submitting..." : "Submit Refund Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/track/${orderId}`)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Refund Policy */}
        <div style={{ 
          marginTop: "2rem", 
          padding: "1rem", 
          backgroundColor: "#f8fafc", 
          borderRadius: "6px",
          fontSize: "0.9rem",
          color: "#666"
        }}>
          <h4>Refund Policy</h4>
          <ul style={{ paddingLeft: "1.5rem", margin: "0.5rem 0" }}>
            <li>Refunds are available for delivered and shipped orders</li>
            <li>Processing time: 5-7 business days</li>
            <li>Refund amount will be credited to original payment method</li>
            <li>Partial refunds may be subject to review</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
