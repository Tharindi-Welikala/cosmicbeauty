import express from "express";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { body, param } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

// GET CART
router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.product");

    const subtotal = user.cart.reduce(
      (acc, item) => acc + item.priceSnapshot * item.quantity,
      0
    );

    res.json({
      success: true,
      data: {
        items: user.cart,
        subtotal,
        discount: 0,
        total: subtotal,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ADD TO CART
router.post(
  "/",
  [
    body("productId")
      .notEmpty().withMessage("Product ID is required")
      .isMongoId().withMessage("Invalid product ID"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId, quantity = 1 } = req.body;

      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: "Product not found", errors: [] });
      }

      const user = await User.findById(req.user._id);
      const existing = user.cart.find((c) => c.product.toString() === productId);

      if (existing) {
        existing.quantity += Number(quantity);
      } else {
        user.cart.push({
          product: product._id,
          quantity: Number(quantity),
          priceSnapshot: product.discountPrice || product.price,
        });
      }

      await user.save();
      return res.json({ success: true, message: "Cart updated" });
    } catch (err) {
      return next(err);
    }
  }
);

// UPDATE QUANTITY — identified by MongoDB subdocument _id
router.put(
  "/:itemId",
  [
    param("itemId").isMongoId().withMessage("Invalid cart item ID"),
    body("quantity")
      .notEmpty().withMessage("Quantity is required")
      .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { quantity } = req.body;
      const user = await User.findById(req.user._id);
      const item = user.cart.id(req.params.itemId);

      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found", errors: [] });
      }

      item.quantity = Number(quantity);
      await user.save();

      return res.json({ success: true, message: "Quantity updated" });
    } catch (err) {
      return next(err);
    }
  }
);

// REMOVE ITEM — identified by MongoDB subdocument _id
router.delete(
  "/:itemId",
  [
    param("itemId").isMongoId().withMessage("Invalid cart item ID"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      const before = user.cart.length;
      user.cart = user.cart.filter((c) => c._id.toString() !== req.params.itemId);

      if (user.cart.length === before) {
        return res.status(404).json({ success: false, message: "Item not found", errors: [] });
      }

      await user.save();
      return res.json({ success: true, message: "Item removed from cart" });
    } catch (err) {
      return next(err);
    }
  }
);

// CLEAR CART
router.delete("/", async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { cart: [] });
    return res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    return next(err);
  }
});

export default router;