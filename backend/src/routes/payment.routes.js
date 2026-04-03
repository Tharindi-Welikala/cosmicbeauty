import express from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import { protect, allowRoles } from "../middleware/auth.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { sendEmail } from "../utils/email.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();

if (!process.env.STRIPE_SECRET) {
  throw new Error("STRIPE_SECRET not set");
}
const stripe = new Stripe(process.env.STRIPE_SECRET);

router.use(protect);

// POST /create-intent — create Stripe PaymentIntent and a Pending order
router.post(
  "/create-intent",
  allowRoles("customer"),
  [
    body("addressId").optional().isMongoId().withMessage("Invalid address ID"),
  ],
  validate,
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      let responseData;

      await session.withTransaction(async () => {
        const user = await User.findById(req.user._id).populate("cart.product").session(session);

        if (!user.cart.length) {
          throw Object.assign(new Error("Cart is empty"), { status: 400 });
        }

        // Resolve shipping address — prefer the one the user selected in CartPage
        let shippingAddress;
        if (req.body.addressId) {
          const found = user.addresses.find(addr => addr._id.toString() === req.body.addressId);
          if (!found) throw Object.assign(new Error("Invalid shipping address"), { status: 400 });
          shippingAddress = found;
        } else {
          shippingAddress = user.addresses[0];
        }

        if (!shippingAddress || !shippingAddress.line1) {
          throw Object.assign(new Error("Please add a shipping address before checkout"), { status: 400 });
        }

        let subtotal = 0;
        const items = user.cart.map((c) => {
          subtotal += c.quantity * c.priceSnapshot;
          return { product: c.product._id, name: c.product.name, quantity: c.quantity, unitPrice: c.priceSnapshot };
        });

        const amountCents = Math.round(subtotal * 100);
        const currency = process.env.CURRENCY || "usd";

        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency,
          metadata: { userId: String(user._id) },
        });

        const order = await Order.create(
          [{ user: user._id, items, shippingAddress, subtotal, total: subtotal, paymentMethod: "card", paymentStatus: "Pending", status: "Pending" }],
          { session }
        );

        // Do NOT clear cart here — wait for /confirm
        responseData = {
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
          orderId: order[0]._id,
        };
      });

      return res.status(201).json({ success: true, data: responseData });
    } catch (err) {
      next(err);
    } finally {
      session.endSession();
    }
  }
);

// POST /confirm — verify Stripe payment succeeded and mark order as Paid
router.post(
  "/confirm",
  allowRoles("customer", "admin"),
  [
    body("orderId").isMongoId().withMessage("Invalid order ID"),
    body("paymentIntentId").notEmpty().withMessage("Payment intent required"),
  ],
  validate,
  async (req, res, next) => {
    const session = await mongoose.startSession();
    let confirmedOrder = null;
    let orderUser = null;

    try {
      const { orderId, paymentIntentId } = req.body;

      await session.withTransaction(async () => {
        const filter = req.user.role === "admin"
          ? { _id: orderId }
          : { _id: orderId, user: req.user._id };

        const order = await Order.findOne(filter).session(session);
        if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

        // Already paid — idempotent return
        if (order.paymentStatus === "Paid") {
          confirmedOrder = order;
          orderUser = await User.findById(order.user).select("name email").session(session);
          return;
        }

        // Verify with Stripe that the payment actually succeeded
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== "succeeded") {
          throw Object.assign(new Error(`Payment not completed (status: ${intent.status})`), { status: 402 });
        }

        // Decrement stock
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product || product.stockQty < item.quantity) {
            throw Object.assign(new Error(`Insufficient stock for ${item.name}`), { status: 409 });
          }
          product.stockQty -= item.quantity;
          await product.save({ session });
        }

        order.paymentStatus = "Paid";
        order.status = "Confirmed";
        await order.save({ session });

        await User.findByIdAndUpdate(order.user, { cart: [] }, { session });

        confirmedOrder = order;
        orderUser = await User.findById(order.user).select("name email").session(session);
      });

      // Send confirmation email outside the transaction
      if (confirmedOrder && orderUser) {
        const itemsList = confirmedOrder.items.map(i => `<li>${i.name} × ${i.quantity} – LKR ${(i.unitPrice * i.quantity).toFixed(2)}</li>`).join("");
        await sendEmail(
          orderUser.email,
          "Your CosmicBeauty order is confirmed!",
          `<h2>Hi ${orderUser.name}, your order is confirmed!</h2><p><strong>Order ID:</strong> ${confirmedOrder._id}</p><ul>${itemsList}</ul><p><strong>Total: LKR ${confirmedOrder.total.toFixed(2)}</strong></p><p>We'll notify you when your order ships.</p>`
        );
      }

      return res.json({ success: true, message: "Payment confirmed", data: confirmedOrder });
    } catch (err) {
      next(err);
    } finally {
      session.endSession();
    }
  }
);

export default router;