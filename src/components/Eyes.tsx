import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

export default function HolographicCore({ emotion = 'neutral', isPulsing = false }: { emotion?: string, isPulsing?: boolean }) {
  const { theme } = useTheme();

  // Color mapping based on states
  const getCoreColor = () => {
    if (isPulsing) {
      if (theme.isDark) {
        return 'from-[#FFD700] to-amber-200 shadow-[0_0_80px_#FFD700]';
      } else {
        return 'from-[#FFD700] to-white shadow-[0_0_80px_rgba(255,215,0,0.8)]'; // Golden and white
      }
    }

    switch (emotion) {
      case 'happy': return 'from-emerald-400 to-teal-600 shadow-[0_0_60px_#10b981]';
      case 'angry': return 'from-red-500 to-orange-600 shadow-[0_0_60px_#ef4444]';
      case 'thinking': return 'from-purple-500 to-indigo-600 shadow-[0_0_80px_#8b5cf6]';
      case 'surprised': return 'from-blue-400 to-cyan-500 shadow-[0_0_60px_#3b82f6]';
      case 'sad': return 'from-blue-600 to-slate-700 shadow-[0_0_40px_#2563eb] opacity-80';
      case 'excited': return 'from-yellow-400 to-amber-600 shadow-[0_0_80px_#facc15]';
      default: return 'google-rainbow-gradient opacity-90 shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)]';
    }
  };

  const colors = React.useMemo(() => {
    const isDark = theme.isDark;
    if (isPulsing) {
      return {
        border: isDark ? '#fbbf24' : '#ffffff',
        inner: isDark ? 'rgba(251, 191, 36, 0.6)' : 'rgba(255, 255, 255, 0.8)'
      };
    }

    switch (emotion) {
      case 'happy': return { border: '#34d399', inner: 'rgba(52, 211, 153, 0.4)' };
      case 'angry': return { border: '#ef4444', inner: 'rgba(239, 68, 68, 0.4)' };
      case 'thinking': return { border: isDark ? '#a855f7' : '#8b5cf6', inner: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(139, 92, 246, 0.3)' };
      case 'surprised': return { border: '#60a5fa', inner: 'rgba(96, 165, 250, 0.4)' };
      case 'sad': return { border: '#2563eb', inner: 'rgba(37, 99, 235, 0.3)' };
      case 'excited': return { border: '#facc15', inner: 'rgba(250, 204, 21, 0.5)' };
      default: return { 
        border: isDark ? '#FFD700' : '#4285F4', // Gold for dark, Google Blue for light
        inner: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(66, 133, 244, 0.2)' 
      };
    }
  }, [theme.isDark, emotion, isPulsing]);

  const baseScale = (() => {
    if (isPulsing) return 1.05;
    switch (emotion) {
      case 'thinking': return 1.1;
      case 'excited': return 1.2;
      case 'sad': return 0.9;
      default: return 1;
    }
  })();

  const particles = Array.from({ length: 12 });

  return (
    <div className="flex justify-center items-center py-16 perspective-1000 relative w-full h-[200px]">
      <motion.div 
        animate={isPulsing ? {
          scale: [baseScale, baseScale * 1.15, baseScale],
          opacity: [0.8, 1, 0.8]
        } : {
          scale: baseScale,
          opacity: 1
        }}
        transition={isPulsing ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : { type: 'spring', damping: 20, stiffness: 100 }}
        className="hologram-siri-container relative z-10"
      >
        <motion.div 
          animate={isPulsing ? {
            borderColor: colors.border,
            boxShadow: [
              `inset 0 0 0 1.5px ${colors.inner}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset -10px -10px 30px rgba(0, 200, 255, 0.4), inset 10px 10px 30px rgba(255, 100, 150, 0.4), 0 0 20px ${theme.isDark ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.5)'}`,
              `inset 0 0 0 1.5px ${colors.inner}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset -10px -10px 30px rgba(0, 200, 255, 0.4), inset 10px 10px 30px rgba(255, 100, 150, 0.4), 0 0 60px ${theme.isDark ? '#FFD700' : 'rgba(255,215,0,0.8)'}`,
              `inset 0 0 0 1.5px ${colors.inner}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset -10px -10px 30px rgba(0, 200, 255, 0.4), inset 10px 10px 30px rgba(255, 100, 150, 0.4), 0 0 20px ${theme.isDark ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.5)'}`
            ]
          } : {
            borderColor: colors.border,
            boxShadow: `inset 0 0 0 1.5px ${colors.inner}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset -10px -10px 30px rgba(0, 200, 255, 0.4), inset 10px 10px 30px rgba(255, 100, 150, 0.4)`
          }}
          transition={isPulsing ? {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : undefined}
          className={`siri-hologram-sphere bg-gradient-to-br ${getCoreColor()}`}
        >
          <div className="siri-fluid-swirl-1" />
          <div className="siri-fluid-swirl-2" />
          <div className="siri-sphere-glare" />

          {/* Shimmer Particles */}
          <AnimatePresence>
            {isPulsing && particles.map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                  x: (Math.random() - 0.5) * 80,
                  y: (Math.random() - 0.5) * 80,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 1 + Math.random() * 1,
                  repeat: Infinity,
                  delay: Math.random() * 1.5,
                  ease: "easeInOut"
                }}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]"
                style={{ transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </AnimatePresence>

        </motion.div>
      </motion.div>
    </div>
  );
}
