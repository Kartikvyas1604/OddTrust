'use client';

import { useState, useEffect } from 'react';

function useSlot() {
  const [slot, setSlot] = useState(310_442_891);
  useEffect(() => {
    const interval = setInterval(() => {
      setSlot((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return slot;
}

export function TopStrip() {
  const slot = useSlot();
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <header
      className="flex items-center justify-between border-b border-[var(--color-line-hairline)] px-6 py-3"
      style={{ animation: 'count-up 0.6s ease-out 0ms both' }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="text-xl font-[500] tracking-tight"
          style={{ fontFamily: 'var(--font-fraunces), serif', letterSpacing: '-0.02em' }}
        >
          OddsTrust
        </h1>
        <span className="hidden h-5 w-px bg-[var(--color-line-hairline)] sm:block" />
        <div className="hidden items-center gap-1.5 sm:flex" style={{ animation: 'count-up 0.6s ease-out 150ms both' }}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-pitch-green)] animate-pulse-dot"
          />
          <span className="text-xs font-[400] uppercase tracking-wider" style={{ fontFamily: 'var(--font-fraunces), serif', color: 'var(--color-pitch-green)' }}>
            Oracle Status: Active
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="hidden text-xs text-[var(--color-text-tertiary)] md:block"
          style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
        >
          {ts}
        </span>
        <span
          className="text-xs text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
        >
          Slot #{slot.toLocaleString()}
        </span>
      </div>
    </header>
  );
}
