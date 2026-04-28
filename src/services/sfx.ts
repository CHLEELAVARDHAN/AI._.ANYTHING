
const AudioContext = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
let audioCtx: any = null;

const getAudioCtx = () => {
  if (!audioCtx && AudioContext) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  const ctx = getAudioCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
};

export const sfx = {
  messageReceived: () => {
    playTone(880, 'sine', 0.2, 0.05); // High subtle blip
    setTimeout(() => playTone(1100, 'sine', 0.3, 0.03), 50);
  },
  taskCompleted: () => {
    playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.3, 0.05), 200); // G5
  },
  error: () => {
    playTone(150, 'triangle', 0.5, 0.1); // Low buzz
    setTimeout(() => playTone(100, 'triangle', 0.5, 0.1), 100);
  },
  click: () => {
    playTone(1200, 'sine', 0.05, 0.02);
  }
};
