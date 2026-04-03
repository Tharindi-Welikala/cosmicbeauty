import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();
router.use(protect, allowRoles("customer"));

// ── Wishlist ──────────────────────────────────────────────────────────────────

router.get("/wishlist", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json({ success: true, data: user.wishlist });
  } catch (err) { next(err); }
});

router.post("/wishlist", async (req, res, next) => {
  try {
    const { productId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: productId } });
    res.json({ success: true, message: "Added to wishlist" });
  } catch (err) { next(err); }
});

router.delete("/wishlist/:productId", async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: req.params.productId } });
    res.json({ success: true, message: "Removed from wishlist" });
  } catch (err) { next(err); }
});

// ── Addresses ─────────────────────────────────────────────────────────────────

router.get("/addresses", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
});

router.post("/addresses", async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { addresses: req.body } },
      { new: true }
    ).select("addresses");
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
});

// NEW: update an existing address by its subdocument _id
router.put("/addresses/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    if (!user) return res.status(404).json({ success: false, message: "User not found", errors: [] });

    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ success: false, message: "Address not found", errors: [] });

    const { line1, city, state, postalCode, country } = req.body;
    if (line1 !== undefined) address.line1 = line1;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (country !== undefined) address.country = country;

    await user.save();
    res.json({ success: true, message: "Address updated", data: user.addresses });
  } catch (err) { next(err); }
});

// FIX: delete by subdocument _id, not array index
router.delete("/addresses/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    if (!user) return res.status(404).json({ success: false, message: "User not found", errors: [] });

    const before = user.addresses.length;
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);

    if (user.addresses.length === before) {
      return res.status(404).json({ success: false, message: "Address not found", errors: [] });
    }

    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
});

// ── Profile ───────────────────────────────────────────────────────────────────

router.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("name email phone paymentPreference");
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put("/profile", async (req, res, next) => {
  try {
    const { phone, paymentPreference } = req.body;
    const allowed = {};
    if (phone !== undefined) allowed.phone = phone;
    if (paymentPreference !== undefined) allowed.paymentPreference = paymentPreference;

    const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true })
      .select("name email phone paymentPreference");
    res.json({ success: true, message: "Profile updated", data: user });
  } catch (err) { next(err); }
});

export default router;