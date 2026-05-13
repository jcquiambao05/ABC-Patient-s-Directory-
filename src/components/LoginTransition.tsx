import React, { useEffect, useState } from 'react';

interface Props {
  userName: string | null;
  role: string | null;
  onDone: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff',
  admin: 'Doctor',
  superadmin: 'Administrator',
};

export default function LoginTransition({ userName, role, onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const name = userName?.split(' ')[0] || 'there';
  const roleLabel = role ? ROLE_LABEL[role] || role : '';

  useEffect(() => {
    // Progress bar: 0 → 100 over 1200ms
    const start = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    // Phase transitions
    const holdTimer = setTimeout(() => setPhase('hold'), 200);
    const exitTimer = setTimeout(() => setPhase('exit'), 900);
    const doneTimer = setTimeout(() => onDone(), 1400);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.45s ease-in' : 'opacity 0.2s ease-out',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          transform: phase === 'enter' ? 'scale(0.85) translateY(8px)' : 'scale(1) translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out',
        }}
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 mb-6">
          {/* Pulse ring */}
          <div className="absolute w-16 h-16 rounded-2xl bg-emerald-400 animate-ping opacity-20" />
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M4 16 L10 16 L13 8 L16 24 L19 12 L22 16 L28 16"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Greeting text */}
      <div
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity 0.35s ease-out 0.15s, transform 0.35s ease-out 0.15s',
        }}
        className="text-center"
      >
        <p className="text-2xl font-bold text-zinc-900 tracking-tight">
          {greeting}, {name}
        </p>
        {roleLabel && (
          <p className="text-sm text-zinc-400 mt-1 font-medium">
            Signed in as <span className="text-emerald-600">{roleLabel}</span>
          </p>
        )}
      </div>

      {/* Dots loader */}
      <div
        className="flex items-center gap-1.5 mt-8"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.3s ease-out 0.25s',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{
              animation: `dotBounce 0.9s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Progress bar — bottom of screen */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100">
        <div
          className="h-full bg-emerald-500 rounded-full"
          style={{
            width: `${progress}%`,
            transition: 'width 0.05s linear',
          }}
        />
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
