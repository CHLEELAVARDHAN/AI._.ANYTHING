import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Chat from './components/Chat';
import CursorFollower from './components/CursorFollower';
import { motion, AnimatePresence } from 'motion/react';

function TVPowerOverlay({ isPoweringOff, isPoweringOn }: { isPoweringOff: boolean, isPoweringOn: boolean }) {
  return (
    <AnimatePresence>
      {(isPoweringOff || isPoweringOn) && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-black" />
          <motion.div 
            className={`w-full h-full bg-transparent ${isPoweringOff ? 'crt-shutdown' : 'crt-power-on'}`}
          >
            <div className="w-full h-full bg-white/10 dark:bg-zinc-900/10 backdrop-blur-sm" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isPoweringOn, setIsPoweringOn] = useState(false);
  const [showUI, setShowUI] = useState(false);

  const playPowerSound = (type: 'on' | 'off') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'off') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(0.01, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.5);
      }
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      setIsPoweringOn(true);
      playPowerSound('on');
      const timer = setTimeout(() => {
        setIsPoweringOn(false);
        setShowUI(true);
      }, 700);
      return () => clearTimeout(timer);
    } else if (!isLoading && !user) {
      setShowUI(true);
      setIsPoweringOff(false);
    }
  }, [isLoading, !!user]);

  const handlePowerOff = async () => {
    setIsPoweringOff(true);
    playPowerSound('off');
    setTimeout(async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }, 600);
  };

  if (isLoading || (user && (!showUI || isPoweringOn))) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center transition-colors duration-300">
        <div className="power-off-dot" />
      </div>
    );
  }

  return (
    <>
      <TVPowerOverlay isPoweringOff={isPoweringOff} isPoweringOn={isPoweringOn} />
      <CursorFollower />
      {user ? (
        <Chat onPowerOff={handlePowerOff} />
      ) : (
        <Login />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
