import express from "express";
import Product from "../models/Product.js";
import { allowRoles, protect } from "../middleware/auth.js";
import Order from "../models/Order.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { category, brand, minPrice, maxPrice, search, page = 1, limit = 12, availability } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (availability === "in-stock") filter.stockQty = { $gt: 0 };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const p = Number(page);
    const l = Math.min(Number(limit), 50);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, page: p, limit: l, totalPages: Math.ceil(total / l), total }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews.user", "name");
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found", errors: [] });
    }
    return res.json({ success: true, data: product });
  } catch (err) {
    return next(err);
  }
});

router.post("/", protect, allowRoles("admin"), async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: "Product created", data: product });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", protect, allowRoles("admin"), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found", errors: [] });
    return res.json({ success: true, message: "Product updated", data: product });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", protect, allowRoles("admin"), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found", errors: [] });
    return res.json({ success: true, message: "Product deactivated", data: product });
  } catch (err) {
    return next(err);
  }
});

// Add a review (purchase-gated, one per user per product)
router.post("/:id/reviews", protect, allowRoles("customer"), async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found", errors: [] });
    }
    // Check purchase history
    const hasPurchased = await Order.exists({
      user: req.user._id,
      "items.product": product._id,
      status: { $in: ["Confirmed", "Processing", "Shipped", "Delivered"] }
    });
    if (!hasPurchased) {
      return res.status(403).json({ success: false, message: "Only purchasers can review this product", errors: [] });
    }
    // Prevent duplicate review from same user
    const already = product.reviews.find((r) => r.user.toString() === req.user._id.toString());
    if (already) {
      return res.status(409).json({ success: false, message: "You have already reviewed this product", errors: [] });
    }
    product.reviews.push({ user: req.user._id, rating: Number(rating), comment });
    product.recalculateAverageRating();
    await product.save();
    return res.status(201).json({ success: true, message: "Review added", data: product });
  } catch (err) {
    return next(err);
  }
});

export default router;
