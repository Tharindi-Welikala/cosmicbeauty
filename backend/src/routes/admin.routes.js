import express from "express";
import { allowRoles, protect } from "../middleware/auth.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const router = express.Router();
router.use(protect, allowRoles("admin"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalSalesAgg, totalOrders, newUsers, topProducts] = await Promise.all([
      Order.aggregate([{ $match: { paymentStatus: "Paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.countDocuments(),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
      }),
      Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.name", qty: { $sum: "$items.quantity" } } },
        { $sort: { qty: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalSales: totalSalesAgg[0]?.total || 0,
        totalOrders,
        newUsersLast30Days: newUsers,
        topProducts
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const p = Number(page);
    const l = Math.min(Number(limit), 50);
    const [items, total] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
      User.countDocuments()
    ]);
    res.json({ success: true, data: { items, page: p, limit: l, totalPages: Math.ceil(total / l), total } });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:id/status", async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!req.body.isActive }, { new: true }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found", errors: [] });
    return res.json({ success: true, message: "User updated", data: user });
  } catch (err) {
    return next(err);
  }
});

router.get("/reports/sales", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const report = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } }
    ]);
    const lowStock = await Product.find({ stockQty: { $lte: 5 }, isActive: true }).select("name stockQty brand category");
    res.json({ success: true, data: { summary: report[0] || { orders: 0, revenue: 0 }, lowStock } });
  } catch (err) {
    next(err);
  }
});

export default router;
