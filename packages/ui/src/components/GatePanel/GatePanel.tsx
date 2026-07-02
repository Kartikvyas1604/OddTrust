'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const actions = [
  { agent: 'Arbitrage Agent #07', action: 'EXECUTE_TRADE', odds: '+2.34%', amount: '842.5 USDC' },
  { agent: 'Liquidity Agent #12', action: 'ADJUST_POOL', odds: '-1.12%', amount: '12,000 USDC' },
  { agent: 'Hedge Agent #03', action: 'PLACE_HEDGE', odds: '+0.47%', amount: '3,200 USDC' },
];

function AnimatedLine({ resolved, blocked }: { resolved: boolean | null; blocked: boolean }) {
  return (
    <svg className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ zIndex: 0 }}>
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="100%"
        stroke={blocked ? 'var(--color-signal-red)' : 'var(--color-pitch-green)'}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={resolved === null ? 0.3 : 0.7}
      />
    </svg>
  );
}

function useInView(ref: React.RefObject<Element | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

export function GatePanel() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timer = setTimeout(() => setStep(1), 600);
    return () => clearTimeout(timer);
  }, [inView]);

  useEffect(() => {
    if (step === 0 || step > actions.length) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [step]);

  const resolved = step > actions.length ? true : null;
  const blocked = resolved === true && Math.random() > 0.5;

  const handleReplay = useCallback(() => {
    setStep(0);
    setTimeout(() => setStep(1), 600);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="border-b border-[var(--color-line-hairline)] px-6 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="mb-2 text-xs font-[400] uppercase tracking-[0.15em] text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Composable Verifiability
        </h2>
        <p
          className="mb-12 text-sm leading-relaxed text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 300 }}
        >
          External agents query OddsTrust before acting. The oracle gates execution based on
          live consistency verification.
        </p>

        <div className="relative mx-auto max-w-lg">
          <AnimatedLine resolved={resolved} blocked={blocked} />

          <div className="relative space-y-8" style={{ zIndex: 1 }}>
            {actions.slice(0, step > actions.length ? actions.length : step).map((act, i) => (
              <div
                key={act.agent}
                className="relative rounded-sm border border-[var(--color-line-hairline)] bg-[var(--color-bg-panel)] p-4 text-left transition-all duration-200"
                style={{ animation: 'count-up 0.4s ease-out both' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="text-xs text-[var(--color-text-secondary)]"
                      style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 400 }}
                    >
                      {act.agent}
                    </span>
                    <span
                      className="ml-3 text-xs text-[var(--color-text-tertiary)]"
                      style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                    >
                      {act.action}
                    </span>
                  </div>
                  <span
                    className="text-xs text-[var(--color-text-secondary)]"
                    style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                  >
                    {act.odds}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className="text-xs text-[var(--color-text-tertiary)]"
                    style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                  >
                    {act.amount}
                  </span>
                  <span
                    className="text-[11px] text-[var(--color-pitch-green)]"
                    style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                  >
                    ✓ Query OK
                  </span>
                </div>
              </div>
            ))}

            {resolved && (
              <div
                className={`relative rounded-sm border p-5 text-center transition-all duration-200 ${
                  blocked ? 'animate-gate-block' : 'animate-gate-resolve'
                }`}
                style={{
                  borderColor: blocked
                    ? 'rgba(255,77,77,0.4)'
                    : 'rgba(57,255,106,0.4)',
                  backgroundColor: blocked
                    ? 'rgba(255,77,77,0.05)'
                    : 'rgba(57,255,106,0.05)',
                }}
              >
                <span
                  className="text-lg font-[600] uppercase tracking-wider"
                  style={{
                    fontFamily: 'var(--font-martian-mono), monospace',
                    color: blocked ? 'var(--color-signal-red)' : 'var(--color-pitch-green)',
                  }}
                >
                  {blocked ? '⚠ BLOCKED' : '✓ EXECUTED'}
                </span>
                <p
                  className="mt-2 text-xs text-[var(--color-text-secondary)]"
                  style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 300 }}
                >
                  {blocked
                    ? 'OddsTrust flagged margin inconsistency — execution halted'
                    : 'All consistency checks passed — trade executed on-chain'}
                </p>
                <button
                  onClick={handleReplay}
                  className="mt-4 rounded-sm border border-[var(--color-line-hairline)] px-3 py-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                >
                  ↻ Replay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
