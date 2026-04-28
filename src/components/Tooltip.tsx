import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ children, text, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top': return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom': return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default: return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(true)}
      onTouchEnd={() => setTimeout(() => setIsVisible(false), 1500)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 5 }}
            className={`absolute z-[100] px-3 py-1.5 bg-zinc-900/90 dark:bg-zinc-100/90 backdrop-blur-md border border-white/10 dark:border-black/10 rounded-lg shadow-xl pointer-events-none whitespace-nowrap ${getPositionClasses()}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900">
              {text}
            </span>
            <div className={`absolute w-2 h-2 bg-zinc-900/90 dark:bg-zinc-100/90 border-white/10 dark:border-black/10 rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t' :
              'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
