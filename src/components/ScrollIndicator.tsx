import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ScrollIndicatorProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ containerRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [indicatorY, setIndicatorY] = useState(0);
  const lastScrollTop = useRef(0);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = currentScrollTop / scrollHeight;

      if (currentScrollTop > lastScrollTop.current) {
        setDirection('down');
      } else if (currentScrollTop < lastScrollTop.current) {
        setDirection('up');
      }

      // Calculate position (with animation logic)
      // When scrolling up, line animates downward
      // When scrolling down, line animates upward
      // Actually the user wants: "when user scrolls upward line animates downward; when downward line animates upward"
      // This is an inverse mapping for creative feedback.
      
      const pos = progress * 100;
      setIndicatorY(pos);

      setIsVisible(true);
      lastScrollTop.current = currentScrollTop;

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
        setDirection(null);
      }, 1500);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="fixed right-2 top-20 bottom-20 w-1 z-40 pointer-events-none"
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-zinc-200/20 dark:bg-zinc-800/20 rounded-full" />
          
          {/* Animated Indicator Line */}
          <motion.div
            animate={{ 
              top: `${direction === 'up' ? Math.min(indicatorY + 10, 90) : Math.max(indicatorY - 10, 0)}%`,
              height: '40px'
            }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="absolute left-0 w-full rounded-full google-rainbow-gradient shadow-[0_0_10px_rgba(66,133,244,0.5)]"
            style={{ 
              boxShadow: '0 0 15px rgba(var(--primary-rgb), 0.5)',
              borderWidth: '2px',
              borderStyle: 'solid'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
