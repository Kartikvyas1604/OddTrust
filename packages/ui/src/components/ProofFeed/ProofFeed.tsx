'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FeedEntry {
  id: number;
  ts: string;
  type: 'check' | 'inconsistency' | 'verify';
  message: string;
  hash: string;
}

const templates: Omit<FeedEntry, 'id'>[] = [
  { ts: '', type: 'check', message: 'Consistency check passed: Brazil vs Argentina', hash: '7x3k...a9f2' },
  { ts: '', type: 'check', message: 'Margin validation: Germany vs France', hash: 'b4d1...e7c3' },
  { ts: '', type: 'inconsistency', message: 'Margin anomaly detected: England vs Spain', hash: 'f8a2...b1d4' },
  { ts: '', type: 'verify', message: 'On-chain proof committed to slot 310442894', hash: 'c5e9...f2a7' },
  { ts: '', type: 'check', message: 'Consistency check passed: Portugal vs Netherlands', hash: 'a1b2...c3d4' },
  { ts: '', type: 'inconsistency', message: 'Odds deviation > threshold: Belgium vs Morocco', hash: 'e5f6...g7h8' },
  { ts: '', type: 'verify', message: 'Oracle state root updated on-chain', hash: 'i9j0...k1l2' },
  { ts: '', type: 'check', message: 'Consistency check passed: Senegal vs Japan', hash: 'm3n4...o5p6' },
  { ts: '', type: 'inconsistency', message: 'Suspicious margin movement: Australia vs Denmark', hash: 'q7r8...s9t0' },
];

function generateEntry(id: number): FeedEntry {
  const tpl = templates[id % templates.length];
  return {
    ...tpl,
    id,
    ts: new Date().toISOString().replace('T', ' ').slice(11, 19),
  };
}

const feedColors = {
  check: 'var(--color-pitch-green)',
  inconsistency: 'var(--color-signal-amber)',
  verify: 'var(--color-text-tertiary)',
};

const feedLabels = {
  check: 'CHECK',
  inconsistency: 'ALERT',
  verify: 'PROOF',
};

export function ProofFeed() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [entries, setEntries] = useState<FeedEntry[]>(() =>
    Array.from({ length: 6 }, (_, i) => generateEntry(i))
  );
  const [idCounter, setIdCounter] = useState(6);

  const addEntry = useCallback(() => {
    setIdCounter((prev) => {
      const next = prev + 1;
      setEntries((current) => [generateEntry(next), ...current.slice(0, 49)]);
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(addEntry, 4000);
    return () => clearInterval(interval);
  }, [addEntry]);

  return (
    <section
      ref={sectionRef}
      className="border-b border-[var(--color-line-hairline)] px-6 py-10"
    >
      <div
        className="mx-auto max-w-4xl transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-sm font-[500] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            On-Chain Proof Feed
          </h2>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-pitch-green)] animate-pulse-dot" />
            <span
              className="text-[11px] text-[var(--color-text-tertiary)]"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              STREAMING
            </span>
          </span>
        </div>
        <div
          className="overflow-hidden rounded-sm border border-[var(--color-line-hairline)]"
          style={{ backgroundColor: 'rgba(10,13,11,0.6)' }}
        >
          <div className="max-h-[360px] overflow-y-auto py-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="animate-feed-enter flex items-center gap-3 px-4 py-1.5 text-[12px]"
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                <span className="w-14 shrink-0 text-[var(--color-text-tertiary)]">
                  {entry.ts}
                </span>
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: feedColors[entry.type] }}
                />
                <span className="flex-1 text-[var(--color-text-secondary)] truncate">
                  {entry.message}
                </span>
                <span
                  className="hidden shrink-0 text-[10px] uppercase tracking-wider sm:block"
                  style={{ color: feedColors[entry.type] }}
                >
                  {feedLabels[entry.type]}
                </span>
                <span className="hidden shrink-0 text-[var(--color-text-tertiary)] md:block">
                  {entry.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            {entries.length} entries · latest proof: 0x7a3f...b91e
          </span>
          <span
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            auto-updates every 4s
          </span>
        </div>
      </div>
    </section>
  );
}
