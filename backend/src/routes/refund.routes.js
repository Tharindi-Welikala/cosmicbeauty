import express from "express";
import mongoose from "mongoose";
import { allowRoles, protect } from "../middleware/auth.js";
import Order from "../models/Order.js";
import { sendEmail } from "../utils/email.js";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();
router.use(protect);

// Request a refund
router.post(
  "/request/:orderId",
  allowRoles("customer"),
  [
    param("orderId").isMongoId().withMessage("Invalid order ID"),
    body("reason")
      .notEmpty().withMessage("Reason is required")
      .isLength({ min: 10, max: 500 })
      .withMessage("Reason must be 10-500 characters"),
    body("refundType")
      .isIn(["full", "partial"])
      .withMessage("Refund type must be full or partial"),
    body("refundAmount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Refund amount must be greater than 0"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { reason, refundType, refundAmount } = req.body;
      const { orderId } = req.params;

      const order = await Order.findOne({ _id: orderId, user: req.user._id });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found", errors: [] });
      }

      if (!["Delivered", "Shipped"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Order must be delivered or shipped to request refund",
          errors: [],
        });
      }

      if (order.refundRequest) {
        return res.status(400).json({
          success: false,
          message: "Refund already requested for this order",
          errors: [],
        });
      }

      if (refundType === "partial") {
        if (!refundAmount || refundAmount >= order.total) {
          return res.status(400).json({
            success: false,
            message: "Invalid refund amount for partial refund",
            errors: [],
          });
        }
      }

      order.refundRequest = {
        type: refundType,
        amount: refundType === "full" ? order.total : refundAmount,
        reason,
        status: "pending",
        requestedAt: new Date(),
      };

      await order.save();

      await sendEmail(
        process.env.ADMIN_EMAIL || "admin@cosmicbeauty.local",
        `New Refund Request - Order ${order._id}`,
        `
          <h2>New Refund Request</h2>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Customer:</strong> ${req.user.name} (${req.user.email})</p>
          <p><strong>Refund Type:</strong> ${refundType}</p>
          <p><strong>Refund Amount:</strong> $${refundType === "full" ? order.total : refundAmount}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Order Status:</strong> ${order.status}</p>
          <p>Please review this request in the admin panel.</p>
        `
      );

      res.status(201).json({
        success: true,
        message: "Refund request submitted successfully",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get refund requests (admin only)
router.get(
  "/",
  allowRoles("admin"),
  [
    query("status").optional().isIn(["pending", "approved", "rejected"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      // FIX: always filter to orders that HAVE a refundRequest, then optionally filter by status
      const filter = { refundRequest: { $exists: true } };
      if (status) filter["refundRequest.status"] = status;

      const p = Number(page);
      const l = Math.min(Number(limit), 50);

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("user", "name email")
          .sort({ "refundRequest.requestedAt": -1 })
          .skip((p - 1) * l)
          .limit(l),
        Order.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          items: orders,
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l),
          total,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Process refund (approve/reject)
router.put(
  "/:orderId/process",
  allowRoles("admin"),
  [
    param("orderId").isMongoId().withMessage("Invalid order ID"),
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be approve or reject"),
    body("adminNote")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Admin note must be less than 500 characters"),
  ],
  validate,
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const { action, adminNote } = req.body;
      const { orderId } = req.params;

      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).populate("user", "name email").session(session);

        if (!order || !order.refundRequest) {
          throw Object.assign(new Error("Refund request not found"), { status: 404 });
        }

        if (order.refundRequest.status !== "pending") {
          throw Object.assign(new Error("Refund request already processed"), { status: 400 });
        }

        order.refundRequest.status = action === "approve" ? "approved" : "rejected";
        order.refundRequest.processedAt = new Date();
        order.refundRequest.adminNote = adminNote;

        if (action === "approve") {
          order.status = "Returned";
          order.paymentStatus = "Refunded";
        }

        await order.save({ session });

        await sendEmail(
          order.user.email,
          `Refund Request ${action === "approve" ? "Approved" : "Rejected"} - Order ${order._id}`,
          `
            <h2>Refund Request ${action === "approve" ? "Approved" : "Rejected"}</h2>
            <p>Hi ${order.user.name},</p>
            <p>Your refund request for order <strong>${order._id}</strong> has been <strong>${action === "approve" ? "approved" : "rejected"}</strong>.</p>
            <p><strong>Refund Amount:</strong> $${order.refundRequest.amount}</p>
            <p><strong>Reason:</strong> ${order.refundRequest.reason}</p>
            ${adminNote ? `<p><strong>Admin Note:</strong> ${adminNote}</p>` : ""}
            ${action === "approve"
              ? "<p>The refund will be processed within 5-7 business days.</p>"
              : "<p>If you have any questions, please contact our support team.</p>"
            }
            <p>Thank you for your patience.</p>
          `
        );

        res.json({
          success: true,
          message: `Refund request ${action}d successfully`,
          data: order,
        });
      });
    } catch (err) {
      next(err);
    } finally {
      session.endSession();
    }
  }
);

export default router;