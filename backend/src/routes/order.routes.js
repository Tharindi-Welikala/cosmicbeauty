import express from "express";
import mongoose from "mongoose";
import { allowRoles, protect } from "../middleware/auth.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validate.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

router.use(protect);

// POST / — place a COD or direct card order
router.post(
  "/",
  allowRoles("customer"),
  [
    body("paymentMethod")
      .optional()
      .isIn(["card", "cod"])
      .withMessage("Invalid payment method"),
    body("addressId")
      .optional()
      .isMongoId()
      .withMessage("Invalid address ID"),
  ],
  validate,
  async (req, res, next) => {
    const session = await mongoose.startSession();
    let placedOrder = null;
    let orderUser = null;

    try {
      const { paymentMethod = "card", addressId } = req.body;

      await session.withTransaction(async () => {
        const user = await User.findById(req.user._id)
          .populate("cart.product")
          .session(session);

        if (!user.cart.length) {
          throw Object.assign(new Error("Cart is empty"), { status: 400 });
        }

        let shippingAddress;
        if (addressId) {
          const found = user.addresses.find(addr => addr._id.toString() === addressId);
          if (!found) throw Object.assign(new Error("Invalid shipping address"), { status: 400 });
          shippingAddress = found;
        } else {
          shippingAddress = user.addresses[0];
        }

        if (!shippingAddress || !shippingAddress.line1) {
          throw Object.assign(new Error("Please add a shipping address before checkout"), { status: 400 });
        }

        const items = [];
        let subtotal = 0;

        for (const item of user.cart) {
          const product = await Product.findById(item.product._id).session(session);
          if (!product || product.stockQty < item.quantity) {
            throw Object.assign(new Error(`Insufficient stock for ${item.product.name}`), { status: 409 });
          }
          product.stockQty -= item.quantity;
          await product.save({ session });
          items.push({ product: product._id, name: product.name, quantity: item.quantity, unitPrice: item.priceSnapshot });
          subtotal += item.quantity * item.priceSnapshot;
        }

        const order = await Order.create(
          [{ user: user._id, items, shippingAddress, subtotal, total: subtotal, paymentMethod, paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid", status: paymentMethod === "cod" ? "Pending" : "Confirmed" }],
          { session }
        );

        user.cart = [];
        await user.save({ session });

        placedOrder = order[0];
        orderUser = { name: user.name, email: user.email };

        res.status(201).json({ success: true, message: "Order placed", data: order[0] });
      });

      if (placedOrder && orderUser) {
        const itemsList = placedOrder.items.map(i => `<li>${i.name} × ${i.quantity} – LKR ${(i.unitPrice * i.quantity).toFixed(2)}</li>`).join("");
        await sendEmail(orderUser.email, "Your CosmicBeauty order is confirmed!", `<h2>Hi ${orderUser.name}, your order is confirmed!</h2><p><strong>Order ID:</strong> ${placedOrder._id}</p><ul>${itemsList}</ul><p><strong>Total: LKR ${placedOrder.total.toFixed(2)}</strong></p>`);
      }
    } catch (err) {
      next(err);
    } finally {
      session.endSession();
    }
  }
);

// GET / — list orders (MUST come before GET /:id to avoid route conflict)
router.get(
  "/",
  allowRoles("customer", "admin"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const filter = req.user.role === "admin" ? {} : { user: req.user._id };
      const p = Number(page);
      const l = Math.min(Number(limit), 50);

      const [items, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
        Order.countDocuments(filter),
      ]);

      res.json({ success: true, data: { items, page: p, limit: l, totalPages: Math.ceil(total / l), total } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /:id — single order (MUST come after GET / to avoid swallowing the list route)
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid order ID")],
  validate,
  async (req, res, next) => {
    try {
      const filter = req.user.role === "customer"
        ? { _id: req.params.id, user: req.user._id }
        : { _id: req.params.id };

      const order = await Order.findOne(filter).populate("user", "name email");
      if (!order) return res.status(404).json({ success: false, message: "Order not found", errors: [] });
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /:id/status — admin updates order status / tracking
router.put(
  "/:id/status",
  allowRoles("admin"),
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status").optional().isIn(["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"]).withMessage("Invalid order status"),
    body("trackingNumber").optional().isString(),
    body("carrier").optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status, trackingNumber, carrier } = req.body;
      const order = await Order.findByIdAndUpdate(req.params.id, { status, trackingNumber, carrier }, { new: true });
      if (!order) return res.status(404).json({ success: false, message: "Order not found", errors: [] });
      return res.json({ success: true, message: "Order updated", data: order });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /:id/cancel — customer cancels their own order
router.post(
  "/:id/cancel",
  allowRoles("customer"),
  [param("id").isMongoId().withMessage("Invalid order ID")],
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
      if (!order) return res.status(404).json({ success: false, message: "Order not found", errors: [] });
      if (["Shipped", "Delivered"].includes(order.status)) {
        return res.status(400).json({ success: false, message: "Order cannot be cancelled now", errors: [] });
      }
      order.status = "Cancelled";
      await order.save();
      return res.json({ success: true, message: "Order cancelled", data: order });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;