import { useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CartPage from "./pages/CartPage";
import AdminPage from "./pages/AdminPage";
import SupportPage from "./pages/SupportPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AddressPage from "./pages/AddressPage";
import ProfilePage from "./pages/ProfilePage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import RefundRequestPage from "./pages/RefundRequestPage";

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <p className="container">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div>
      <header className="header">
        <nav className="container nav">
          <Link to="/" className="brand" onClick={closeMenu}>
            cosmicbeauty
          </Link>
          <button
            type="button"
            className={`navToggle ${menuOpen ? "open" : ""}`}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`links ${menuOpen ? "open" : ""}`}>
            <Link to="/" onClick={closeMenu}>Products</Link>
            {user && (
              <Link to="/cart" onClick={closeMenu}>Cart</Link>
            )}
            {user && (
              <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
            )}
            {user?.role === "customer" && (
              <Link to="/addresses" onClick={closeMenu}>Addresses</Link>
            )}
            {user?.role === "customer" && (
              <Link to="/profile" onClick={closeMenu}>Profile</Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" onClick={closeMenu}>Admin</Link>
            )}
            {user?.role === "support" && (
              <Link to="/support" onClick={closeMenu}>Support</Link>
            )}
            {!user ? (
              <Link to="/login" onClick={closeMenu}>Login</Link>
            ) : (
              <button onClick={() => { closeMenu(); logout(); }}>
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/dashboard"
            element={
              <Protected roles={["customer", "admin", "support"]}>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="/cart"
            element={
              <Protected roles={["customer"]}>
                <CartPage />
              </Protected>
            }
          />
          <Route
            path="/addresses"
            element={
              <Protected roles={["customer"]}>
                <AddressPage />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected roles={["customer"]}>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected roles={["admin"]}>
                <AdminPage />
              </Protected>
            }
          />
          <Route
            path="/support"
            element={
              <Protected roles={["support", "admin"]}>
                <SupportPage />
              </Protected>
            }
          />
          <Route
            path="/track/:orderId"
            element={
              <Protected roles={["customer", "admin", "support"]}>
                <OrderTrackingPage />
              </Protected>
            }
          />
          <Route
            path="/refund/:orderId"
            element={
              <Protected roles={["customer"]}>
                <RefundRequestPage />
              </Protected>
            }
          />
        </Routes>
      </main>
    </div>
  );
}