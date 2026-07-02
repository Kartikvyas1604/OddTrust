import { Background, TopStrip, Hero, MatchGrid, GatePanel, ProofFeed } from "@oddtrust/ui";

const networkStats = [
  { label: 'Total Checks', value: '24,598', color: 'var(--color-pitch-green)' },
  { label: 'Consistency Rate', value: '99.97%', color: 'var(--color-pitch-green)' },
  { label: 'Last Proof', value: 'Slot #310,442,891', color: 'var(--color-text-tertiary)' },
  { label: 'Agents Connected', value: '7', color: 'var(--color-text-secondary)' },
];

export default function Home() {
  return (
    <>
      <Background />
      <div className="mx-auto min-h-screen max-w-6xl border-x border-[var(--color-line-hairline)] bg-[var(--color-bg-void)]">
        <TopStrip />
        <Hero />
        <MatchGrid />
        <GatePanel />
        <ProofFeed />

        <div className="border-b border-[var(--color-line-hairline)] px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <p
              className="mb-5 text-xs font-[400] uppercase tracking-[0.15em] text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Network Health
            </p>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--color-line-hairline)] bg-[var(--color-line-hairline)] sm:grid-cols-4">
              {networkStats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--color-bg-panel)] px-4 py-4 sm:px-5 sm:py-5"
                >
                  <span
                    className="block text-lg font-[500] sm:text-xl"
                    style={{
                      fontFamily: 'var(--font-martian-mono), monospace',
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="mt-0.5 block text-[11px] text-[var(--color-text-tertiary)]"
                    style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 400 }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <h3
                  className="text-sm font-[500] tracking-tight"
                  style={{ fontFamily: 'var(--font-fraunces), serif', letterSpacing: '-0.02em', color: 'var(--color-text-secondary)' }}
                >
                  OddsTrust
                </h3>
                <span className="h-3 w-px bg-[var(--color-line-hairline)]" />
                <span
                  className="text-[11px] text-[var(--color-text-tertiary)]"
                  style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                >
                  On-Chain Trust Oracle
                </span>
              </div>
              <span
                className="text-[10px] text-[var(--color-text-tertiary)] opacity-50"
                style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
              >
                NOT FINANCIAL ADVICE \u00B7 FOR DEMONSTRATION PURPOSES ONLY
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
