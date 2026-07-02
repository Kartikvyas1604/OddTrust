import { Background, TopStrip, Hero, MatchGrid, GatePanel, ProofFeed } from "@oddtrust/ui";

const networkStats = [
  { label: 'Total Checks', value: '24,598' },
  { label: 'Consistency Rate', value: '99.97%' },
  { label: 'Last Proof', value: 'Slot #310,442,891' },
  { label: 'Agents Connected', value: '7' },
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

        <div className="border-b border-[var(--color-line-hairline)] px-6 py-6">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {networkStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span
                  className="block text-sm font-[500] text-[var(--color-text-primary)]"
                  style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
                >
                  {stat.value}
                </span>
                <span
                  className="text-[11px] text-[var(--color-text-tertiary)]"
                  style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 400 }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer className="px-6 py-6 text-center">
          <p
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            OddsTrust · On-Chain Trust Oracle · All checks verified on-chain
          </p>
          <p
            className="mt-2 text-[10px] text-[var(--color-text-tertiary)] opacity-50"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            NOT FINANCIAL ADVICE · FOR DEMONSTRATION PURPOSES ONLY
          </p>
        </footer>
      </div>
    </>
  );
}
