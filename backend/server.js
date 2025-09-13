import dotenv from "dotenv";
dotenv.config();
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import mongoose from "mongoose";
import cors from "cors";
import Message from "./models/Message.js";
import { fileURLToPath } from "url";

import messagesRoutes from "./routes/messages.js";
import chatRoutes from "./routes/chat.js";

console.log("Gemini Key:", process.env.GOOGLE_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("Gemini Key from env:", process.env.GOOGLE_API_KEY ? "✅ Found" : "❌ Missing");

const app = express();
const PORT = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
console.log("Raw env keys:", Object.keys(process.env));
console.log("Gemini Key actual value:", process.env.GOOGLE_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/chat", chatRoutes);
app.use("/api/messages", messagesRoutes);

mongoose.connect(
  "mongodb+srv://chemudupatileelavardhan_db_user:ammananna@cluster0.f8lyglc.mongodb.net/ai_chat?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Disk storage for multer ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// Max file size = 10GB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB
});

// ---- Helper: Extract text from files ----
async function extractTextFromFile(filePath, originalName) {
  let text = "";
  try {
    const ext = path.extname(originalName).toLowerCase();
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      if (pdfData.text.trim().length > 0) {
        text = pdfData.text;
      } else {
        console.log("Running OCR on scanned PDF:", originalName);
        const ocrResult = await Tesseract.recognize(filePath, "eng");
        text = ocrResult.data.text;
      }
    } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      const ocrResult = await Tesseract.recognize(filePath, "eng");
      text = ocrResult.data.text;
    } else {
      text = fs.readFileSync(filePath, "utf8");
    }
  } catch (err) {
    console.error("Error extracting text from file:", originalName, err);
    text = `⚠️ Could not extract text from ${originalName}`;
  }
  return `\n\n--- File: ${originalName} ---\n${text}`;
}

// ---- Chat API ----
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "No message provided" });

    // 1. Save user msg
    await Message.create({ sender: "user", text: message });

    // 2. Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    const aiReply = result?.response?.text?.() || "⚠️ Gemini gave no reply";

    // 3. Save AI reply
    await Message.create({ sender: "ai", text: aiReply });

    // 4. Send back to frontend
    res.json({ reply: aiReply });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ reply: "⚠️ Could not get AI response - " + err.message });
  }
});

// ---- File Upload API ----
app.post("/api/upload", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ reply: "No files uploaded" });

    let combinedText = "";
    for (const file of req.files) {
      combinedText += await extractTextFromFile(file.path, file.originalname);
      fs.unlinkSync(file.path); // cleanup temp
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyze these uploaded documents (normal or scanned) and summarize clearly:\n${combinedText}`;
    const result = await model.generateContent(prompt);

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("File Upload Error:", err);
    res.status(500).json({ reply: "⚠️ Could not analyze files" });
  }
});

// ---- Folder Upload API ----
app.post("/api/upload/folder", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ reply: "No folder files uploaded" });

    let combinedText = "";
    for (const file of req.files) {
      combinedText += await extractTextFromFile(file.path, file.originalname);
      fs.unlinkSync(file.path);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyze this folder of mixed documents (normal + scanned) and give insights:\n${combinedText}`;
    const result = await model.generateContent(prompt);

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Folder Upload Error:", err);
    res.status(500).json({ reply: "⚠️ Could not analyze folder" });
  }
});

// ---- Start server ----
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
