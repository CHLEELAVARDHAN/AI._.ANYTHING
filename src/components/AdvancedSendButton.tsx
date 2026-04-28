import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Rocket } from 'lucide-react';

interface AdvancedSendButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const AdvancedSendButton: React.FC<AdvancedSendButtonProps> = ({ onClick, disabled = false }) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleClick = () => {
    setIsLaunching(true);
    onClick();
    setTimeout(() => setIsLaunching(false), 1000);
  };

  return (
    <div className="relative group/btn">
      <motion.button
        id="send-message-button"
        aria-label="Send message"
        disabled={disabled || isLaunching}
        onClick={handleClick}
        whileTap={{ scale: 0.9 }}
        className={`relative p-2 flex items-center justify-center overflow-visible transition-all duration-300 bg-transparent border-none ${
          disabled 
            ? 'text-zinc-500 cursor-not-allowed opacity-50' 
            : 'text-zinc-900 dark:text-white active:scale-90 hover:scale-110'
        }`}
      >
        <AnimatePresence mode="wait">
          {isLaunching ? (
            <motion.div
              key="rocket"
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: -50, opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeIn" }}
              className="absolute"
            >
              <Rocket className={`w-5 h-5 ${disabled ? '' : ''}`} />
            </motion.div>
          ) : (
            <motion.div
              key="send"
              initial={{ y: 0, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Send className={`w-5 h-5 ${disabled ? '' : 'google-rainbow-icon'}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

