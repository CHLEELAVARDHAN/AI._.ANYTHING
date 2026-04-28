import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chrome, Power } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function Login() {
  const { theme } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSystemOff, setIsSystemOff] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Login blocked by browser. Please disable adblockers/trackers, allow third-party cookies, or open the app in a new tab to sign in.');
      } else {
        setError(`Failed to sign in: ${err.message}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] flex items-center justify-center p-4 overflow-hidden relative transition-colors duration-300">
      <AnimatePresence mode="wait">
        {isSystemOff ? (
          <motion.div 
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSystemOff(false)}
              className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center text-primary/50 hover:text-primary hover:border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all"
            >
              <Power className="w-8 h-8" />
            </motion.button>
            <div className="flex flex-col items-center gap-1">
              <p className={`text-[10px] font-mono uppercase tracking-[0.4em] font-black ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                STANDBY MODE • {isOnline ? 'ONLINE' : 'OFFLINE'}
              </p>
              <div className={`h-[1px] w-12 transition-all duration-1000 ${isOnline ? 'bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="text-center mb-12 flex flex-col items-center">
              <h1 className="text-4xl font-bold tracking-tighter mb-2 rainbow-text">AI._.ANYTHING</h1>
              <p className="text-zinc-500 uppercase tracking-[0.3em] text-[10px] font-bold">Unified Edition</p>
            </div>

            <div className="glass-panel border-black/5 dark:border-white/5 rounded-[24px] p-8 shadow-xl">
              <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Initialize Core</h2>
              <p className="text-zinc-500 text-xs mb-8 font-mono">AUTHORIZED ACCESS ONLY • SECURE TUNNEL ACTIVE</p>

              <div className="space-y-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 group text-base"
                >
                  <Chrome className="w-5 h-5 text-white dark:text-black opacity-80" />
                  {loading ? 'SYNCING...' : 'POWER ON WITH GOOGLE'}
                </motion.button>
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center font-medium flex flex-col gap-2"
                  >
                    <span>{error}</span>
                    {error.includes('blocked by browser') && window.self !== window.top && (
                      <a 
                        href={window.location.href} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:underline font-bold"
                      >
                        Open App in New Tab
                      </a>
                    )}
                  </motion.div>
                )}

                <button 
                  onClick={() => setIsSystemOff(true)}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[9px] font-bold uppercase tracking-widest transition-colors mt-4"
                >
                  Return to Standby
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
