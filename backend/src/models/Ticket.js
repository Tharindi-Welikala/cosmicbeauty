import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["inquiry", "complaint", "return", "feedback"], required: true },
    subject: { type: String, required: true, trim: true },
    status: { type: String, enum: ["open", "in_progress", "closed"], default: "open" },
    messages: [messageSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
