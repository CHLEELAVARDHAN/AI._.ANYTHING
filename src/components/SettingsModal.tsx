import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Check, Palette, Info, ShieldAlert, Moon, Sun, Search, Globe, Shield, Volume2, Headphones } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Tooltip from './Tooltip';
import { getSettings, updateSettings } from '../services/db';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  onClearHistory,
  isSfxEnabled,
  setIsSfxEnabled,
  isTtsEnabled,
  setIsTtsEnabled
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onClearHistory: () => void,
  isSfxEnabled: boolean,
  setIsSfxEnabled: (v: boolean) => void,
  isTtsEnabled: boolean,
  setIsTtsEnabled: (v: boolean) => void
}) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [systemInstruction, setSystemInstruction] = useState('');
  const [searchEngine, setSearchEngine] = useState('google');
  const [cursorSize, setCursorSize] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      getSettings(user.uid).then(data => {
        if (!data) return;
        if (data.systemInstruction) setSystemInstruction(data.systemInstruction);
        if (data.searchEngine) setSearchEngine(data.searchEngine);
        if (data.cursorSize) setCursorSize(data.cursorSize);
        setTheme({ 
          primary: data.themeColor || theme.primary, 
          cursorSize: data.cursorSize || 20,
          ...(data.isDark !== undefined && { isDark: data.isDark }),
        });
      });
    }
  }, [isOpen, user]);

  const handleApply = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    await updateSettings(user.uid, { 
      themeColor: theme.primary, 
      systemInstruction,
      searchEngine,
      cursorSize,
      isDark: theme.isDark
    });
    setTheme({ cursorSize });
    setIsSaving(false);
    onClose();
  };

  const colors = [
    '#eab308', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#ffffff'
  ];

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg glass-panel rounded-[2rem] overflow-hidden shadow-2xl text-zinc-900 dark:text-white max-h-[90vh] flex flex-col"
      >
        <div className="p-4 lg:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/10 dark:bg-black/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-color),0.2)]">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <h2 id="settings-dialog-title" className="text-lg lg:text-xl font-bold tracking-tight">System Settings</h2>
          </div>
          <button 
            aria-label="Close settings"
            onClick={onClose} 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 lg:p-6 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block">Theme Color</label>
            <div className="flex flex-wrap gap-3">
              {colors.map(c => (
                <Tooltip key={c} text={`Apply ${c === '#ffffff' ? 'White' : 'Color'} Theme`}>
                  <button 
                    onClick={() => setTheme({ primary: c })}
                    className={`w-10 h-10 rounded-full border transition-all ${theme.primary === c ? 'border-zinc-900 dark:border-white scale-110 shadow-md' : 'border-black/5 dark:border-white/5 shadow-sm'}`}
                    style={{ backgroundColor: c }}
                  />
                </Tooltip>
              ))}
            </div>
          </section>

          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block">Interface Mode</label>
            <div className="flex gap-3">
              <Tooltip text="Sleek Dark Mode" className="flex-1">
                <button 
                  onClick={() => setTheme({ isDark: true })}
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${theme.isDark ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                >
                  <Moon className="w-4 h-4" />
                  Dark Mode
                </button>
              </Tooltip>
              <Tooltip text="Clean Light Mode" className="flex-1">
                <button 
                  onClick={() => setTheme({ isDark: false })}
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${!theme.isDark ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                >
                  <Sun className="w-4 h-4" />
                  Light Mode
                </button>
              </Tooltip>
            </div>
          </section>

          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block">Audio Feedback</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold tracking-tight">Sound Effects (SFX)</p>
                    <p className="text-[9px] text-zinc-500">Audio cues for AI actions and messages</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSfxEnabled(!isSfxEnabled)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isSfxEnabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-800'}`}
                >
                  <motion.div 
                    animate={{ x: isSfxEnabled ? 20 : 2 }}
                    className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold tracking-tight">Text-to-Speech (TTS)</p>
                    <p className="text-[9px] text-zinc-500">Read AI responses automatically</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isTtsEnabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-800'}`}
                >
                  <motion.div 
                    animate={{ x: isTtsEnabled ? 20 : 2 }}
                    className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </section>

          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block">Default Search Engine</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'google', icon: Search, color: 'text-blue-400', label: 'Google' },
                { id: 'yahoo', icon: Globe, color: 'text-purple-400', label: 'Yahoo' },
                { id: 'duckduckgo', icon: Shield, color: 'text-orange-400', label: 'DuckDuckGo' }
              ].map(engine => (
                <Tooltip key={engine.id} text={`Use ${engine.label}`}>
                  <button 
                    onClick={() => setSearchEngine(engine.id)}
                    className={`w-full flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${searchEngine === engine.id ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-100 dark:border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-50 dark:bg-black text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    <engine.icon className={`w-5 h-5 ${searchEngine === engine.id ? 'text-primary' : engine.color}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{engine.id}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </section>

          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block">Cursor / Touch Point Size</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={cursorSize}
                onChange={(e) => setCursorSize(parseInt(e.target.value))}
                className="flex-1 accent-primary h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 w-8 text-right">{cursorSize}px</span>
            </div>
          </section>

          <section>
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4 block">System Instructions</label>
            <textarea 
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/30 h-32 resize-none glow-focus text-zinc-900 dark:text-white"
              placeholder="Define how the AI should behave..."
            />
          </section>

          <section className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <ShieldAlert className="w-5 h-5 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                </div>
                <h3 className="font-bold tracking-tight">Danger Zone</h3>
              </div>
              <p className="text-xs text-red-900/60 dark:text-red-400/80 mb-5 leading-relaxed font-medium">Clearing data will permanently delete your entire chat history and reset all settings. This action is irreversible.</p>
              <button 
                onClick={() => {
                  onClearHistory();
                }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white transition-all text-sm font-bold border border-red-500/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 lg:p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-3 bg-white/10 dark:bg-black/10 backdrop-blur-md">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm font-bold order-2 sm:order-1 border border-transparent hover:border-black/5 dark:hover:border-white/10">Cancel</button>
          <button 
            onClick={handleApply}
            disabled={isSaving}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl bg-primary hover:opacity-90 transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--primary-color),0.4)] btn-glow order-1 sm:order-2 ${theme.primary === '#ffffff' || theme.primary === '#eab308' ? 'text-black' : 'text-white'}`}
          >
            {isSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Apply Changes</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
