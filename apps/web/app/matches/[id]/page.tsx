"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Market {
  name: string;
  outcomes: { label: string; odds: number }[];
}

const markets: Market[] = [
  {
    name: "Match Winner",
    outcomes: [
      { label: "{home} (Home)", odds: 1.85 },
      { label: "Draw", odds: 3.40 },
      { label: "{away} (Away)", odds: 2.10 },
    ],
  },
  {
    name: "Over / Under 2.5",
    outcomes: [
      { label: "Over 2.5", odds: 1.95 },
      { label: "Under 2.5", odds: 1.95 },
    ],
  },
  {
    name: "Both Teams to Score",
    outcomes: [
      { label: "Yes", odds: 1.80 },
      { label: "No", odds: 2.05 },
    ],
  },
  {
    name: "Correct Score 1-0",
    outcomes: [
      { label: "{home} 1-0", odds: 6.50 },
      { label: "{away} 1-0", odds: 7.20 },
    ],
  },
];

const implied = (o: number) => 1 / o;
const fmtPct = (p: number) => `${(p * 100).toFixed(2)}%`;

interface FixtureDetail {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
}

export default function MatchDetail() {
  const params = useParams();
  const id = params.id as string;
  const [fixture, setFixture] = useState<FixtureDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.fixture) setFixture(data.fixture);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <section className="py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-bg-raised rounded w-1/3 mx-auto" />
          <div className="h-4 bg-bg-raised rounded w-1/4 mx-auto" />
        </div>
      </section>
    );
  }

  if (!fixture) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-lg font-[500] text-text-secondary mb-4">Match not found</h1>
        <Link href="/matches" className="font-mono text-sm text-text-tertiary underline hover:text-text-secondary">
          &larr; Back to matches
        </Link>
      </section>
    );
  }

  const totalProb = markets.reduce((sum, mk) => {
    const filled = mk.outcomes.map((o) => ({ ...o, label: o.label.replace("{home}", fixture.homeTeam).replace("{away}", fixture.awayTeam) }));
    return sum + filled.reduce((s, o) => s + implied(o.odds), 0);
  }, 0);

  const marginPct = (totalProb - 1) * 100;
  const consistent = marginPct < 5;

  return (
    <section className="py-12">
      <div className="mb-6">
        <Link href="/matches" className="font-mono text-[11px] text-text-tertiary hover:text-text-secondary transition-colors">
          &larr; Back to matches
        </Link>
      </div>

      <div className="mb-8 bg-bg-raised border border-line-hairline rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider border ${
              consistent
                ? "text-pitch-green border-pitch-green/20 bg-pitch-green/10"
                : "text-signal-amber border-signal-amber/20 bg-signal-amber/10"
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${consistent ? "bg-pitch-green" : "bg-signal-amber"}`} />
            {consistent ? "Consistent" : "Flagged"}
          </span>
          <span className="font-mono text-xs text-text-tertiary">{new Date(fixture.startTime).toLocaleDateString()}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-[500] mb-4">
          {fixture.homeTeam} <span className="text-text-tertiary font-[300]">v</span> {fixture.awayTeam}
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">Margin</span>
          <span className={`font-mono text-xl ${consistent ? "text-pitch-green" : "text-signal-amber"}`}>
            {marginPct >= 0 ? "+" : ""}{marginPct.toFixed(2)}%
          </span>
        </div>
      </div>

      <h2 className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em] mb-4">Market Breakdown</h2>

      <div className="space-y-3 mb-8">
        {markets.map((mk) => {
          const filled = mk.outcomes.map((o) => ({ ...o, label: o.label.replace("{home}", fixture.homeTeam).replace("{away}", fixture.awayTeam) }));
          const sumProbs = filled.reduce((s, o) => s + implied(o.odds), 0);
          return (
            <div key={mk.name} className="bg-bg-raised border border-line-hairline rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text-secondary">{mk.name}</span>
                <span className={`font-mono text-[11px] ${sumProbs > 1.05 ? "text-signal-amber" : "text-pitch-green"}`}>
                  &Sigma; = {fmtPct(sumProbs)}
                </span>
              </div>
              <div className="space-y-2">
                {filled.map((o) => {
                  const prob = implied(o.odds);
                  return (
                    <div key={o.label} className="flex items-center justify-between border-b border-line-hairline/40 pb-2 last:border-b-0 last:pb-0 text-[12px]">
                      <span className="text-text-primary">{o.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-text-tertiary">{o.odds.toFixed(2)}</span>
                        <span className="font-mono w-14 text-right text-text-secondary">{fmtPct(prob)}</span>
                        <div className="h-1.5 w-16 rounded-full bg-bg-void overflow-hidden">
                          <div className="h-full rounded-full bg-pitch-green-dim" style={{ width: `${Math.min(prob * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-bg-raised border border-line-hairline rounded-lg p-6">
        <h3 className="text-xs text-text-secondary uppercase tracking-[0.12em] mb-2">Consistency Check</h3>
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Total implied probability across all markets: <strong className="font-mono text-text-primary">{fmtPct(totalProb)}</strong>.
          Bookmaker margin:{" "}
          <strong className={`font-mono ${consistent ? "text-pitch-green" : "text-signal-amber"}`}>{marginPct.toFixed(2)}%</strong>.
          {consistent
            ? " Margins are within the expected range — odds are consistent."
            : " Margins exceed the expected threshold — odds may be inconsistent."}
        </p>
      </div>

      <div className="mt-8">
        <Link href="/" className="font-mono text-xs text-text-secondary hover:text-text-primary transition-colors no-underline">
          &larr; Back to home
        </Link>
      </div>
    </section>
  );
}
