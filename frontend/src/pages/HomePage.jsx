import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

const PRODUCT_PLACEHOLDER =
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80";

function CategoryBadge({ category }) {
  if (!category) return null;
  const key = category.toLowerCase();
  const map = {
    skincare: "badge-skincare",
    makeup: "badge-makeup",
    haircare: "badge-haircare",
    fragrance: "badge-fragrance",
    body: "badge-body",
  };
  const cls = map[key] || "badge-default";
  return <span className={`badge ${cls}`}>{category}</span>;
}

// ── Personalised Recommendations ─────────────────────────────────────────────
// Derives categories from the current product list the user is browsing and
// shows up to 4 other products from the same categories.
function Recommendations({ allProducts, compareList, onAddToCart, onToggleWishlist, wishlist, onCompareToggle }) {
  const { user } = useAuth();

  if (!allProducts || allProducts.length < 2) return null;

  // Pick the most common category in the current view and return other products in it
  const categoryCounts = {};
  allProducts.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topCategory) return null;

  const recs = allProducts
    .filter((p) => p.category === topCategory && p.stockQty > 0)
    .slice(0, 4);

  if (recs.length < 2) return null;

  return (
    <div style={{ marginTop: "2.5rem" }}>
      <h3 style={{ marginBottom: "0.25rem" }}>You may also like</h3>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
        More in {topCategory}
      </p>
      <div className="grid">
        {recs.map((p) => (
          <article key={`rec-${p._id}`} className="card" style={{ opacity: 0.95 }}>
            <img
              className="productImage"
              src={p.images?.[0] || PRODUCT_PLACEHOLDER}
              alt={p.name}
              loading="lazy"
              onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
            />
            <h3>{p.name}</h3>
            <p>{p.brand}</p>
            <CategoryBadge category={p.category} />
            <p className="price">LKR {p.discountPrice || p.price}</p>
            <p>{"★".repeat(Math.round(p.averageRating || 0))} {p.averageRating || 0}/5</p>
            <div className="actionRow">
              <button onClick={() => onAddToCart(p._id)} disabled={p.stockQty <= 0}>
                Add to cart
              </button>
              <button onClick={() => onToggleWishlist(p._id)}>
                {wishlist.includes(p._id) ? "♥ Saved" : "♡ Save"}
              </button>
            </div>
            {user?.role === "customer" && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={compareList.some((c) => c._id === p._id)}
                  onChange={() => onCompareToggle(p)}
                />
                Compare
              </label>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ── Product Comparison Panel ──────────────────────────────────────────────────
function ComparePanel({ compareList, onRemove, onClear }) {
  if (compareList.length < 2) return null;

  const fields = [
    { label: "Brand", key: "brand" },
    { label: "Category", key: "category" },
    { label: "Price", render: (p) => `LKR ${p.discountPrice || p.price}` },
    { label: "Rating", render: (p) => `${p.averageRating || 0} / 5` },
    { label: "Stock", render: (p) => p.stockQty > 0 ? "In stock" : "Out of stock" },
    { label: "Description", key: "description" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--color-background-primary, #fff)",
      borderTop: "1.5px solid #e0a0b8",
      zIndex: 900, padding: "0",
      boxShadow: "0 -4px 24px rgba(194,65,122,0.10)",
      maxHeight: "70vh", overflowY: "auto",
    }}>
      <div className="container" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Comparing {compareList.length} products</h3>
          <button
            onClick={onClear}
            className="mutedBtn"
            style={{ padding: "4px 12px", fontSize: "0.82rem" }}
          >
            Clear all
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", minWidth: 400 }}>
            <thead>
              <tr>
                <th style={{ width: 100, textAlign: "left", padding: "6px 8px", color: "#999", fontWeight: 500 }}></th>
                {compareList.map((p) => (
                  <th key={p._id} style={{ padding: "6px 8px", textAlign: "left", minWidth: 140 }}>
                    <div style={{ fontWeight: 500, fontSize: "0.88rem" }}>{p.name}</div>
                    <button
                      onClick={() => onRemove(p._id)}
                      className="mutedBtn"
                      style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                    >
                      Remove ✕
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(({ label, key, render }) => (
                <tr key={label} style={{ borderTop: "0.5px solid #f0e0e8" }}>
                  <td style={{ padding: "7px 8px", color: "#999", fontWeight: 500, fontSize: "0.8rem", verticalAlign: "top" }}>{label}</td>
                  {compareList.map((p) => (
                    <td key={p._id} style={{ padding: "7px 8px", verticalAlign: "top", lineHeight: 1.4 }}>
                      {render ? render(p) : p[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [reviewInputs, setReviewInputs] = useState({});
  const [compareList, setCompareList] = useState([]); // up to 3 products
  const [meta, setMeta] = useState({ page: 1, limit: 8, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: "", category: "", brand: "",
    minPrice: "", maxPrice: "", inStockOnly: false,
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadProducts = async (activeFilters = filters, page = 1) => {
    try {
      const params = {};
      if (activeFilters.search.trim()) params.search = activeFilters.search.trim();
      if (activeFilters.category.trim()) params.category = activeFilters.category.trim();
      if (activeFilters.brand.trim()) params.brand = activeFilters.brand.trim();
      if (activeFilters.minPrice !== "") params.minPrice = Number(activeFilters.minPrice);
      if (activeFilters.maxPrice !== "") params.maxPrice = Number(activeFilters.maxPrice);
      if (activeFilters.inStockOnly) params.availability = "in-stock";
      params.page = page;
      params.limit = meta.limit;
      const res = await api.get("/products", { params });
      setProducts(res.data.data.items);
      setMeta((prev) => ({
        ...prev,
        page: res.data.data.page || page,
        totalPages: res.data.data.totalPages || 1,
        total: res.data.data.total || 0,
      }));
      setError("");
    } catch {
      setError("Failed to load products");
    }
  };

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (user?.role === "customer") {
      api.get("/users/wishlist")
        .then((res) => setWishlist((res.data.data || []).map((p) => p._id)))
        .catch(() => {});
    } else {
      setWishlist([]);
    }
  }, [user]);

  const addToCart = async (productId) => {
    if (!user) return navigate("/login");
    if (user.role !== "customer") return alert("Only customer accounts can add to cart");
    try {
      await api.post("/cart", { productId, quantity: 1 });
      alert("Added to cart");
    } catch (err) {
      alert(err.response?.data?.message || "Please login as a customer");
    }
  };

  const toggleWishlist = async (productId) => {
    if (!user) return navigate("/login");
    if (user.role !== "customer") return alert("Only customer accounts can use wishlist");
    try {
      if (wishlist.includes(productId)) {
        await api.delete(`/users/wishlist/${productId}`);
        setWishlist((prev) => prev.filter((id) => id !== productId));
      } else {
        await api.post("/users/wishlist", { productId });
        setWishlist((prev) => [...prev, productId]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Wishlist update failed");
    }
  };

  const submitReview = async (productId) => {
    if (!user) return navigate("/login");
    if (user.role !== "customer") return alert("Only customer accounts can submit reviews");
    const review = reviewInputs[productId] || { rating: 5, comment: "" };
    try {
      await api.post(`/products/${productId}/reviews`, review);
      alert("Review submitted");
      loadProducts(filters, meta.page);
      setReviewInputs((prev) => ({ ...prev, [productId]: { rating: 5, comment: "" } }));
    } catch (err) {
      alert(err.response?.data?.message || "Review failed");
    }
  };

  // ── Compare logic ──────────────────────────────────────────────────────────
  const toggleCompare = (product) => {
    setCompareList((prev) => {
      const already = prev.some((p) => p._id === product._id);
      if (already) return prev.filter((p) => p._id !== product._id);
      if (prev.length >= 3) {
        alert("You can compare up to 3 products at a time.");
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeFromCompare = (id) => setCompareList((prev) => prev.filter((p) => p._id !== id));

  const applyFilters = () => loadProducts(filters, 1);
  const clearFilters = () => {
    const cleared = { search: "", category: "", brand: "", minPrice: "", maxPrice: "", inStockOnly: false };
    setFilters(cleared);
    loadProducts(cleared, 1);
  };
  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > meta.totalPages || nextPage === meta.page) return;
    loadProducts(filters, nextPage);
  };

  return (
    <section style={{ paddingBottom: compareList.length >= 2 ? "280px" : "0" }}>
      <h1>Beauty Store</h1>
      <p className="muted">Discover skincare, makeup, and haircare products.</p>

      {/* ── Filters ── */}
      <div className="filters">
        <div className="row">
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search by name, brand..."
          />
          <input
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="Category (e.g., Skincare)"
          />
          <input
            value={filters.brand}
            onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
            placeholder="Brand (e.g., Cosmic)"
          />
        </div>
        <div className="row">
          <input
            type="number" min={0}
            value={filters.minPrice}
            onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
            placeholder="Min price"
          />
          <input
            type="number" min={0}
            value={filters.maxPrice}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
            placeholder="Max price"
          />
          <label className="checkLabel">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, inStockOnly: e.target.checked }))}
            />
            In stock only
          </label>
          <button onClick={applyFilters}>Apply filters</button>
          <button type="button" className="mutedBtn" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {/* ── Compare tray indicator ── */}
      {compareList.length === 1 && (
        <p style={{ fontSize: "0.83rem", color: "#c2417a", margin: "0.5rem 0 1rem" }}>
          1 product selected — pick 1 or 2 more to compare
        </p>
      )}

      {/* ── Product Grid ── */}
      <div className="grid">
        {products.map((p) => (
          <article key={p._id} className="card">
            <img
              className="productImage"
              src={p.images?.[0] || PRODUCT_PLACEHOLDER}
              alt={p.name}
              loading="lazy"
              onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER; }}
            />
            <h3>{p.name}</h3>
            <p>{p.brand}</p>
            <CategoryBadge category={p.category} />
            <p className="price">LKR {p.discountPrice || p.price}</p>
            <p>{p.stockQty > 0 ? "✓ In Stock" : "✕ Out of Stock"}</p>
            <p>{"★".repeat(Math.round(p.averageRating || 0))} {p.averageRating || 0}/5</p>

            <div className="actionRow">
              <button onClick={() => addToCart(p._id)} disabled={p.stockQty <= 0}>
                {p.stockQty > 0 ? "Add to cart" : "Out of stock"}
              </button>
              <button onClick={() => toggleWishlist(p._id)}>
                {wishlist.includes(p._id) ? "♥ Saved" : "♡ Save"}
              </button>
            </div>

            {/* Compare checkbox */}
            {user?.role === "customer" && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={compareList.some((c) => c._id === p._id)}
                  onChange={() => toggleCompare(p)}
                />
                Compare
              </label>
            )}

            {user?.role === "customer" ? (
              <div className="reviewBox">
                <select
                  value={reviewInputs[p._id]?.rating ?? 5}
                  onChange={(e) =>
                    setReviewInputs((prev) => ({
                      ...prev,
                      [p._id]: { rating: Number(e.target.value), comment: prev[p._id]?.comment || "" },
                    }))
                  }
                >
                  <option value={5}>★★★★★</option>
                  <option value={4}>★★★★</option>
                  <option value={3}>★★★</option>
                  <option value={2}>★★</option>
                  <option value={1}>★</option>
                </select>
                <input
                  placeholder="Write a review..."
                  value={reviewInputs[p._id]?.comment || ""}
                  onChange={(e) =>
                    setReviewInputs((prev) => ({
                      ...prev,
                      [p._id]: { rating: prev[p._id]?.rating ?? 5, comment: e.target.value },
                    }))
                  }
                />
                <button onClick={() => submitReview(p._id)}>Submit review</button>
              </div>
            ) : (
              <div className="reviewBox">
                <p className="muted">Login as customer to leave a review.</p>
                <button type="button" className="mutedBtn" onClick={() => navigate("/login")}>
                  Login to review
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* ── Pagination ── */}
      <div className="paginationBar">
        <p className="muted">Showing {products.length} of {meta.total} products</p>
        <div className="actionRow">
          <button type="button" className="mutedBtn" disabled={meta.page <= 1} onClick={() => goToPage(meta.page - 1)}>
            ← Previous
          </button>
          <span className="pageIndicator">Page {meta.page} of {meta.totalPages}</span>
          <button type="button" className="mutedBtn" disabled={meta.page >= meta.totalPages} onClick={() => goToPage(meta.page + 1)}>
            Next →
          </button>
        </div>
      </div>

      {/* ── Recommendations ── */}
      <Recommendations
        allProducts={products}
        compareList={compareList}
        onAddToCart={addToCart}
        onToggleWishlist={toggleWishlist}
        wishlist={wishlist}
        onCompareToggle={toggleCompare}
      />

      {/* ── Compare panel (fixed bottom) ── */}
      <ComparePanel
        compareList={compareList}
        onRemove={removeFromCompare}
        onClear={() => setCompareList([])}
      />
    </section>
  );
}