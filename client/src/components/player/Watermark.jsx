import { useState, useEffect } from 'react';

/**
 * Dynamic watermark overlay displaying student's name & email.
 * Repositions to a random spot every 15-20 seconds to discourage screen capture.
 */
export default function Watermark({ user }) {
  const [position, setPosition] = useState({ top: '15%', left: '20%' });

  useEffect(() => {
    if (!user) return;

    const moveWatermark = () => {
      // Keep within bounds: 10% to 75%
      const top = Math.floor(Math.random() * 65 + 10) + '%';
      const left = Math.floor(Math.random() * 60 + 10) + '%';
      setPosition({ top, left });
    };

    // Initial random position
    moveWatermark();

    // Move every 16 seconds
    const interval = setInterval(moveWatermark, 16000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const label = `${user.firstName || ''} ${user.lastName || ''} • ${user.email || ''}`.trim();

  return (
    <div
      className="pointer-events-none absolute z-30 select-none transition-all duration-1000 ease-in-out"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="rounded-md bg-black/25 px-2.5 py-1 text-[11px] sm:text-xs font-mono font-medium text-white/40 tracking-wider backdrop-blur-[1px] shadow-sm">
        {label}
      </div>
    </div>
  );
}
