import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import VisionAI from "./VisionAI";
import CosmicBG from "./assets/backgrounds/edge-galaxy.mp4";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [visionActive, setVisionActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState({ id: null, words: [], index: -1 });
  const [showPrevious, setShowPrevious] = useState(false);
  const previousMessagesRef = useRef([]);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const msgIdCounterRef = useRef(0);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------- Fetch previous chat --------------------
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get("/api/messages");
        previousMessagesRef.current = res.data; // store hidden
      } catch {}
    };
    fetchHistory();
  }, []);

  const nextMsgId = () => ++msgIdCounterRef.current;

  const buildWordStarts = (sentence) => {
    const words = sentence.split(/\s+/).filter((w) => w.length > 0);
    const starts = [];
    let pos = 0;
    for (let i = 0; i < words.length; i++) {
      starts.push(pos);
      pos += words[i].length + 1;
    }
    return { words, starts };
  };

  // -------------------- Voice STT --------------------
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("⚠️ Browser does not support voice.");
      return;
    }
    stopAI();
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const voiceMessage = event.results[0][0].transcript;
      setMessage(voiceMessage);
      sendMessage(voiceMessage);
    };
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopAI();
  };

  // -------------------- AI TTS --------------------
  const speakAI = (text, attachToId) => {
    stopAI();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    const { words, starts } = buildWordStarts(text);
    setCurrentHighlight({ id: attachToId, words, index: -1 });

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      setCurrentHighlight((h) => (h.id === attachToId ? { id: null, words: [], index: -1 } : h));
    };

    utter.onboundary = (e) => {
      try {
        if (e.name === "word" || (typeof e.charIndex === "number" && e.charIndex >= 0)) {
          const ci = e.charIndex ?? 0;
          let idx = 0;
          while (idx + 1 < starts.length && starts[idx + 1] <= ci) idx++;
          setCurrentHighlight((h) => (h.id === attachToId ? { ...h, index: idx } : h));
        }
      } catch {}
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const stopAI = () => {
    try { if (window.speechSynthesis.speaking) window.speechSynthesis.cancel(); } catch {}
    utteranceRef.current = null;
    setIsSpeaking(false);
    setCurrentHighlight({ id: null, words: [], index: -1 });
  };

  // -------------------- Send Message -------------------
  const sendMessage = async (overrideText) => {
    const outbound = typeof overrideText === "string" ? overrideText : message;
    if (!outbound.trim()) return;

    const userMsg = { id: nextMsgId(), sender: "user", text: outbound };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    const thinkingId = nextMsgId();
    setMessages((prev) => [...prev, { id: thinkingId, sender: "ai", text: "Thinking..." }]);

    try {
      const response = await axios.post("/api/chat", { message: outbound });
      const aiReply = response.data.reply || "⚠️ Could not get AI response";
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? { ...m, text: aiReply } : m)));
      speakAI(aiReply, thinkingId);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? { ...m, text: "⚠️ Could not get AI response" } : m)));
    } finally { setLoading(false); }
  };

  // -------------------- File/Folder Upload --------------------
  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const uploaded = files.map((f) => f.name).join(", ");
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId(), sender: "user", text: `📎 Uploaded Files: **${uploaded}**` },
    ]);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    setLoading(true);
    try {
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const reply = (res?.data?.reply ?? "").toString();
      const aiId = nextMsgId();
      setMessages((prev) => [...prev, { id: aiId, sender: "ai", text: reply }]);
      speakAI(reply, aiId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), sender: "ai", text: "⚠️ Could not analyze files" },
      ]);
    } finally {
      setLoading(false);
      try { document.getElementById("fileInput").value = ""; } catch {}
    }
  };

  const handleUploadFolder = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const uploaded = files.map((f) => f.webkitRelativePath || f.name).join(", ");
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId(), sender: "user", text: `📁 Uploaded Folder: **${uploaded}**` },
    ]);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    setLoading(true);
    try {
      const res = await axios.post("/api/upload/folder", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const reply = (res?.data?.reply ?? "").toString();
      const aiId = nextMsgId();
      setMessages((prev) => [...prev, { id: aiId, sender: "ai", text: reply }]);
      speakAI(reply, aiId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), sender: "ai", text: "⚠️ Could not analyze folder" },
      ]);
    } finally {
      setLoading(false);
      try { document.getElementById("folderInput").value = ""; } catch {}
    }
  };

  // -------------------- History & Controls --------------------
  const clearChat = () => { stopAI(); setMessages([]); };
  const downloadHistory = () => { 
    const chatText = messages.map(m => `${(m.sender||"").toUpperCase()}: ${m.text}`).join("\n\n");
    const blob = new Blob([chatText], { type: "text/plain" }); 
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.download = "chat_history.txt"; 
    link.click(); 
  };
  const shareHistory = async () => {
    const chatText = messages.map(m => `${(m.sender||"").toUpperCase()}: ${m.text}`).join("\n\n");
    try { await navigator.clipboard.writeText(chatText); alert("✅ Chat copied!"); } 
    catch { alert("⚠️ Failed to copy chat."); }
  };

  // -------------------- Render Helpers --------------------
  const renderStructuredAI = (text, highlightIndex) => {
    const lines = text.split("\n");
    let globalIndex = 0;
    return lines.map((line, li) => {
      const words = line.trimEnd().split(" ").filter(w => w.length > 0);
      return (
        <p key={li} style={{ margin: "4px 0" }}>
          {words.map((w, wi) => {
            const isHighlighted = globalIndex === highlightIndex;
            globalIndex++;
            return <span key={`${li}-${wi}`} style={{ backgroundColor: isHighlighted ? "yellow" : "transparent", marginRight: 3, padding: isHighlighted ? "2px" : 0, borderRadius: 4 }}>{w} </span>;
          })}
        </p>
      );
    });
  };

  const filteredMessages = searchTerm
    ? messages.filter((m) => (m.text || "").toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  const btnBase = { margin: "5px", padding: "6px 12px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", cursor: "pointer", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", transition: "0.3s" };
  const btnHover = { background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" };

  // -------------------- Render --------------------
  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "Arial", color: "#fff", position: "relative" }}>
      <video src={CosmicBG} autoPlay loop muted style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -1 }} />

      {/* Sidebar */}
      <div style={{ width: "250px", background: "rgba(0,0,0,0.2)", borderRight: "1px solid rgba(255,255,255,0.2)", padding: "10px", overflowY: "auto", backdropFilter: "blur(6px)" }}>
        <h3 style={{ textAlign: "center" }}>📜 History</h3>
        <input type="text" placeholder="🔍 Search chat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "95%", padding: "6px", marginBottom: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", backdropFilter: "blur(6px)" }} />
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <button onClick={() => setShowPrevious(!showPrevious)} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>
            {showPrevious ? "Hide Previous" : "Show Previous"}
          </button>
        </div>
        {showPrevious && previousMessagesRef.current.length > 0 && previousMessagesRef.current.map((msg, i) => (
          <div key={`prev-${i}`} style={{ fontSize: "12px", marginBottom: "8px", padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "5px", color: "#aaa" }}>
            <b>{msg.sender.toUpperCase()}:</b> {msg.text.slice(0, 40)}...
          </div>
        ))}
        {filteredMessages.length === 0 ? <p style={{ textAlign: "center", color: "#aaa" }}>No history yet...</p> :
          filteredMessages.map((msg, i) => <div key={i} style={{ fontSize: "12px", marginBottom: "8px", padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "5px", color: "#fff" }}><b>{msg.sender.toUpperCase()}:</b> {msg.text.slice(0, 40)}...</div>)}
        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button onClick={clearChat} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>🗑 Clear</button>
          <button onClick={downloadHistory} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>⬇ Download</button>
          <button onClick={shareHistory} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>🔗 Share</button>
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* ... Main chat layout and inputs same as before ... */}

        <div style={{ textAlign: "center", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(6px)" }}>
          <h2 style={{ margin: 0 }}>AI ._. ANYTHING</h2>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => setVisionActive(!visionActive)} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>{visionActive ? "⏹ Stop Mood" : "🎥 Capture Mood"}</button>
            <button onClick={() => setDarkMode(!darkMode)} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>

            {isListening ? <button onClick={stopListening} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>🎙️ Stop Voice</button> :
              <button onClick={startListening} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>🎙️</button>}

            {isSpeaking && <button onClick={stopAI} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>Stop AI 🎙️</button>}
          </div>
        </div>

        {visionActive && <VisionAI onDetect={(data) => sendMessage(data.aiMessage)} onExit={() => setVisionActive(false)} />}

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {messages.map((msg) => <div key={msg.id} style={{ textAlign: msg.sender === "user" ? "right" : "left", marginBottom: "10px" }}>
            <div style={{ display: "inline-block", padding: "8px 12px", borderRadius: "10px", background: msg.sender === "user" ? "rgba(0,128,255,0.2)" : "rgba(255,255,255,0.05)", color: "#fff", maxWidth: "80%", wordBreak: "break-word" }}>
              {msg.sender === "ai" ? renderStructuredAI(msg.text, currentHighlight.id === msg.id ? currentHighlight.index : -1) : msg.text}
            </div>
          </div>)}
          <div ref={chatEndRef} />
        </div>

        {/* Input Box + File/Folder */}
        <div style={{ display: "flex", padding: "10px", alignItems: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(6px)" }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type message or access voice..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", marginRight: "10px", backdropFilter: "blur(6px)" }} />

          {/* File Upload */}
          <input type="file" id="fileInput" style={{ display: "none" }} multiple onChange={(e) => handleUploadFiles(e.target.files)} />
          <label htmlFor="fileInput" style={{ ...btnBase, cursor: "pointer" }}>📎</label>

          {/* Folder Upload */}
          <input type="file" id="folderInput" style={{ display: "none" }} webkitdirectory="" directory="" multiple onChange={(e) => handleUploadFolder(e.target.files)} />
          <label htmlFor="folderInput" style={{ ...btnBase, cursor: "pointer" }}>📁</label>

          <button onClick={sendMessage} disabled={loading} style={btnBase} onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHover)} onMouseOut={(e) => Object.assign(e.currentTarget.style, btnBase)}>➤</button>
        </div>
      </div>
    </div>
  );
}

export default App;
