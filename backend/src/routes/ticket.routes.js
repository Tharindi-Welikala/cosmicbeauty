import express from "express";
import { allowRoles, protect } from "../middleware/auth.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import { body, param } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();
router.use(protect);

/* Create a new ticket */
router.post(
  "/",
  allowRoles("customer"),
  [
    body("type")
      .notEmpty().withMessage("Type is required")
      // FIX: match the Ticket model enum exactly
      .isIn(["inquiry", "complaint", "return", "feedback"])
      .withMessage("Invalid ticket type"),

    body("subject")
      .notEmpty().withMessage("Subject is required")
      .isLength({ min: 3, max: 100 })
      .withMessage("Subject must be 3–100 characters"),

    body("message")
      .notEmpty().withMessage("Message is required")
      .isLength({ min: 5 })
      .withMessage("Message must be at least 5 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { type, subject, message } = req.body;

      const ticket = await Ticket.create({
        customer: req.user._id,
        type,
        subject,
        messages: [{ by: req.user._id, text: message }],
      });

      res.status(201).json({
        success: true,
        message: "Ticket created",
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", allowRoles("customer", "support", "admin"), async (req, res, next) => {
  try {
    const filter = req.user.role === "customer" ? { customer: req.user._id } : {};
    const tickets = await Ticket.find(filter).populate("customer", "name email").sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

/* Reply to a ticket — also emails the customer */
router.post(
  "/:id/reply",
  allowRoles("support", "admin"),
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid ticket ID"),

    body("message")
      .notEmpty().withMessage("Reply message is required")
      .isLength({ min: 2 })
      .withMessage("Reply must be at least 2 characters"),

    body("status")
      .optional()
      // FIX: match the Ticket model status enum
      .isIn(["open", "in_progress", "closed"])
      .withMessage("Invalid status"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const ticket = await Ticket.findById(req.params.id).populate("customer", "name email");

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
          errors: [],
        });
      }

      ticket.messages.push({
        by: req.user._id,
        text: req.body.message,
      });

      const previousStatus = ticket.status;

      if (req.body.status) {
        ticket.status = req.body.status;
      }

      await ticket.save();

      // FIX: notify customer by email when support replies or status changes
      if (ticket.customer?.email) {
        const statusChanged = req.body.status && req.body.status !== previousStatus;
        const subject = statusChanged
          ? `Your CosmicBeauty support ticket status changed to: ${ticket.status}`
          : `New reply on your CosmicBeauty support ticket`;

        await sendEmail(
          ticket.customer.email,
          subject,
          `
            <h3>Hi ${ticket.customer.name},</h3>
            <p>Your support ticket "<strong>${ticket.subject}</strong>" has received an update.</p>
            <p><strong>Reply:</strong> ${req.body.message}</p>
            ${statusChanged ? `<p><strong>New status:</strong> ${ticket.status}</p>` : ""}
            <p>Log in to <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard">your dashboard</a> to view the full conversation.</p>
          `
        );
      }

      return res.json({
        success: true,
        message: "Reply sent",
        data: ticket,
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;