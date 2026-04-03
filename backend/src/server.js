// server.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cosmicbeauty";

// Check required JWT secrets
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set");
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down gracefully...");
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0);
        });
      });
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });