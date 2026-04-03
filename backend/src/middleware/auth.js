import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized", errors: [] });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found", errors: [] });
    }

    // FIX: check both emailVerified AND isActive
    if (!user.emailVerified) {
      return res.status(401).json({ success: false, message: "Email not verified", errors: [] });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account has been deactivated", errors: [] });
    }

    req.user = user;
    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, message: "Invalid token", errors: [] });
  }
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden", errors: [] });
  }
  return next();
};