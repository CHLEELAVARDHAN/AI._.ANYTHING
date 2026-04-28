import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Mic, MicOff, Plus, Settings, History, 
  LogOut, Trash2, User, Sparkles, Image as ImageIcon,
  Search, MapPin, Brain, Zap, FileText, Folder,
  MoreVertical, X as XIcon, ChevronRight, Check,
  Volume2, VolumeX, Edit3, ZoomIn, ZoomOut, Download,
  Mail, Github, Linkedin, Instagram, Menu, Copy, HelpCircle,
  Languages, Smile, Power
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateAIResponse, generateAIStream } from '../services/ai';
import { createBlock, sha256 } from '../services/blockchain';
import HolographicCore from './Eyes';
import SettingsModal from './SettingsModal';
import Tooltip from './Tooltip';
import { DataVisualization } from './DataVisualization';
import { HandwritingCanvas } from './HandwritingCanvas';
import { MoodDetection } from './MoodDetection';
import { ScrollIndicator } from './ScrollIndicator';
import { AdvancedSendButton } from './AdvancedSendButton';
import { sfx } from '../services/sfx';
import { 
  getProfile, updateProfile, 
  getSettings, getSessions, createSession, deleteSession, deleteAllSessions, deleteSelectedSessions,
  getHistory, addHistory, updateHistory
} from '../services/db';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

