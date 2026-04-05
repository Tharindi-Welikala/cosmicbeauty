import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const password = await bcrypt.hash("admin123", 10);

  await User.findOneAndUpdate(
    { email: "admin@cosmicbeauty.com" },
    {
      name: "Admin",
      email: "admin@cosmicbeauty.com",
      password,
      role: "admin",
      emailVerified: true,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: "support@cosmicbeauty.com" },
    {
      name: "Support Staff",
      email: "support@cosmicbeauty.com",
      password,
      role: "support",
      emailVerified: true,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  console.log("Admin and support accounts seeded");
  console.log("  admin@cosmicbeauty.com / admin123");
  console.log("  support@cosmicbeauty.com / admin123");
  process.exit();
}

seed().catch(console.error);