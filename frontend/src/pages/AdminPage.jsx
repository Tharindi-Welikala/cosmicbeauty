import { useEffect, useState } from "react";
import { api } from "../api";
import { DollarSign, Package, Users, TrendingUp, AlertTriangle, TrendingDown, Edit, Plus, Trash2 } from "lucide-react";

const EMPTY_PRODUCT = {
  name: "", brand: "", category: "", price: "",
  stockQty: "", description: "", sku: "",
};

// ── Section components defined OUTSIDE AdminPage ──────────────────────────────
// Defining them inside AdminPage causes React to recreate the component type on
// every render, fully unmounting and remounting them — resetting any typed input.

function SalesReportSection({ report, salesFilter, setSalesFilter, loadSales }) {
  return (
    <div>
      <h3 style={{ marginTop: "2rem" }}><TrendingUp size={18} style={{ marginRight: "0.5rem" }} />Sales Report</h3>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.85rem" }}>
          From&nbsp;
          <input
            type="date"
            value={salesFilter.from}
            onChange={(e) => setSalesFilter((f) => ({ ...f, from: e.target.value }))}
            style={{ marginLeft: "4px" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem" }}>
          To&nbsp;
          <input
            type="date"
            value={salesFilter.to}
            onChange={(e) => setSalesFilter((f) => ({ ...f, to: e.target.value }))}
            style={{ marginLeft: "4px" }}
          />
        </label>
        <button onClick={() => loadSales(salesFilter.from, salesFilter.to)}>Apply</button>
        <button className="mutedBtn" onClick={() => { setSalesFilter({ from: "", to: "" }); loadSales(); }}>Clear</button>
      </div>
      {report && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div className="kpiCard" style={{ minWidth: 160 }}>
            <div className="kpiLabel">Revenue</div>
            <div className="kpiValue">LKR {report.summary?.revenue?.toFixed(2) ?? 0}</div>
          </div>
          <div className="kpiCard" style={{ minWidth: 160 }}>
            <div className="kpiLabel">Orders</div>
            <div className="kpiValue">{report.summary?.orders ?? 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function LowStockSection({ report }) {
  return (
    <div>
      {report && (
        <>
          <h3 style={{ marginTop: "0.5rem" }}><AlertTriangle size={18} style={{ marginRight: "0.5rem" }} />Low Stock Alerts</h3>
          {report.lowStock.length === 0 ? (
            <p className="muted">No low stock items.</p>
          ) : (
            <div className="grid">
              {report.lowStock.map((p) => (
                <article className="kpiCard" key={p._id}>
                  <div className="kpiIcon kpiIcon-stock"><TrendingDown size={20} /></div>
                  <div>
                    <div className="kpiLabel">Low Stock</div>
                    <div className="kpiValue" style={{ fontSize: "1rem" }}>{p.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#c2417a", fontWeight: 600 }}>{p.stockQty} remaining</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductsSection({ products, productForm, setProductForm, editingProduct, saveProduct, cancelEdit, startEdit, deleteProduct }) {
  return (
    <div>
      <h3 id="product-form" style={{ marginTop: "2rem" }}>
        {editingProduct
          ? <><Edit size={18} style={{ marginRight: "0.5rem" }} />Edit Product</>
          : <><Plus size={18} style={{ marginRight: "0.5rem" }} />Add Product</>}
      </h3>
      <div className="form">
        {[
          { key: "name", label: "Name" },
          { key: "brand", label: "Brand" },
          { key: "category", label: "Category" },
          { key: "sku", label: "SKU" },
        ].map(({ key, label }) => (
          <input
            key={key}
            placeholder={label}
            value={productForm[key]}
            onChange={(e) => setProductForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        ))}
        <input placeholder="Price" type="number" min="0" value={productForm.price}
          onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))} />
        <input placeholder="Stock Qty" type="number" min="0" value={productForm.stockQty}
          onChange={(e) => setProductForm((f) => ({ ...f, stockQty: e.target.value }))} />
        <textarea placeholder="Description" value={productForm.description}
          onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={saveProduct}>{editingProduct ? "Update Product" : "Add Product"}</button>
          {editingProduct && <button onClick={cancelEdit} className="mutedBtn">Cancel</button>}
        </div>
      </div>

      <h3 style={{ marginTop: "2rem" }}><Package size={18} style={{ marginRight: "0.5rem" }} />Products</h3>
      <div className="grid">
        {products.map((p) => (
          <article key={p._id} className="kpiCard">
            <div>
              <strong>{p.name}</strong>
              <div className="muted">{p.brand}</div>
              <div>LKR {p.price}</div>
              <div style={{ fontSize: "0.8rem" }}>Stock: {p.stockQty}</div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
              <button onClick={() => startEdit(p)} style={{ fontSize: "0.82rem" }}>Edit</button>
              <button onClick={() => deleteProduct(p._id)} className="mutedBtn" style={{ fontSize: "0.82rem" }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function UsersSection({ users, usersLoaded, loadUsers, toggleUserStatus }) {
  return (
    <div>
      <h3 style={{ marginTop: "2rem" }}><Users size={18} style={{ marginRight: "0.5rem" }} />User Management</h3>
      {!usersLoaded ? (
        <button onClick={loadUsers}>Load Users</button>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f8f0f4", textAlign: "left" }}>
                <th style={{ padding: "8px 12px" }}>Name</th>
                <th style={{ padding: "8px 12px" }}>Email</th>
                <th style={{ padding: "8px 12px" }}>Role</th>
                <th style={{ padding: "8px 12px" }}>Status</th>
                <th style={{ padding: "8px 12px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderBottom: "1px solid #f0e0e8" }}>
                  <td style={{ padding: "8px 12px" }}>{u.name}</td>
                  <td style={{ padding: "8px 12px" }}>{u.email}</td>
                  <td style={{ padding: "8px 12px" }}>{u.role}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      background: u.isActive ? "#d4edda" : "#f8d7da",
                      color: u.isActive ? "#155724" : "#721c24",
                      padding: "2px 8px", borderRadius: "999px", fontWeight: 600, fontSize: "0.78rem"
                    }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      onClick={() => toggleUserStatus(u._id, u.isActive)}
                      className={u.isActive ? "mutedBtn" : ""}
                      style={{ fontSize: "0.78rem" }}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [kpi, setKpi] = useState(null);
  const [report, setReport] = useState(null);
  const [salesFilter, setSalesFilter] = useState({ from: "", to: "" });
  const [activeSection, setActiveSection] = useState(null);

  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingProduct, setEditingProduct] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => setKpi(res.data.data)).catch(() => {});
    loadSales();
    loadProducts();
  }, []);

  const loadSales = async (from, to) => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get("/admin/reports/sales", { params });
      setReport(res.data.data);
    } catch {}
  };

  const loadProducts = async () => {
    try {
      const res = await api.get("/products?limit=50");
      setProducts(res.data.data.items);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data.items);
      setUsersLoaded(true);
    } catch {}
  };

  const startEdit = (p) => {
    setEditingProduct(p._id);
    setProductForm({ name: p.name, brand: p.brand, category: p.category, price: p.price, stockQty: p.stockQty, description: p.description, sku: p.sku });
    setActiveSection("products");
    setTimeout(() => document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const cancelEdit = () => { setEditingProduct(null); setProductForm(EMPTY_PRODUCT); };

  const saveProduct = async () => {
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct}`, productForm);
      } else {
        await api.post("/products", productForm);
      }
      setEditingProduct(null);
      setProductForm(EMPTY_PRODUCT);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save product");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await api.put(`/admin/users/${id}/status`, { isActive: !currentStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  const navigationCards = [
    { id: "sales", title: "Sales Report", icon: <TrendingUp size={24} />, description: "View detailed sales analytics and reports", color: "#3b82f6" },
    { id: "stock", title: "Low Stock Alerts", icon: <AlertTriangle size={24} />, description: "Monitor products with low inventory", color: "#f59e0b" },
    { id: "products", title: "Product Management", icon: <Package size={24} />, description: "Add, edit, and manage products", color: "#10b981" },
    { id: "users", title: "User Management", icon: <Users size={24} />, description: "Manage user accounts and permissions", color: "#8b5cf6" },
  ];

  return (
    <section>
      <h2>Admin Dashboard</h2>

      {kpi && (
        <div className="grid">
          <article className="kpiCard">
            <div className="kpiIcon kpiIcon-sales"><DollarSign size={24} /></div>
            <div><div className="kpiLabel">Total Sales</div><div className="kpiValue">LKR {kpi.totalSales}</div></div>
          </article>
          <article className="kpiCard">
            <div className="kpiIcon kpiIcon-orders"><Package size={24} /></div>
            <div><div className="kpiLabel">Total Orders</div><div className="kpiValue">{kpi.totalOrders}</div></div>
          </article>
          <article className="kpiCard">
            <div className="kpiIcon kpiIcon-users"><Users size={24} /></div>
            <div><div className="kpiLabel">New Users (30d)</div><div className="kpiValue">{kpi.newUsersLast30Days}</div></div>
          </article>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {navigationCards.map((card) => (
            <article
              key={card.id}
              className="card"
              style={{ cursor: "pointer", transition: "all 0.3s ease", border: activeSection === card.id ? "2px solid #c2417a" : "1px solid #e5e7eb", background: activeSection === card.id ? "#fdf8fa" : "white" }}
              onClick={() => setActiveSection(activeSection === card.id ? null : card.id)}
              onMouseEnter={(e) => { if (activeSection !== card.id) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
              onMouseLeave={(e) => { if (activeSection !== card.id) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; } }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `${card.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: "1rem" }}>
                  <div style={{ color: card.color }}>{card.icon}</div>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1f2937" }}>{card.title}</h3>
              </div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", lineHeight: "1.4" }}>{card.description}</p>
              <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: card.color, fontWeight: 600 }}>
                {activeSection === card.id ? "Click to collapse" : "Click to expand"}
              </div>
            </article>
          ))}
        </div>
      </div>

      {activeSection === "sales" && <SalesReportSection report={report} salesFilter={salesFilter} setSalesFilter={setSalesFilter} loadSales={loadSales} />}
      {activeSection === "stock" && <LowStockSection report={report} />}
      {activeSection === "products" && <ProductsSection products={products} productForm={productForm} setProductForm={setProductForm} editingProduct={editingProduct} saveProduct={saveProduct} cancelEdit={cancelEdit} startEdit={startEdit} deleteProduct={deleteProduct} />}
      {activeSection === "users" && <UsersSection users={users} usersLoaded={usersLoaded} loadUsers={loadUsers} toggleUserStatus={toggleUserStatus} />}
    </section>
  );
}