import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "Sri Lanka" }
  }
  // NOTE: _id: false intentionally removed — we NEED the auto-generated _id
  // so that payment/order routes can find the selected address by addr._id.toString()
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin", "support"], default: "customer" },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    refreshTokens: [{ token: String, expiresAt: Date }],
    phone: String,
    addresses: [addressSchema],
    paymentPreference: { type: String, default: "card" },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, min: 1, default: 1 },
        priceSnapshot: { type: Number, required: true }
      }
    ],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);