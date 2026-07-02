'use client';

const fixtures = [
  { home: 'Brazil', away: 'Argentina', margin: 2.34, status: 'consistent' as const },
  { home: 'Germany', away: 'France', margin: -1.12, status: 'consistent' as const },
  { home: 'England', away: 'Spain', margin: 0.47, status: 'flagged' as const },
  { home: 'Portugal', away: 'Netherlands', margin: 3.01, status: 'consistent' as const },
  { home: 'Italy', away: 'Croatia', margin: -0.88, status: 'consistent' as const },
  { home: 'Belgium', away: 'Morocco', margin: 5.62, status: 'flagged' as const },
];

function StatusBadge({ status }: { status: 'consistent' | 'flagged' }) {
  const isConsistent = status === 'consistent';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-[500] uppercase tracking-wider"
      style={{
        fontFamily: 'var(--font-fraunces), serif',
        backgroundColor: isConsistent
          ? 'rgba(57,255,106,0.08)'
          : 'rgba(255,177,60,0.08)',
        color: isConsistent ? 'var(--color-pitch-green)' : 'var(--color-signal-amber)',
        border: `1px solid ${isConsistent ? 'rgba(57,255,106,0.2)' : 'rgba(255,177,60,0.2)'}`,
      }}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${isConsistent ? 'bg-[var(--color-pitch-green)]' : 'bg-[var(--color-signal-amber)]'}`}
      />
      {isConsistent ? 'Consistent' : 'Flagged'}
    </span>
  );
}

export function MatchGrid() {
  return (
    <section className="border-b border-[var(--color-line-hairline)] px-6 py-10">
      <h2
        className="mb-6 text-sm font-[500] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
        style={{ fontFamily: 'var(--font-fraunces), serif' }}
      >
        Live Match Grid
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fixtures.map((match, i) => (
          <div
            key={match.home}
            className="group cursor-pointer rounded-sm border border-[var(--color-line-hairline)] bg-[var(--color-bg-panel)] p-4 transition-all duration-100 ease-linear hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 hover:border-[var(--color-pitch-green-dim)]"
            style={{ animation: `count-up 0.6s ease-out ${300 + i * 80}ms both` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <StatusBadge status={match.status} />
              <span
                className="text-xs text-[var(--color-text-tertiary)]"
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                90&apos;
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-[500] text-[var(--color-text-primary)]"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {match.home}
              </span>
              <span
                className="text-sm text-[var(--color-text-tertiary)]"
                style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 300 }}
              >
                vs
              </span>
              <span
                className="text-sm font-[500] text-[var(--color-text-primary)]"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {match.away}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line-hairline)] pt-3">
              <span
                className="text-[11px] text-[var(--color-text-tertiary)]"
                style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 400 }}
              >
                Margin
              </span>
              <span
                className={`text-sm font-[500] ${match.margin >= 0 ? 'text-[var(--color-pitch-green)]' : 'text-[var(--color-signal-red)]'}`}
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                {match.margin >= 0 ? '+' : ''}{match.margin.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
