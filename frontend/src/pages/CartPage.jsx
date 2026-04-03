import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0, total: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const defaultAddressSet = useRef(false);

  const loadCart = async () => {
    try {
      setLoadError("");
      const res = await api.get("/cart");
      setCart(res.data.data);
    } catch {
      setLoadError("Failed to load cart. Please refresh.");
    }
  };

  const loadAddresses = async () => {
    try {
      const res = await api.get("/users/addresses");
      const addrs = res.data.data || [];
      setAddresses(addrs);
      if (!defaultAddressSet.current && addrs.length > 0) {
        setSelectedAddress(addrs[0]._id);
        defaultAddressSet.current = true;
      }
    } catch {}
  };

  useEffect(() => {
    loadCart();
    loadAddresses();
  }, []);

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      await loadCart();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove item");
    }
  };

  const checkout = async () => {
    if (addresses.length === 0) {
      alert("Please add a shipping address first");
      return;
    }
    if (!selectedAddress) {
      alert("Please select a shipping address");
      return;
    }
    if (paymentMethod === "card" && (!stripe || !elements)) {
      alert("Stripe is still loading. Please wait.");
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === "card") {
        const intentRes = await api.post("/payments/create-intent", { addressId: selectedAddress });
        const { clientSecret, orderId, paymentIntentId } = intentRes.data.data;

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: elements.getElement(CardElement) },
        });

        if (result.error) throw new Error(result.error.message);

        await api.post("/payments/confirm", {
          orderId,
          paymentIntentId: result.paymentIntent.id,
        });
      } else {
        await api.post("/orders", { paymentMethod: "cod", addressId: selectedAddress });
      }

      await loadCart();
      alert("Order placed successfully!");
      navigate("/dashboard");
    } catch (err) {
      alert(err.message || err.response?.data?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1>Your Cart</h1>

      {loadError && <p className="error">{loadError}</p>}

      {cart.items.length === 0 ? (
        <p className="muted">Your cart is empty. <a href="/" style={{ color: "#c2417a", textDecoration: "none" }}>Browse products</a></p>
      ) : (
        <>
          <div className="grid">
            {cart.items.map((item) => (
              <article key={item._id} className="card">
                <p className="itemName">{item.product?.name || "Product"}</p>
                <p>Qty: {item.quantity}</p>
                <p className="price">LKR {Number(item.priceSnapshot).toFixed(2)}</p>
                <button
                  onClick={() => removeItem(item._id)}
                  style={{ marginTop: "0.5rem", background: "transparent", border: "1px solid #e0a0b8", color: "#c2417a", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          <div className="cartSummary">
            <div style={{ marginBottom: "1.5rem" }}>
              <h3>Shipping Address</h3>
              {addresses.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.9rem" }}>
                  No addresses saved. <a href="/addresses" style={{ color: "#c2417a" }}>Add address</a>
                </p>
              ) : (
                <select
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", marginBottom: "1rem" }}
                >
                  {addresses.map((addr) => (
                    <option key={addr._id} value={addr._id}>
                      {addr.line1}, {addr.city} - {addr.postalCode}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <h3>Payment Method</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input type="radio" value="card" checked={paymentMethod === "card"} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: "0.5rem" }} />
                  Credit/Debit Card
                </label>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input type="radio" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: "0.5rem" }} />
                  Cash on Delivery
                </label>
              </div>

              {paymentMethod === "card" && (
                <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
                  <CardElement options={{ style: { base: { fontSize: "16px", color: "#333", "::placeholder": { color: "#aaa" } } } }} />
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: "1rem" }}>
              <p>Subtotal: LKR {Number(cart.subtotal).toFixed(2)}</p>
              <p className="cartTotal">Total: LKR {Number(cart.total).toFixed(2)}</p>
              <button
                onClick={checkout}
                disabled={loading || addresses.length === 0}
                style={{ opacity: loading || addresses.length === 0 ? 0.6 : 1, cursor: loading || addresses.length === 0 ? "not-allowed" : "pointer" }}
              >
                {loading ? "Processing..." : "Checkout"}
              </button>
              {paymentMethod === "card" && (
                <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.5rem" }}>
                  Test card: 4242 4242 4242 4242 · any future date · any CVC
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}