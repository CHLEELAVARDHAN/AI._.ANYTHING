import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Save message manually (if needed)
router.post("/", async (req, res) => {
  try {
    const { sender, text } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ error: "Sender and text are required" });
    }

    const newMessage = new Message({ sender, text });
    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all past messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 }); // oldest → latest
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
