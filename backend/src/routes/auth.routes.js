import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const makeAccessToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });
const makeRefreshToken = (id) =>
  jwt.sign({ id, type: "refresh" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

// Helper: get the frontend base URL
// Uses CLIENT_URL env var if set, otherwise derives from the request's Origin header,
// otherwise falls back to localhost. This makes email links work from any device.
function getClientUrl(req) {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  const origin = req.headers.origin;
  if (origin) return origin;
  return "http://localhost:5173";
}

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required").isLength({ min: 2 }),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) {
        return res.status(409).json({ success: false, message: "Email already exists", errors: [] });
      }

      const hashed = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(24).toString("hex");

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashed,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });

      // FIX: use getClientUrl so the link works from mobile too
      const verifyUrl = `${getClientUrl(req)}/verify-email?token=${verificationToken}`;

      await sendEmail(
        user.email,
        "Verify your CosmicBeauty account",
        `<p>Hi ${user.name},</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`
      );

      return res.status(201).json({
        success: true,
        message: "Registered. Please verify your email.",
        data: { id: user._id },
      });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials", errors: [] });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ success: false, message: "Invalid credentials", errors: [] });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ success: false, message: "Please verify your email to login.", errors: [] });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: "User account is inactive", errors: [] });
      }

      const token = makeAccessToken(user._id);
      const refresh = makeRefreshToken(user._id);

      user.refreshTokens.push({
        token: refresh,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });

      await user.save();

      return res.json({
        success: true,
        message: "Logged in",
        data: {
          token,
          refreshToken: refresh,
          user: { id: user._id, name: user.name, email: user.email, role: user.role },
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

router.get("/me", protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.get("/verify/:token", async (req, res, next) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gte: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or already used."
      });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: "Email already verified. You can log in." });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (err) {
    return next(err);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.json({ success: true, message: "If the email exists, a reset link was sent." });

    const token = crypto.randomBytes(24).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    // FIX: use getClientUrl so reset link works from mobile
    const resetUrl = `${getClientUrl(req)}/reset-password?token=${token}`;
    await sendEmail(user.email, "Reset your password", `<p>Reset your password <a href="${resetUrl}">here</a>. This link expires in 30 minutes.</p>`);

    return res.json({ success: true, message: "Reset link sent if account exists" });
  } catch (err) {
    return next(err);
  }
});

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gte: new Date() },
      });

      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired token", errors: [] });
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetToken = undefined;
      user.resetTokenExpires = undefined;
      await user.save();

      return res.json({ success: true, message: "Password updated" });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  validate,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch {
        return res.status(401).json({ success: false, message: "Invalid refresh token", errors: [] });
      }

      if (decoded?.type !== "refresh") {
        return res.status(401).json({ success: false, message: "Invalid refresh token type", errors: [] });
      }

      const user = await User.findById(decoded.id);
      const stored = user?.refreshTokens?.find(
        (t) => t.token === refreshToken && t.expiresAt >= new Date()
      );

      if (!user || !stored) {
        return res.status(401).json({ success: false, message: "Refresh token not recognized", errors: [] });
      }

      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);

      const newRefresh = makeRefreshToken(user._id);
      user.refreshTokens.push({
        token: newRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await user.save();

      const access = makeAccessToken(user._id);
      return res.json({ success: true, data: { token: access, refreshToken: newRefresh } });
    } catch (err) {
      return next(err);
    }
  }
);

router.post("/logout", protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token: refreshToken } }
    });
    return res.json({ success: true, message: "Logged out" });
  } catch (err) {
    return next(err);
  }
});

export default router;