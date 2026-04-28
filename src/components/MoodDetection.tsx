import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ScanFace, Activity, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MoodDetectionProps {
  onClose: () => void;
  onDetect: (emotion: string) => void;
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

export function MoodDetection({ onClose, onDetect }: MoodDetectionProps) {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<{ emotion: string, probability: number } | null>(null);
  const [hasFace, setHasFace] = useState<boolean | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        if (mounted) setIsModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        if (mounted) setError("Failed to load detection models. Please check your network connection.");
      }
    };

    loadModels();

    return () => {
      mounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera permission denied or camera not available. Please allow camera access.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isModelsLoaded && !isCameraActive) {
      startCamera();
    }
  }, [isModelsLoaded]);

  const handleVideoPlay = () => {
    const detectFace = async () => {
      if (videoRef.current && canvasRef.current && isCameraActive && isModelsLoaded) {
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          animationFrameRef.current = requestAnimationFrame(detectFace);
          return;
        }
        
        try {
          const detections = await faceapi.detectSingleFace(
            videoRef.current, 
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceExpressions();

          if (!videoRef.current || !canvasRef.current) return;

          if (detections) {
            setHasFace(true);
            const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
            const resizedDetections = faceapi.resizeResults(detections, dims);

            // Get dominant emotion
            const expressions = detections.expressions;
            const dominant = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b);
            
            setCurrentEmotion({ emotion: dominant[0], probability: dominant[1] });

            // Draw Custom Box
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              const box = resizedDetections.detection.box;
              
              // Rainbow border or Green border depending on requirement
              // The prompt asked for "green when face is accurately detected"
              ctx.strokeStyle = '#34A853'; // Green
              ctx.lineWidth = 4;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Add a subtle rainbow glow
              ctx.shadowColor = theme.primary;
              ctx.shadowBlur = 15;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              ctx.shadowBlur = 0; // reset
            }
          } else {
            setHasFace(false);
            setCurrentEmotion(null);
            const ctx = canvasRef.current.getContext('2d');
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } catch (e) {
          console.error("Detection error:", e);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    detectFace();
  };

  const formatEmotion = (emotion: string) => {
    const map: Record<string, string> = {
      happy: 'Happy 😊',
      sad: 'Sad 😢',
      angry: 'Angry 😠',
      neutral: 'Neutral 😐',
      fearful: 'Fearful 😨',
      disgusted: 'Disgusted 🤢',
      surprised: 'Surprised 😲'
    };
    return map[emotion] || emotion;
  };

  return (
    <div className="fixed inset-0 z-[300] bg-white/90 dark:bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full h-[90vh] max-w-6xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col rainbow-border-color border-2"
      >
        <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <ScanFace className="w-6 h-6 google-rainbow-border-icon" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Mood Detection</h2>
              <p className="text-xs text-zinc-400">Real-time emotion tracking AI</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 bg-zinc-100 dark:bg-black flex items-center justify-center overflow-hidden">
          {!isModelsLoaded ? (
            <div className="flex flex-col items-center gap-4">
              <Activity className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-mono text-zinc-400 tracking-widest uppercase">Loading Core Models...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
              <p className="text-red-400 text-sm">{error}</p>
              <button 
                onClick={startCamera}
                className="mt-4 px-6 py-2 bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 rounded-xl text-zinc-900 dark:text-white text-sm font-bold transition-all"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                onPlay={handleVideoPlay}
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
              />

              {/* Status Overlay */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-start pointer-events-none">
                <div className="bg-white/80 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${hasFace ? 'bg-green-500 shadow-[0_0_10px_#34A853]' : 'bg-red-500 shadow-[0_0_10px_#EA4335]'}`} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-wider uppercase">
                    {hasFace === null ? 'Scanning' : hasFace ? 'Face Locked' : 'No Face'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-zinc-200 dark:border-white/10">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Live Emotion Analysis</p>
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-lg">
                {currentEmotion ? formatEmotion(currentEmotion.emotion) : 'Analyzing...'}
              </span>
              {currentEmotion && (
                <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold font-mono">
                  {(currentEmotion.probability * 100).toFixed(1)}% confidence
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => currentEmotion && onDetect(currentEmotion.emotion)}
            disabled={!currentEmotion}
            className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden group ${
              currentEmotion 
                ? 'bg-primary text-black hover:scale-105 shadow-[0_0_30px_rgba(var(--primary-color),0.4)] google-rainbow-border-color border-2' 
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <div className="relative z-10 flex items-center gap-2">
              <Activity className="w-5 h-5 google-rainbow-border-icon" />
              Detect & Connect
            </div>
            {currentEmotion && (
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
