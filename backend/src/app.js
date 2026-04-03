import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import userRoutes from "./routes/user.routes.js";
import refundRoutes from "./routes/refund.routes.js";

const app = express();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("FATAL: Missing JWT secrets");
  process.exit(1);
}

app.use(helmet());

// FIX: accept requests from localhost AND any local network IP (for mobile testing)
// In dev, allow all origins. In production, lock to CLIENT_URL only.
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.CLIENT_URL]
  : true; // true = allow all origins in development

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "CosmicBeauty API up" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/refunds", refundRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found", errors: [] });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Server error",
    errors: err.errors || []
  });
});

export default app;