const AudioVisualizer = () => (
  <div className="flex items-end gap-[3px] h-4 mx-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <motion.div
        key={i}
        className="w-[3px] bg-primary rounded-t-[2px] google-rainbow-border-icon"
        animate={{
          height: ["20%", "100%", "30%", "80%", "20%"]
        }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          delay: i * 0.15,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
      
      // Basic sanitizer for common issues like unquoted labels with & or =
      let sanitizedChart = chart.trim();
      
      // If it's a flowchart, try to fix common label issues
      if (sanitizedChart.startsWith('graph') || sanitizedChart.startsWith('flowchart')) {
        // This is a very basic attempt to quote labels that contain & or = but aren't quoted
        // It's not perfect but can help with simple cases
        sanitizedChart = sanitizedChart.replace(/([A-Za-z0-9]+)\[([^"\]]*[&|=][^"\]]*)\]/g, '$1["$2"]');
        sanitizedChart = sanitizedChart.replace(/([A-Za-z0-9]+)\(([^"\]]*[&|=][^"\]]*)\)/g, '$1("$2")');
      }

      mermaid.render(id, sanitizedChart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      }).catch(err => {
        console.error('Mermaid render error:', err);
        // Handle Vite HMR / Dynamic import failures by forcing a reload
        if (err && err.message && (err.message.includes('Failed to fetch dynamically imported module') || err.message.includes('Importing a module script failed'))) {
          console.log("Dynamic import failed, reloading page to fetch new chunks...");
          window.location.reload();
          return;
        }
        
        // If it fails, try one more time with a very basic "linear" curve which sometimes avoids layout errors
        if (!sanitizedChart.includes('%%{init')) {
          const fallbackChart = `%%{init: {'flowchart': {'curve': 'linear'}}}%%\n${sanitizedChart}`;
          mermaid.render(`${id}-fallback`, fallbackChart).then(({ svg }) => {
            if (ref.current) ref.current.innerHTML = svg;
          }).catch(fallbackErr => {
            if (ref.current) {
              ref.current.innerHTML = `
                <div class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p class="text-red-500 text-xs font-bold mb-1">Mermaid Rendering Error</p>
                  <pre class="text-[10px] text-red-400/80 whitespace-pre-wrap">${err.message || String(err)}</pre>
                  <button class="mt-2 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors" onclick="this.parentElement.nextElementSibling.classList.toggle('hidden')">Show Code</button>
                </div>
                <pre class="hidden mt-2 p-2 bg-white/40 dark:bg-black/40 rounded text-[9px] text-zinc-500 overflow-x-auto">${chart}</pre>
              `;
            }
          });
        } else if (ref.current) {
          ref.current.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              <p class="text-red-500 text-xs font-bold mb-1">Mermaid Rendering Error</p>
              <pre class="text-[10px] text-red-400/80 whitespace-pre-wrap">${err.message || String(err)}</pre>
            </div>
          `;
        }
      });
    }
  }, [chart]);

  return <div ref={ref} className="flex flex-col items-center py-2" />;
};

export default function Chat({ onPowerOff }: { onPowerOff?: () => void }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 800);
  };
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hasPromptedForKey, setHasPromptedForKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Profile settings
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({ username: 'User', fullName: '', dob: '', address: '', phone: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showHandwriting, setShowHandwriting] = useState(false);
  const [showMoodDetection, setShowMoodDetection] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [activeTools, setActiveTools] = useState({
    thinking: false,
    search: false,
    maps: false,
    searchEngine: 'google' as 'google' | 'yahoo' | 'duckduckgo'
  });

  const placeholders = ["What's in your mind?", "Ask anything", "Ask me", "Ask AI._.Anything"];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const greetingTexts = ["The AI", "The advanced version", "What's in your mind?", "Express your feelings"];
  const [greetingTextIndex, setGreetingTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
      setGreetingTextIndex((prevIndex) => (prevIndex + 1) % greetingTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  
  const [systemInstruction, setSystemInstruction] = useState('');
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const [longPressedMessageIndex, setLongPressedMessageIndex] = useState<number | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speak = (text: string) => {
    synthRef.current?.cancel(); // Ensure any existing speech is stopped immediately
    if (!isTtsEnabled || !synthRef.current) return;
    try {
      // Split into sentences for better long-form TTS support
      const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk.trim());
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        if (index === 0) utterance.onstart = () => setIsSpeaking(true);
        if (index === chunks.length - 1) utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        synthRef.current!.speak(utterance);
      });
    } catch (e) {
      console.error("TTS failed:", e);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    // Stop speaking immediately when TTS is disabled
    if (!isTtsEnabled) {
      synthRef.current?.cancel();
    }
  }, [isTtsEnabled]);

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  useEffect(() => {
    if (user?.uid) {
      fetchSessions();
      getProfile(user.uid).then(p => {
        if (p) setProfileData(p as any);
      });
      getSettings(user.uid).then(s => {
        if (s?.searchEngine) {
          setActiveTools(prev => ({ ...prev, searchEngine: s.searchEngine }));
        }
        if (s?.systemInstruction) {
          setSystemInstruction(s.systemInstruction);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    setupVoice();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    if (!user?.uid) return;
    try {
      const data = await getSessions(user.uid);
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (!user?.uid) return;
    try {
      setCurrentSessionId(sessionId);
      const data = await getHistory(user.uid, sessionId);
      setMessages(data);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const deleteSessionHandler = async (sessionId: string) => {
    if (!user?.uid) return;
    try {
      // Optimistic update
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSelectedSessionIds(prev => prev.filter(id => id !== sessionId));
      
      await deleteSession(user.uid, sessionId);
      
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      fetchSessions(); // Revert on error
    }
  };

  const deleteSelectedSessionsHandler = async () => {
    if (selectedSessionIds.length === 0 || !user?.uid) return;
    try {
      const idsToDelete = [...selectedSessionIds];
      // Optimistic update
      setSessions(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      setSelectedSessionIds([]);
      
      await deleteSelectedSessions(user.uid, idsToDelete);
      
      if (currentSessionId && idsToDelete.includes(currentSessionId)) {
        startNewChat();
      }
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete selected sessions:", error);
      fetchSessions(); // Revert on error
    }
  };

  const deleteAllSessionsHandler = async () => {
    if (sessions.length === 0 || !user?.uid) return;
    try {
      await deleteAllSessions(user.uid);
      startNewChat();
      setSelectedSessionIds([]);
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete all sessions:", error);
    }
  };

  const toggleSessionSelection = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSelectedSessionIds(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId) 
        : [...prev, sessionId]
    );
  };

  const setupVoice = () => {
    if ('webkitSpeechRecognition' in window) {
      if (recognitionRef.current) return;

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Always update input with what's being said
        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setInput(currentText);
        }
        
        const lower = (finalTranscript || interimTranscript).toLowerCase();
        if (lower.includes('wake up')) {
          setIsListening(true);
          setEmotion('happy');
          if (isSfxEnabled) sfx.click();
          speak("I'm listening.");
        } else if (lower.includes('turn off voice access')) {
          setIsListening(false);
          setEmotion('neutral');
          if (isSfxEnabled) sfx.click();
          speak("Voice access disabled.");
          recognition.stop();
        } else if (isListening) {
          // Only auto-send final results that are long enough
          if (finalTranscript && finalTranscript.trim().length > 5) {
            // Small delay to let user see the final text in the input box
            setTimeout(() => {
              handleSend(finalTranscript.trim());
              // Stop and let onend restart it to clear the internal buffer
              try { recognition.stop(); } catch(e) {}
            }, 800);
          }
        }
      };

      recognition.onend = () => {
        console.log("[VOICE] Ended");
        if (isListening) {
          try {
            recognition.start();
          } catch (e: any) {
            if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
              console.log("[VOICE] Recognition already started.");
            } else {
              console.error("[VOICE] Restart failed:", e);
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[VOICE] Error:", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };
      
      recognitionRef.current = recognition;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const textContent = result.value;
          
          const blob = new Blob([textContent], { type: 'text/plain' });
          const reader = new FileReader();
          reader.onload = (ev) => {
            setSelectedFiles(prev => [...prev, {
              name: file.name,
              mimeType: 'text/plain',
              data: ev.target?.result as string
            }]);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error("Error parsing docx:", err);
          // Fallback to original behavior or show error
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSelectedFiles(prev => [...prev, {
            name: file.name,
            mimeType: file.type,
            data: ev.target?.result as string
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const [showPromptModal, setShowPromptModal] = useState<{ type: 'image' | 'video' | 'music' | 'edit-image', active: boolean, imageToEdit?: string }>({ type: 'image', active: false });
  const [promptValue, setPromptValue] = useState('');

  const analyzeEmotion = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('sorry') || lower.includes('unfortunately') || lower.includes('sad')) return 'sad';
    if (lower.includes('wow') || lower.includes('great') || lower.includes('amazing') || lower.includes('!') ) return 'excited';
    if (lower.includes('boring') || lower.includes('slow') || lower.includes('whatever')) return 'bored';
    if (lower.includes('sleep') || lower.includes('tired') || lower.includes('night')) return 'sleepy';
    if (lower.includes('?') || lower.includes('what') || lower.includes('how')) return 'thinking';
    return 'happy';
  };

  const ensureSession = async (title: string) => {
    if (!user?.uid) {
      console.error('No valid user found, logging out...');
      logout();
      return null;
    }

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const newSessionId = await createSession(user.uid, title.slice(0, 30) + (title.length > 30 ? '...' : ''));
        setCurrentSessionId(newSessionId);
        await fetchSessions();
        return newSessionId;
      } catch (err) {
        console.error("Error creating session:", err);
        return null;
      }
    }
    return sessionId;
  };

  const speakSentence = (sentence: string) => {
    if (!isTtsEnabled || !synthRef.current) return;
    try {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    } catch (e) {
      console.error("TTS failed:", e);
      setIsSpeaking(false);
    }
  };

  const handleSend = async (text: string = input, options?: { isHidden?: boolean }) => {
    if (!text.trim() && selectedFiles.length === 0) return;
    
    // Stop any ongoing speech if user interrupts
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const { isHidden = false } = options || {};
    if (isSfxEnabled) sfx.click();

    const userMsg = { 
      role: 'user', 
      content: text, 
      timestamp: new Date().toISOString(),
      files: selectedFiles.map(f => ({ name: f.name, type: f.mimeType })),
      isHidden
    };
    const prevHash = messages.length > 0 ? messages[messages.length - 1].hash : '0';
    const block = await createBlock(prevHash, text + selectedFiles.map(f => f.name).join(''));
    
    const newMessages = [...messages, { ...userMsg, hash: block.hash }];
    
    const aiMsgId = Date.now().toString();
    const aiPlaceholder = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      hash: ''
    };
    
    setMessages([...newMessages, aiPlaceholder]);
    setInput('');
    setSelectedFiles([]);
    setIsTyping(true);
    setEmotion('thinking');

    const sessionId = await ensureSession(text || "New Chat");
    if (!sessionId || !user?.uid) {
      console.error("Cannot save history: No session ID or user");
    } else {
      try {
        const id = await addHistory(user.uid, sessionId, { role: 'user', content: text, hash: block.hash, isHidden });
        if (id) {
            setMessages(prev => prev.map(m => m.hash === block.hash ? { ...m, id } : m));
        }
      } catch (err) {
        console.error("Failed to save user history:", err);
      }
    }

    try {
      let location = undefined;
      if (activeTools.maps) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch (e) {
          console.error("Geolocation failed:", e);
        }
      }

      const stream = generateAIStream(text, newMessages, {
        useThinking: activeTools.thinking,
        useSearch: activeTools.search,
        searchEngine: activeTools.searchEngine,
        useMaps: activeTools.maps,
        location,
        files: selectedFiles,
        systemInstruction
      });

      let fullText = "";
      let sentenceBuffer = "";

      for await (const chunk of stream) {
        fullText += chunk;
        sentenceBuffer += chunk;

        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx].role === 'assistant') {
            copy[lastIdx] = { ...copy[lastIdx], content: fullText };
          }
          return copy;
        });

        // Parse boundaries to speak in sentences
        const sentenceMatch = sentenceBuffer.match(/([^.!?]+[.!?]+)(.*)/);
        if (sentenceMatch) {
          const matchedSentence = sentenceMatch[1];
          sentenceBuffer = sentenceMatch[2] || "";
          if (matchedSentence.trim().length > 0) {
             speakSentence(matchedSentence);
          }
        }
      }

      // Speak remaining text buffer
      if (sentenceBuffer.trim().length > 0) {
        speakSentence(sentenceBuffer);
      }

      const aiBlock = await createBlock(block.hash, fullText);
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = { ...copy[lastIdx], hash: aiBlock.hash };
        }
        return copy;
      });
      
      if (sessionId && user?.uid) {
        try {
          const id = await addHistory(user.uid, sessionId, { role: 'assistant', content: fullText, hash: aiBlock.hash });
          if (id) {
            setMessages(prev => prev.map(m => m.hash === aiBlock.hash ? { ...m, id } : m));
          }
        } catch (err) {
          console.error("Failed to save assistant history:", err);
        }
      }

      setEmotion(analyzeEmotion(fullText));
      
      // Nuanced audio feedback
      if (isSfxEnabled) {
        const isTask = fullText.includes('```') || fullText.includes('---') || fullText.includes('|') || fullText.toLowerCase().includes('success');
        if (isTask) {
          sfx.taskCompleted();
        } else {
          sfx.messageReceived();
        }
      }
    } catch (error) {
      console.error(error);
      if (isSfxEnabled) sfx.error();
      setEmotion('angry');
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (copy[lastIdx].role === 'assistant' && !copy[lastIdx].content) {
          copy[lastIdx] = { ...copy[lastIdx], content: "An error occurred while communicating with the AI." };
        }
        return copy;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleExplainMessage = (content: string) => {
    handleSend(`Explain this message to me in more detail:\n\n${content}`);
  };

  const handleTranslateMessage = async (content: string, i: number) => {
    try {
      const response = await generateAIResponse(
        `Translate the following message into a language that contrasts with its current one (e.g. if English, translate to Spanish/Telugu/Hindi/Japanese, if others translate to English). Be natural and professional. \n\n"${content}"`,
        [],
        { systemInstruction: "You are a professional translator. Only return the translated text." }
      );

      if (response && response.text) {
        const newMessages = [...messages];
        newMessages[i] = { ...newMessages[i], content: response.text, originalContent: content };
        setMessages(newMessages);
      }
    } catch (error) {
      console.error("Translation failed:", error);
    }
  };

  const handleStartEdit = (index: number, content: string) => {
    setEditingMessageIndex(index);
    setEditingContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (index: number) => {
    if (!user?.uid || !currentSessionId) return;
    const originalMsg = messages[index];
    const newHash = await sha256(editingContent + Date.now());

    const editedMsg = { 
        ...originalMsg, 
        content: editingContent, 
        timestamp: new Date().toISOString(),
        parentHash: originalMsg.parentHash || originalMsg.hash || 'edited',
        hash: newHash
    };
    
    // Update local state
    const newMessages = [...messages];
    newMessages[index] = editedMsg;
    setMessages(newMessages);
    setEditingMessageIndex(null);
    setEditingContent('');

    // Update in database if it has an id
    if (originalMsg.id) {
        try {
            await updateHistory(user.uid, originalMsg.id, { 
                content: editingContent,
                timestamp: editedMsg.timestamp,
                parentHash: editedMsg.parentHash,
                hash: newHash
            });
        } catch (error) {
            console.error("Failed to update history:", error);
        }
    }
  };

  const handleLongPressStart = (index: number) => {
    pressTimerRef.current = setTimeout(() => {
      setLongPressedMessageIndex(index);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleDirectAIQuery = (query: string, newEmotion: string) => {
    setEmotion(newEmotion);
    handleSend(query, { isHidden: true });
  };

  const clearHistory = async () => {
    if (user?.uid) {
      await deleteAllSessions(user.uid);
    }
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
  };

  const toggleTool = (tool: keyof typeof activeTools) => {
    setActiveTools(prev => ({ ...prev, [tool]: !prev[tool] }));
  };


  return (
    <div className="flex h-screen bg-white dark:bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white overflow-hidden font-sans transition-colors duration-300">
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        className={`fixed lg:relative w-80 shrink-0 h-full bg-white/90 dark:bg-[#121318]/90 backdrop-blur-xl border-r border-zinc-200 dark:border-white/5 flex flex-col p-5 z-50 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 lg:ml-0' : '-translate-x-full lg:-ml-80'}`}
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-5">
            <div className="relative w-10 h-10">
              {/* 3D Animated Icon from Landing Page */}
              <motion.div 
                animate={{ rotateX: 360, rotateY: 360, scale: [1, 1.05, 1] }}
                transition={{ 
                  duration: 10, 
                  repeat: Infinity, 
                  ease: "linear",
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute inset-0 rounded-full rainbow-border shadow-[0_0_20px_rgba(var(--primary-color),0.4)]"
                style={{ transformStyle: 'preserve-3d' }}
              />
              <motion.div 
                animate={{ rotateX: -360, rotateY: -360, scale: [1, 0.95, 1] }}
                transition={{ 
                  duration: 15, 
                  repeat: Infinity, 
                  ease: "linear",
                  scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute inset-1 rounded-full border border-primary/60 text-primary flex items-center justify-center font-bold text-[10px] shadow-[inset_0_0_10px_rgba(var(--primary-color),0.4)] rainbow-border-color"
                style={{ transformStyle: 'preserve-3d' }}
              >
                AI
              </motion.div>
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl animate-pulse" />
            </div>
            <h1 className="font-bold text-sm tracking-tighter leading-tight rainbow-text">
              AI._.ANYTHING<br/>
              <span className="text-primary text-[10px] uppercase tracking-[0.2em] font-bold">
                Unified Edition
              </span>
            </h1>
          </div>
          <button 
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <motion.button 
          id="new-chat-button"
          aria-label="Start new chat session"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startNewChat}
          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-transparent transition-all group mb-8 border border-primary/20 hover:border-primary/50 rainbow-border rainbow-border-color"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform text-primary google-rainbow-icon" />
          <span className="font-bold text-sm text-primary">New Chat</span>
        </motion.button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Recent History</div>
            {sessions.length > 0 && (
              <button 
                onClick={() => setSelectedSessionIds(prev => prev.length === sessions.length ? [] : sessions.map(s => s.id))}
                className="text-[9px] text-primary hover:underline font-bold"
              >
                {selectedSessionIds.length === sessions.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          {sessions.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <History className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-20" />
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">No history yet</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="relative group">
                <div 
                  onClick={() => loadSession(s.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border pl-10 cursor-pointer rainbow-border rainbow-border-color ${currentSessionId === s.id ? 'bg-primary/10 border-primary/30 text-primary' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-900 dark:text-white'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate flex-1">{s.title}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSessionHandler(s.id); }}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                        title="Delete this chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[9px] opacity-60 font-mono">
                    {(() => {
                      const d = s.createdAt || s.created_at;
                      if (!d) return 'Unknown time';
                      const date = typeof d === 'object' && d.seconds ? new Date(d.seconds * 1000) : new Date(d);
                      if (isNaN(date.getTime())) return 'Unknown time';
                      return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    })()}
                  </div>
                </div>
                
                {/* Selection Icon */}
                <button 
                  onClick={(e) => toggleSessionSelection(e, s.id)}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    selectedSessionIds.includes(s.id) 
                      ? 'bg-primary border-primary text-zinc-900 dark:text-white' 
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-black/20 text-zinc-900 dark:text-white'
                  }`}
                >
                  {selectedSessionIds.includes(s.id) && <Check className="w-3 h-3" />}
                </button>
              </div>
            ))
          )}
        </div>

        {/* History Actions */}
        {(selectedSessionIds.length > 0 || sessions.length > 0) && (
          <div className="mt-4 p-2 bg-zinc-100 dark:bg-black/20 rounded-xl border border-zinc-200 dark:border-zinc-800/50 space-y-2">
            {selectedSessionIds.length > 0 && (
              <button 
                onClick={deleteSelectedSessionsHandler}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/20"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected ({selectedSessionIds.length})
              </button>
            )}
            <button 
              onClick={() => { if (user?.uid) clearHistory(); }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              <History className="w-3 h-3" />
              Clear All History
            </button>
          </div>
        )}

        <div className="mt-auto pt-4 border-t-2 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex gap-2">
              <Tooltip text="Send Email">
                <motion.a whileHover={{ scale: 1.1, y: -2 }} href="mailto:chemudupatileelavardhan@gmail.com" className="text-zinc-500 hover:text-primary transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                </motion.a>
              </Tooltip>
              <Tooltip text="GitHub">
                <motion.a whileHover={{ scale: 1.1, y: -2 }} href="https://github.com/CHLEELAVARDHAN" target="_blank" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-900 dark:text-white transition-colors">
                  <Github className="w-3.5 h-3.5" />
                </motion.a>
              </Tooltip>
              <Tooltip text="LinkedIn">
                <motion.a whileHover={{ scale: 1.1, y: -2 }} href="https://linkedin.com/in/leelavardhan2005" target="_blank" className="text-zinc-500 hover:text-blue-400 transition-colors">
                  <Linkedin className="w-3.5 h-3.5" />
                </motion.a>
              </Tooltip>
              <Tooltip text="Instagram">
                <motion.a whileHover={{ scale: 1.1, y: -2 }} href="https://www.instagram.com/bruc._.lee_?igsh=MThkc2wzbXFzb2I3eA==" target="_blank" className="text-zinc-500 hover:text-pink-400 transition-colors">
                  <Instagram className="w-3.5 h-3.5" />
                </motion.a>
              </Tooltip>
            </div>
            <div className="text-[7px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-black">
              System Core v3.1
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 w-full">
              <Tooltip text="Settings" position="right" className="flex-1">
                <motion.button 
                  whileHover={{ rotate: 90, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSettings(true)} 
                  className="w-full flex items-center justify-center p-3 rounded-2xl transition-all duration-300 ease-in-out bg-transparent border-2 rainbow-border-color hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white group"
                >
                  <Settings className="w-5 h-5" />
                </motion.button>
              </Tooltip>
              
              <Tooltip text="System Shutdown" position="right" className="flex-1">
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: -10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onPowerOff || logout} 
                  className="w-full flex items-center justify-center p-3 rounded-2xl transition-all duration-300 ease-in-out bg-transparent border-2 rainbow-border-color hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white group relative overflow-hidden"
                >
                  <Power className="w-5 h-5" />
                </motion.button>
              </Tooltip>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-[#fafafa] dark:bg-[#0b0c10] transition-colors duration-300">
        
        {/* Header */}
        <header className="shrink-0 h-20 w-full px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <motion.button 
              id="sidebar-toggle-button"
              aria-label="Toggle sidebar"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
            <div className="flex flex-col">
              <div className="font-bold text-xl tracking-tight select-none rainbow-text">
                AI._.ANYTHING
              </div>
              <div className="flex items-center gap-2">
                <motion.div 
                  animate={isListening ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]' : 'bg-zinc-300 dark:bg-zinc-700'}`} 
                />
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  {isListening ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="flex flex-col pr-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{profileData.username || 'User'}</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Lvl. 1</span>
              </div>
            </motion.button>
          </div>
        </header>

        {/* Chat Area */}
        <div ref={messageContainerRef} className="flex-1 overflow-y-auto px-4 lg:px-8 pt-8 pb-32 space-y-8 custom-scrollbar relative z-10 w-full flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col space-y-8 relative">
            
            {/* Hologram Core */}
            <div className="flex justify-center mb-8">
              <HolographicCore 
                emotion={isSpeaking ? 'surprised' : (isListening ? 'excited' : (isTyping ? 'thinking' : 'neutral'))} 
                isPulsing={isListening || isTyping || isSpeaking} 
              />
            </div>
            
            {messages.length === 0 && (
              <div className="text-center flex flex-col items-center max-w-2xl mx-auto py-12">
                <h2 className="font-bold text-3xl lg:text-5xl tracking-tighter mb-4 capitalize text-zinc-900 dark:text-white">
                  Good {getGreetingTime()}, {profileData.username || 'User'}
                </h2>
                
                <div className="h-10 sm:h-12 overflow-hidden relative w-full flex justify-center items-center mb-6">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={greetingTextIndex}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="absolute text-xs sm:text-sm lg:text-base font-black tracking-widest uppercase whitespace-nowrap rainbow-text"
                    >
                      {greetingTexts[greetingTextIndex]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
            {messages.filter(msg => !msg.isHidden).map((msg, i) => {
              const isEdited = msg.parentHash !== undefined;
              const isEditing = editingMessageIndex === i;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  key={i} 
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} relative group`}
                  onMouseEnter={() => setHoveredMessageIndex(i)}
                  onMouseLeave={() => {
                    setHoveredMessageIndex(null);
                    setLongPressedMessageIndex(null);
                  }}
                  onMouseDown={() => handleLongPressStart(i)}
                  onMouseUp={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(i)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <AnimatePresence>
                    {(hoveredMessageIndex === i || longPressedMessageIndex === i) && !isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className={`absolute -top-10 z-30 flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-lg p-1 ${msg.role === 'user' ? 'right-0' : 'left-0'}`}
                      >
                        <Tooltip text="Explain this message">
                          <button onClick={() => handleExplainMessage(msg.content)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-primary transition-colors">
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Copy text">
                          <button onClick={() => handleCopyMessage(msg.content)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-primary transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Translate">
                          <button onClick={() => handleTranslateMessage(msg.content, i)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-primary transition-colors">
                            <Languages className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        {msg.role === 'user' && (
                          <Tooltip text="Edit message">
                            <button onClick={() => handleStartEdit(i, msg.content)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-primary transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isEdited && (
                    <div className={`absolute -top-6 ${msg.role === 'user' ? 'right-6' : 'left-6'} w-px h-6 bg-gradient-to-b from-primary/50 to-transparent`} />
                  )}
                  
                  <div className={`max-w-[85%] p-5 rounded-[24px] ${
                    msg.role === 'user' 
                      ? 'bg-zinc-100 dark:bg-[#1a1b20] border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                      : 'bg-white dark:bg-[#121318] border border-black/5 dark:border-white/5 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                  }`}>
                    {isEdited && (
                      <div className="flex items-center gap-2 mb-2 text-[9px] font-bold uppercase tracking-widest text-primary">
                        <Zap className="w-3 h-3" />
                        Updated Version
                      </div>
                    )}
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {msg.files.map((f: any, fi: number) => (
                          <div key={fi} className="px-2 py-1 rounded bg-black/20 text-[10px] flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {f.name}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="flex flex-col gap-3 min-w-[200px] sm:min-w-[300px]">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-black/20 border border-primary/30 rounded-xl p-3 text-sm focus:outline-none focus:border-primary min-h-[100px]"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:text-white transition-colors">Cancel</button>
                          <button onClick={() => handleSaveEdit(i)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-primary text-zinc-900 dark:text-white rounded-lg hover:opacity-90 shadow-lg shadow-primary/20">Save Change</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="markdown-body">
                          <Markdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            urlTransform={(uri) => uri.startsWith('data:') ? uri : uri}
                            components={{
                              p: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>,
                              table: ({ children }) => <div className="overflow-x-auto my-4 text-theme"><table className="border-collapse border-2 border-zinc-200 dark:border-zinc-800 w-full text-xs sm:text-sm">{children}</table></div>,
                              thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-900">{children}</thead>,
                              th: ({ children }) => <th className="border-2 border-zinc-200 dark:border-zinc-800 p-2 font-bold text-left">{children}</th>,
                              td: ({ children }) => <td className="border-2 border-zinc-200 dark:border-zinc-800 p-2">{children}</td>,
                              ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-zinc-500">{children}</blockquote>,
                              del: ({ children }) => <del className="opacity-50">{children}</del>,
                              img: ({ node, ...props }) => {
                                if (!props.src) return null;
                                const isGenerated = props.src.startsWith('data:image');
                                return (
                                  <span className="flex flex-col gap-2 my-4">
                                    <img
                                      {...props}
                                      loading="lazy"
                                      decoding="async"
                                      onClick={() => {
                                        setSelectedImage(props.src as string);
                                        setZoomLevel(1);
                                      }}
                                      className="rounded-xl max-w-full h-auto border-2 border-zinc-200 dark:border-zinc-800 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                                      style={{ imageRendering: 'crisp-edges' } as any}
                                      referrerPolicy="no-referrer"
                                    />
                                    {isGenerated && (
                                      <div className="flex gap-4">
                                        <button
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = props.src as string;
                                            link.download = `generated-image-${Date.now()}.png`;
                                            link.click();
                                          }}
                                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors w-fit"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download Image
                                        </button>
                                      </div>
                                    )}
                                  </span>
                                );
                              },
                              a: ({ node, ...props }) => {
                                return <a {...props} className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">{props.children}</a>;
                              },
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';
                                
                                if (!inline && language === 'mermaid') {
                                  return (
                                    <div className="my-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                                      <MermaidChart chart={String(children).replace(/\n$/, '')} />
                                    </div>
                                  );
                                }

                                if (!inline && language === 'chart') {
                                  return <DataVisualization json={String(children)} />;
                                }
                                
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                        <div className="mt-2 flex items-center justify-between opacity-40 text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            {msg.role === 'assistant' && (
                              <button 
                                onClick={() => speak(msg.content)}
                                className="hover:text-primary transition-colors p-1 rounded-md hover:bg-black/10"
                                title="Read aloud"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {msg.hash && <span className="truncate ml-4">HASH: {msg.hash.slice(0, 8)}...</span>}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
            );
          })}
          <AnimatePresence>
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 250, damping: 25 }}
                className="flex justify-start"
              >
                <div className="bg-black/5 dark:bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-zinc-200/50 dark:border-black/10 dark:border-white/10 p-2 lg:p-3 rounded-2xl flex items-center">
                  <div className="flex gap-1.5 px-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -4, 0],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                        className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary-color)] opacity-60"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            <ScrollIndicator containerRef={messageContainerRef} />
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="absolute bottom-0 w-full p-4 lg:p-8 bg-gradient-to-t from-[#fafafa] via-[#fafafa]/90 dark:from-[#0b0c10] dark:via-[#0b0c10]/90 to-transparent z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            {/* Selected Files Preview */}
            <AnimatePresence>
              {selectedFiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute -top-16 left-0 right-0 flex gap-2 p-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl border border-yellow-500/10 overflow-x-auto shadow-xl"
                >
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap">
                      <FileText className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{f.name}</span>
                      <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                        <XIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 hover:text-red-400 ml-1 transition-colors" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Tools Indicators */}
            <div className="absolute -top-10 left-0 flex gap-2">
              {activeTools.thinking && <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20 flex items-center gap-1.5 font-mono uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"><Brain className="w-3.5 h-3.5"/> Deep Logic</span>}
              {activeTools.search && <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 flex items-center gap-1.5 font-mono uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"><Search className="w-3.5 h-3.5"/> Scan: {activeTools.searchEngine}</span>}
              {activeTools.maps && <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20 flex items-center gap-1.5 font-mono uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]"><MapPin className="w-3.5 h-3.5"/> Geo</span>}
            </div>

            <div className="relative flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[2rem] group/input transition-all glass-panel glass-panel-hover">
              <div className="absolute inset-0 rounded-[2rem] rainbow-border rainbow-border-color group-focus-within/input:shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)] transition-all pointer-events-none" />
              
              {/* Plus Menu Button */}
              <div className="absolute left-4 z-30">
                <Tooltip text="Modular Toolset" position="right">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={`p-2 transition-all flex items-center justify-center bg-transparent border-none ${showPlusMenu ? 'text-primary rotate-45' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </Tooltip>

                {/* Floating Plus Menu */}
                <AnimatePresence>
                  {showPlusMenu && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPlusMenu(false)}
                        className="fixed inset-0 z-10"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: -10, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
                        className="absolute bottom-full left-0 mb-4 w-64 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-3 shadow-[0_30px_80px_rgba(0,0,0,0.8)] z-20 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between px-3 pt-1 pb-2 border-b border-black/5 dark:border-white/5">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Extensions</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-[#121212] rainbow-border rainbow-border-color rounded-2xl transition-all group hover:-translate-y-1 shadow-sm hover:shadow-md">
                            <div className="p-2.5 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-all">
                              <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 font-black group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-blue-500 tracking-widest uppercase">File Data</span>
                          </button>
                          
                          <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-[#121212] rainbow-border rainbow-border-color rounded-2xl transition-all group hover:-translate-y-1 shadow-sm hover:shadow-md">
                            <div className="p-2.5 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-all">
                              <Folder className="w-4 h-4 text-orange-500 dark:text-orange-400 font-black group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-orange-500 tracking-widest uppercase">Directory</span>
                          </button>
                        </div>

                        <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-2xl p-1.5 mt-1 flex flex-col gap-1 rainbow-border rainbow-border-color shadow-sm">
                          <button onClick={() => { toggleTool('thinking'); setShowPlusMenu(false); }} className={`flex items-center px-3 py-2.5 rounded-xl transition-all group ${activeTools.thinking ? 'bg-cyan-50 dark:bg-cyan-500/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <div className={`mr-3 p-1.5 rounded-lg transition-colors ${activeTools.thinking ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                              <Brain className="w-4 h-4" />
                            </div>
                            <span className={`text-[11px] font-bold tracking-wider uppercase flex-1 text-left ${activeTools.thinking ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>Deep Logic</span>
                            {activeTools.thinking && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />}
                          </button>

                          <div className={`flex flex-col rounded-xl overflow-hidden transition-all group ${activeTools.search ? 'bg-emerald-50 dark:bg-emerald-500/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <button onClick={() => toggleTool('search')} className="flex items-center px-3 py-2.5 w-full group/btn">
                              <div className={`mr-3 p-1.5 rounded-lg transition-colors ${activeTools.search ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 group-hover/btn:text-zinc-900 dark:group-hover:text-white'}`}>
                                <Search className="w-4 h-4" />
                              </div>
                              <span className={`text-[11px] font-bold tracking-wider uppercase flex-1 text-left ${activeTools.search ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 group-hover/btn:text-zinc-900 dark:group-hover:text-white'}`}>Live Sync</span>
                              {activeTools.search && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />}
                            </button>
                            {activeTools.search && (
                              <div className="flex gap-2 justify-center pb-3 pt-0">
                                {['google', 'yahoo', 'duck'].map((engine) => (
                                  <button 
                                    key={engine}
                                    onClick={(e) => { e.stopPropagation(); setActiveTools(prev => ({ ...prev, searchEngine: engine as any })); }}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black transition-all ${activeTools.searchEngine === engine || (engine === 'duck' && activeTools.searchEngine === 'duckduckgo') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                  >
                                    {engine}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button onClick={() => { toggleTool('maps'); setShowPlusMenu(false); }} className={`flex items-center px-3 py-2.5 rounded-xl transition-all group ${activeTools.maps ? 'bg-blue-50 dark:bg-blue-500/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <div className={`mr-3 p-1.5 rounded-lg transition-colors ${activeTools.maps ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <span className={`text-[11px] font-bold tracking-wider uppercase flex-1 text-left ${activeTools.maps ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>Location</span>
                            {activeTools.maps && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button onClick={() => { setShowHandwriting(true); setShowPlusMenu(false); }} className="flex justify-center items-center gap-2 p-3 bg-white dark:bg-[#121212] rainbow-border rainbow-border-color rounded-2xl transition-all group relative overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:-translate-y-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Edit3 className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest relative z-10">Canvas</span>
                          </button>
                          
                          <button onClick={() => { setShowMoodDetection(true); setShowPlusMenu(false); }} className="flex justify-center items-center gap-2 p-3 bg-white dark:bg-[#121212] rainbow-border rainbow-border-color rounded-2xl transition-all group relative overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:-translate-y-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Smile className="w-4 h-4 text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest relative z-10">Sensors</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <input 
                value={input}
                onChange={handleInput}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full bg-transparent py-5 pl-[4.5rem] pr-[11rem] sm:pr-[11rem] lg:pr-[12rem] focus:outline-none text-zinc-900 dark:text-white text-sm lg:text-base relative z-10 peer placeholder-transparent"
                placeholder=" "
              />
              <AnimatePresence mode="wait">
                {!input && (
                  <motion.div
                    key={isListening ? "listening" : placeholderIndex}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute left-[4.5rem] top-0 bottom-0 flex items-center pointer-events-none text-sm lg:text-base z-20"
                  >
                    {isListening ? (
                      <div className="flex items-center gap-3">
                        <AudioVisualizer />
                        <span className="text-yellow-400 font-bold tracking-widest text-xs uppercase drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">Listening...</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 font-medium">{placeholders[placeholderIndex]}</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute right-3 top-0 bottom-0 flex items-center justify-center gap-2 z-30">
                <Tooltip text="Voice Matrix">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    id="voice-input-button"
                    aria-label={isListening ? "Stop voice recognition" : "Start voice recognition"}
                    onClick={() => {
                      const nextState = !isListening;
                      setIsListening(nextState);
                      
                      if (nextState) {
                        if (!recognitionRef.current) setupVoice();
                        try {
                          recognitionRef.current?.start();
                        } catch (e: any) {
                          if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
                            console.log("[VOICE] Recognition already started.");
                          } else {
                            console.error("Voice start failed:", e);
                          }
                        }
                      } else {
                        try {
                          recognitionRef.current?.stop();
                        } catch (e) {
                          console.error("Voice stop failed:", e);
                        }
                      }
                    }}
                    className={`p-1.5 transition-all flex items-center justify-center bg-transparent border-none ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    {isListening ? <MicOff className="w-5 h-5 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] google-rainbow-icon" /> : <Mic className="w-5 h-5 google-rainbow-icon" />}
                  </motion.button>
                </Tooltip>
                <Tooltip text={isTtsEnabled ? "Disable TTS" : "Enable TTS"}>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    id="tts-toggle-button"
                    aria-label={isTtsEnabled ? "Disable text to speech" : "Enable text to speech"}
                    onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                    className={`flex p-1.5 transition-all items-center justify-center bg-transparent border-none ${isTtsEnabled ? 'text-primary' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    {isTtsEnabled ? <Volume2 className="w-5 h-5 drop-shadow-[0_0_5px_rgba(var(--primary-rgb),0.5)] google-rainbow-icon" /> : <VolumeX className="w-5 h-5 google-rainbow-icon" />}
                  </motion.button>
                </Tooltip>
                
                <div className="w-px h-6 bg-black/10 dark:bg-white/10 block" />

                <div className="group/send">
                  <AdvancedSendButton 
                    onClick={() => handleSend()}
                    disabled={!input.trim() && selectedFiles.length === 0}
                  />
                </div>
              </div>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-3 uppercase tracking-widest">
              Secured by Blockchain SHA-256 • Unified Edition
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showHandwriting && (
            <HandwritingCanvas 
              onRecognized={(text) => {
                setInput(prev => prev ? `${prev} ${text}` : text);
                setShowHandwriting(false);
              }}
              onClose={() => setShowHandwriting(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMoodDetection && (
            <MoodDetection 
              onClose={() => setShowMoodDetection(false)}
              onDetect={(emotionName) => {
                setShowMoodDetection(false);
                setIsListening(true);
                // Based on emotion, set a prompt context/opening line via text to speech logic or trigger AI
                const promptMsg = `User's current mood detected as: ${emotionName}. Acknowledge this appropriately and continue the conversation in a very contextual, empathetic way according to this mood.`;
                handleDirectAIQuery(promptMsg, emotionName);
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onClearHistory={clearHistory}
        isSfxEnabled={isSfxEnabled}
        setIsSfxEnabled={setIsSfxEnabled}
        isTtsEnabled={isTtsEnabled}
        setIsTtsEnabled={setIsTtsEnabled}
      />

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Image enlarged view"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-zoom-out"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-full max-h-full flex flex-col items-center gap-6"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 bg-zinc-900">
                <motion.img 
                  src={selectedImage} 
                  alt="Enlarged view" 
                  animate={{ scale: zoomLevel }}
                  className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                  style={{ imageRendering: 'crisp-edges' } as any}
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex items-center gap-4 bg-white/40 dark:bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-black/10 dark:border-white/10">
                <button 
                  aria-label="Zoom out image"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                  className="p-3 rounded-xl hover:bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-zinc-900 dark:text-white min-w-[3rem] text-center" aria-live="polite">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button 
                  aria-label="Zoom in image"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  className="p-3 rounded-xl hover:bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-white transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-2" />
                <button 
                  id="download-image-button"
                  aria-label="Download image"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage;
                    link.download = `generated-image-${Date.now()}.png`;
                    link.click();
                  }}
                  className="px-6 py-3 rounded-xl bg-primary text-zinc-900 dark:text-white font-bold text-sm shadow-[0_0_20px_rgba(var(--primary-color),0.3)] flex items-center gap-2 hover:opacity-90 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-900 dark:text-white font-bold text-sm hover:bg-zinc-700 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProfile(false);
                setIsEditingProfile(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel rainbow-border-color rainbow-border rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center rainbow-border shadow-[0_0_15px_rgba(var(--primary-color),0.3)]">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 id="profile-dialog-title" className="text-xl font-bold">User Profile</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {['username', 'fullName', 'dob', 'phone', 'address'].map((field) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                      {field === 'dob' ? 'Date of Birth' : field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    {isEditingProfile ? (
                      <input 
                        type={field === 'dob' ? 'date' : 'text'}
                        value={(profileData as any)[field] || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    ) : (
                      <div className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-xl p-3 text-sm font-medium">
                        {(profileData as any)[field] || 'Not specified'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setShowProfile(false);
                    setIsEditingProfile(false);
                  }}
                  className="flex-1 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-colors font-bold text-sm"
                >
                  Close
                </button>
                {isEditingProfile ? (
                  <button 
                    onClick={async () => {
                      if (user?.uid) {
                        try {
                          await updateProfile(user.uid, profileData);
                          setIsEditingProfile(false);
                        } catch (err) {
                          console.error("Failed to save profile:", err);
                        }
                      }
                    }}
                    className="flex-1 py-3 rounded-2xl rainbow-border bg-primary/10 hover:bg-primary/20 transition-all font-bold text-sm shadow-[0_0_20px_rgba(var(--primary-color),0.3)] text-zinc-900 dark:text-white"
                  >
                    Save Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex-1 py-3 rounded-2xl rainbow-border bg-primary/10 hover:bg-primary/20 transition-all font-bold text-sm shadow-[0_0_20px_rgba(var(--primary-color),0.3)] flex items-center justify-center gap-2 text-zinc-900 dark:text-white"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
