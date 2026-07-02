'use client';

import { useState, useEffect, useCallback } from 'react';

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
  { ts: '', type: 'verify', message: 'Oracle state root updated', hash: 'i9j0...k1l2' },
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

export function ProofFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>(() =>
    Array.from({ length: 5 }, (_, i) => generateEntry(i))
  );
  const [idCounter, setIdCounter] = useState(5);

  const addEntry = useCallback(() => {
    setIdCounter((prev) => {
      const next = prev + 1;
      setEntries((current) => [generateEntry(next), ...current.slice(0, 49)]);
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(addEntry, 3500);
    return () => clearInterval(interval);
  }, [addEntry]);

  return (
    <section className="border-b border-[var(--color-line-hairline)] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-sm font-[500] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            On-Chain Proof Feed
          </h2>
          <span
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            LIVE
          </span>
        </div>
        <div
          className="overflow-hidden rounded-sm border border-[var(--color-line-hairline)]"
          style={{ backgroundColor: 'rgba(10,13,11,0.6)' }}
        >
          <div className="max-h-[320px] overflow-y-auto py-2">
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
                <span className="flex-1 text-[var(--color-text-secondary)]">
                  {entry.message}
                </span>
                <span className="hidden shrink-0 text-[var(--color-text-tertiary)] sm:block">
                  {entry.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
