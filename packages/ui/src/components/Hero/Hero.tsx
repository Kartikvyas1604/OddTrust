'use client';

import { useState, useEffect, useRef } from 'react';

function useCountUp(target: number, duration: number, delay: number) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setValue(Math.floor(progress * target));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return value;
}

const stats = [
  { label: 'Matches Audited', value: 128 },
  { label: 'Consistency Checks', value: 14_592 },
  { label: 'Inconsistencies Found', value: 7 },
];

export function Hero() {
  const score = useCountUp(94, 800, 200);

  return (
    <section className="border-b border-[var(--color-line-hairline)] px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <p
          className="mb-2 text-xs font-[400] uppercase tracking-[0.15em] text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-fraunces), serif', animation: 'count-up 0.6s ease-out 300ms both' }}
        >
          Tournament Trust Score
        </p>
        <div style={{ animation: 'count-up 0.6s ease-out 400ms both' }}>
          <span
            className="block text-[120px] leading-none font-[600] sm:text-[160px]"
            style={{
              fontFamily: 'var(--font-martian-mono), monospace',
              color: 'var(--color-trophy-gold)',
              letterSpacing: '-0.04em',
              fontVariationSettings: '"wght" 600',
              textShadow: '0 0 60px rgba(212,175,106,0.15)',
            }}
          >
            {score}
            <span className="text-[48px] sm:text-[64px]" style={{ color: 'var(--color-trophy-gold)' }}>/100</span>
          </span>
        </div>
        <div
          className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-4"
          style={{ animation: 'count-up 0.6s ease-out 600ms both' }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <span
                className="block text-2xl font-[500] text-[var(--color-text-primary)]"
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                {stat.value.toLocaleString()}
              </span>
              <span
                className="text-xs text-[var(--color-text-secondary)]"
                style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 400 }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
