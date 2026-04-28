import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pencil, 
  PenTool, 
  Paintbrush, 
  Eraser, 
  Trash2, 
  Check, 
  X, 
  Palette, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { generateAIResponse } from '../services/ai';

interface HandwritingCanvasProps {
  onRecognized: (text: string) => void;
  onClose: () => void;
}

type Tool = 'pencil' | 'pen' | 'marker' | 'eraser';

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({ onRecognized, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#4285F4');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const colors = [
    '#4285F4', // Blue
    '#EA4335', // Red
    '#FBBC05', // Yellow
    '#34A853', // Green
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#000000', // Black
    '#FFFFFF', // White
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to full window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Fill with slight transparency to show background
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);

    // Tool effects
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 40;
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      
      if (isGlowing) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = color;

      switch (tool) {
        case 'pencil':
          ctx.lineWidth = 1.5;
          // More subtle pressure-like opacity variation
          ctx.globalAlpha = 0.35 + (Math.sin(Date.now() / 50) * 0.1);
          break;
        case 'pen':
          ctx.lineWidth = 4;
          ctx.globalAlpha = 1.0;
          break;
        case 'marker':
          // Bolder, higher-opacity strokes
          ctx.lineWidth = 18;
          ctx.globalAlpha = 0.98;
          break;
      }
      ctx.stroke();
    }

    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Auto-trigger recognition after a short pause if desired
    // For this implementation, we'll adds a "Recognize" button for better control
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleRecognize = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecognizing(true);
    try {
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      const response = await generateAIResponse(
        "Convert the handwriting, symbols, or sketches in this image into clear digital text or descriptions. If it's handwriting, transcribe it. If it's a diagram, describe it concisely. Only return the transcribed text or description, nothing else.",
        [],
        {
          files: [{ data: dataUrl, mimeType: 'image/png' }]
        }
      );

      if (response && response.text) {
        onRecognized(response.text.trim());
      }
    } catch (error) {
      console.error("Recognition failed:", error);
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="application"
      aria-label="Handwriting and drawing input canvas"
      className="fixed inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-md"
    >
      <canvas
        id="handwriting-canvas"
        ref={canvasRef}
        aria-label="Drawing area. Use mouse or touch to draw."
        role="img"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="cursor-crosshair w-full h-full"
      />

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl p-2 sm:p-3 rounded-[2rem] border-2 rainbow-border-color shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-[95vw] sm:max-w-none">
        <div className="flex gap-1 pr-0 sm:pr-3 border-b sm:border-b-0 sm:border-r-2 rainbow-divider w-full sm:w-auto justify-center">
          <ToolButton 
            id="pencil-tool"
            active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={<Pencil className="w-4 h-4"/>} label="Pencil" />
          <ToolButton 
            id="pen-tool"
            active={tool === 'pen'} onClick={() => setTool('pen')} icon={<PenTool className="w-4 h-4"/>} label="Pen" />
          <ToolButton 
            id="marker-tool"
            active={tool === 'marker'} onClick={() => setTool('marker')} icon={<Paintbrush className="w-4 h-4"/>} label="Marker" />
          <ToolButton 
            id="eraser-tool"
            active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser className="w-4 h-4"/>} label="Eraser" />
        </div>

        <div className="flex gap-1.5 px-0 sm:px-3 py-1 sm:py-0 w-full sm:w-auto justify-center overflow-x-auto scrollbar-hide">
          {colors.slice(0, 6).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border transition-all ${color === c ? 'scale-110 border-primary ring-2 ring-primary/20' : 'border-white/10 hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            onClick={() => setIsGlowing(!isGlowing)}
            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isGlowing ? 'scale-110 border-primary rainbow-border' : 'border-zinc-700'}`}
          >
            <Sparkles className="w-3 h-3 text-primary" />
          </button>
        </div>

        <div className="flex gap-2 items-center pl-0 sm:pl-2 w-full sm:w-auto justify-center">
          <button 
            id="clear-canvas-button"
            onClick={clearCanvas}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button 
            id="recognize-drawing-button"
            onClick={handleRecognize}
            disabled={isRecognizing}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[9px] transition-all ${
              isRecognizing 
              ? 'bg-zinc-800 text-zinc-600' 
              : 'bg-primary text-black hover:scale-105 shadow-lg shadow-primary/20'
            }`}
          >
            {isRecognizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {isRecognizing ? 'Wait' : 'Apply'}
          </button>

          <button 
            id="close-canvas-button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isGlowing && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur rounded-full border border-white/20 text-white text-[10px] items-center gap-2 flex font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          Glowing Mode Active
        </div>
      )}
    </motion.div>
  );
};

interface ToolButtonProps {
  id?: string;
  'aria-label'?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ id, active, onClick, icon, label }) => (
  <button
    id={id}
    aria-label={label}
    onClick={onClick}
    className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 group relative ${
      active 
      ? 'bg-primary/20 text-primary scale-110' 
      : 'text-zinc-500 hover:bg-white/10'
    }`}
    title={label}
  >
    {icon}
    {active && (
      <motion.div 
        layoutId="activeTool"
        className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
      />
    )}
  </button>
);
