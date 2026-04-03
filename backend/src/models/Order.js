import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true }
  },
  { _id: false }
);

const refundRequestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["full", "partial"], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    adminNote: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [itemSchema],
    shippingAddress: { type: Object, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending"
    },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
    paymentMethod: { type: String, enum: ["card", "cod", "paypal"], default: "card" },
    trackingNumber: String,
    carrier: String,
    subtotal: { type: Number, min: 0, required: true },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, required: true },
    refundRequest: refundRequestSchema,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
