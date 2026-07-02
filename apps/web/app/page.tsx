import { Background, TopStrip, Hero, MatchGrid, GatePanel, ProofFeed } from "@oddtrust/ui";

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
        <footer className="px-6 py-8 text-center">
          <p
            className="text-[11px] text-[var(--color-text-tertiary)]"
            style={{ fontFamily: 'var(--font-martian-mono), monospace' }}
          >
            OddsTrust — On-Chain Trust Oracle. All checks verified on-chain.
          </p>
        </footer>
      </div>
    </>
  );
}
