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

const feedBg = {
  check: 'rgba(57,255,106,0.04)',
  inconsistency: 'rgba(255,177,60,0.04)',
  verify: 'rgba(78,93,85,0.04)',
};

const feedBorder = {
  check: 'rgba(57,255,106,0.08)',
  inconsistency: 'rgba(255,177,60,0.08)',
  verify: 'rgba(78,93,85,0.08)',
};

const feedBadgeBg = {
  check: 'rgba(57,255,106,0.12)',
  inconsistency: 'rgba(255,177,60,0.12)',
  verify: 'rgba(78,93,85,0.15)',
};

const typeIcons = {
  check: '\u2713',
  inconsistency: '\u26A0',
  verify: '\u25C8',
};

export function ProofFeed() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(6);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

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

  const addEntry = useCallback(() => {
    if (paused) return;
    const id = idRef.current++;
    setEntries((current) => [generateEntry(id), ...current.slice(0, 49)]);
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(addEntry, 4000);
    return () => clearInterval(interval);
  }, [addEntry]);

  const typeCount = entries.reduce(
    (acc, e) => {
      acc[e.type]++;
      return acc;
    },
    { check: 0, inconsistency: 0, verify: 0 }
  );

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
          <div className="flex items-center gap-3">
            <h2
              className="text-sm font-[500] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              On-Chain Proof Feed
            </h2>
            <span className="hidden h-3 w-px bg-[var(--color-line-hairline)] sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-pitch-green)] animate-pulse-dot" />
              <span
                className="text-[11px] text-[var(--color-text-tertiary)]"
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                {paused ? 'PAUSED' : 'STREAMING'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-sm border border-[var(--color-line-hairline)] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            {paused ? '\u25B6 Resume' : '\u23F8 Pause'}
          </button>
        </div>

        <div
          className="overflow-hidden rounded-sm border border-[var(--color-line-hairline)]"
          style={{ backgroundColor: 'rgba(10,13,11,0.6)' }}
        >
          <div className="flex items-center gap-1.5 border-b border-[var(--color-line-hairline)] px-3 py-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-signal-red)] opacity-60" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-signal-amber)] opacity-60" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-pitch-green)] opacity-60" />
            <span
              className="ml-2 text-[10px] text-[var(--color-text-tertiary)]"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              oracle@trust:~/proof-feed$
            </span>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[360px] overflow-y-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-line-hairline) transparent',
            }}
          >
            <style>{`
              .proof-feed-scroll::-webkit-scrollbar {
                width: 4px;
              }
              .proof-feed-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .proof-feed-scroll::-webkit-scrollbar-thumb {
                background: var(--color-line-hairline);
                border-radius: 2px;
              }
            `}</style>
            <div className="proof-feed-scroll">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-3 border-b border-[var(--color-line-hairline)]/40 px-4 py-2 text-[12px] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  style={{
                    fontFamily: 'var(--font-martian-mono), monospace',
                    animation: i === 0 ? 'feed-enter 0.25s ease-out' : undefined,
                  }}
                >
                  <span
                    className="w-14 shrink-0 text-[var(--color-text-tertiary)]"
                    suppressHydrationWarning
                  >
                    {entry.ts}
                  </span>
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px]"
                    style={{
                      backgroundColor: feedBadgeBg[entry.type],
                      color: feedColors[entry.type],
                    }}
                  >
                    {typeIcons[entry.type]}
                  </span>
                  <span className="flex-1 truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                    {entry.message}
                  </span>
                  <span
                    className="hidden rounded-sm px-1.5 py-0.5 text-[9px] font-[500] uppercase tracking-wider sm:block"
                    style={{
                      backgroundColor: feedBadgeBg[entry.type],
                      color: feedColors[entry.type],
                    }}
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
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] text-[var(--color-text-tertiary)]"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              {entries.length} entries
            </span>
            <span className="h-3 w-px bg-[var(--color-line-hairline)]" />
            <span
              className="text-[11px] text-[var(--color-pitch-green)]/60"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              {typeCount.check} checks
            </span>
            <span
              className="text-[11px] text-[var(--color-signal-amber)]/60"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              {typeCount.inconsistency} alerts
            </span>
            <span
              className="text-[11px] text-[var(--color-text-tertiary)]/60"
              style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
            >
              {typeCount.verify} proofs
            </span>
          </div>
          <span
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            latest proof: 0x7a3f...b91e
          </span>
        </div>
      </div>
    </section>
  );
}
