import React, { useRef } from 'react';

interface Props {
  onConfirm: (dataUrl: string) => void;
  onReset: () => void;
}

export default function ESignatureCanvas({ onConfirm, onReset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return;
    drawing.current = true;
    const ctx = c.getContext('2d')!;
    const pos = getPos(e, c);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const pos = getPos(e, c);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const reset = () => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, 400, 150);
    onReset();
  };

  const confirm = () => {
    if (canvasRef.current) onConfirm(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef} width={400} height={150}
        className="w-full border border-zinc-700 rounded-xl bg-zinc-800/50 cursor-crosshair touch-none"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stop}
      />
      <div className="flex gap-2">
        <button onClick={reset} className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm">Reset</button>
        <button onClick={confirm} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm">Confirm Signature</button>
      </div>
    </div>
  );
}
