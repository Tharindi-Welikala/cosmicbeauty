import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    skinType: { type: String, default: "all" },
    description: { type: String, required: true },
    ingredients: [String],
    images: [String],
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    stockQty: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    isActive: { type: Boolean, default: true },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: [reviewSchema]
  },
  { timestamps: true }
);

productSchema.index({ name: "text", brand: "text", description: "text" });

productSchema.methods.recalculateAverageRating = function () {
  if (!this.reviews?.length) {
    this.averageRating = 0;
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10;
  }
};

export default mongoose.model("Product", productSchema);
