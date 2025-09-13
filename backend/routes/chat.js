import express from "express";
import fetch from "node-fetch"; // npm i node-fetch
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const GEMINI_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// POST /api/chat
router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ reply: "Message is empty" });

    const body = {
      contents: [
        { parts: [{ text: userMessage }] }
      ]
    };

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.json({ reply: "⚠️ Could not get AI response" });
    }

    const aiReply = data.candidates[0].content.parts[0].text;
    res.json({ reply: aiReply });
  } catch (err) {
    console.error("Chat Error:", err);
    res.json({ reply: "⚠️ Could not get AI response" });
  }
});

export default router;
