import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // "user" or "ai"
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Duplicate model register ayyaka error rakunda chesam
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
