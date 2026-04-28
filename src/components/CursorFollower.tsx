import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function CursorFollower() {
  const { theme } = useTheme();
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const newRipple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
      };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1000);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        const newRipple = {
          id: Date.now(),
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setRipples(prev => [...prev, newRipple]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 1000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleTouchStart);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Cursor Follower */}
      <motion.div
        animate={{
          x: mousePos.x - theme.cursorSize / 2,
          y: mousePos.y - theme.cursorSize / 2,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 250, mass: 0.5 }}
        className="rounded-full blur-[2px]"
        style={{
          width: theme.cursorSize,
          height: theme.cursorSize,
          backgroundColor: theme.primary,
          boxShadow: `0 0 ${theme.cursorSize}px ${theme.primary}`,
          opacity: 0.6,
        }}
      />

      {/* Click Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.5, scale: 0, x: ripple.x, y: ripple.y }}
            animate={{ opacity: 0, scale: 4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute rounded-full border-2"
            style={{
              width: theme.cursorSize * 2,
              height: theme.cursorSize * 2,
              borderColor: theme.primary,
              marginLeft: -theme.cursorSize,
              marginTop: -theme.cursorSize,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
