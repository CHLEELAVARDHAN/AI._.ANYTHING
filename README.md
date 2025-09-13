# Advance AI & Mood Analyzer

An advanced AI-powered assistant project with **real-time chat, mood detection, and file analysis** features.  
Built using **React (frontend), Node.js/Express (backend), MongoDB (database), and Google Gemini API (AI)**.

---

## 🚀 Features
- 🤖 **AI Chat** – Context-based conversations powered by Gemini AI.  
- 📜 **Chat History** – Stores and retrieves past messages from MongoDB.  
- 🎭 **Mood Detection** – Detects user mood (happy, sad, neutral) via webcam and adapts responses.  
- 📂 **File Analyzer** – Upload text, PDFs, images, or scanned docs for automatic summarization & insights.  
- 📁 **Folder Upload** – Analyze multiple files at once, and can upload upto 10gb files 
- 🔒 **Secure Storage** – Uses `.env` for API keys & DB credentials.  
- 🎨 **Frontend UI** – Clean React interface with toggle for showing/hiding past data.

---

## 🛠️ Tech Stack
- **Frontend**: React, TailwindCSS  
- **Backend**: Node.js, Express  
- **Database**: MongoDB Atlas  
- **AI Model**: Google Gemini API (Generative AI)  
- **Extras**: Multer (file upload), Tesseract.js (OCR for scanned docs), pdf-parse  

---

## ⚙️ Installation

1️⃣Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/AI-Chat-Mood-Analyzer.git
cd AI-Chat-Mood-Analyzer

2️⃣Install_Dependencies

Backend:

cd backend
npm install


Frontend:

cd frontend
npm install

3️⃣Setup_Environment_Variables:

Create".env"_in_backend:

PORT=5000
MONGO_URI=your_mongodb_uri
GOOGLE_API_KEY=your_gemini_api_key


Create .env in frontend if needed:

REACT_APP_BACKEND_URL=http://localhost:5000

4️⃣Run_the_App

Backend:

cd backend
npm start


Frontend:

cd frontend
npm start