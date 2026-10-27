import { useEffect, useRef, useState } from 'react';

/** Short, locally synthesized cues. Audio starts only in a user gesture. */
export function useBrainSound() {
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('brain-sound') !== 'off'; } catch { return true; }
  });
  useEffect(() => () => { void context.current?.close().catch(() => {}); }, []);

  function play(kind: 'L' | 'R' | 'confirm' | 'back', force = false) {
    if (!enabled && !force) return;
    try {
      const ctx = context.current ??= new AudioContext();
      if (!master.current) {
        master.current = ctx.createGain();
        master.current.connect(ctx.destination);
      }
      const output = master.current;
      output.gain.setValueAtTime(.16, ctx.currentTime);
      const schedule = () => {
        if (ctx.state !== 'running') return;
        const notes = kind === 'L' ? [220, 330, 440] : kind === 'R' ? [261.63, 392, 523.25] : kind === 'back' ? [330, 220] : [440, 660];
        const now = ctx.currentTime;
        notes.forEach((frequency, i) => {
          const start = now + i * .075;
          const oscillator = ctx.createOscillator();
          const envelope = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency * .98, start);
          oscillator.frequency.exponentialRampToValueAtTime(frequency, start + .12);
          envelope.gain.setValueAtTime(0, start);
          envelope.gain.linearRampToValueAtTime(.22, start + .025);
          envelope.gain.exponentialRampToValueAtTime(.001, start + .65);
          oscillator.connect(envelope); envelope.connect(output);
          oscillator.start(start); oscillator.stop(start + .7);
          oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        });
      };
      if (ctx.state === 'suspended') void ctx.resume().then(schedule).catch(() => {});
      else schedule();
    } catch { /* The visual interaction remains available without Web Audio. */ }
  }

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem('brain-sound', next ? 'on' : 'off'); } catch { /* Optional preference. */ }
    if (next) play('confirm', true);
    else if (context.current && master.current) {
      master.current.gain.setTargetAtTime(0, context.current.currentTime, .025);
    }
  }
  return { enabled, toggle, play };
}
