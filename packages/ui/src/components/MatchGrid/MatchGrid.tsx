"use client";

import Link from "next/link";

type Status = "consistent" | "flagged" | "blocked";

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: Status;
  margin: number;
  lastChecked: string;
}

export const fixtures: Fixture[] = [
  { id: "1", homeTeam: "FC Zenith", awayTeam: "Atlas United", status: "consistent", margin: 94.2, lastChecked: "12s ago" },
  { id: "2", homeTeam: "Stormhaven", awayTeam: "Northgate", status: "flagged", margin: 67.8, lastChecked: "23s ago" },
  { id: "3", homeTeam: "Ironbound FC", awayTeam: "Silverlake", status: "consistent", margin: 91.5, lastChecked: "5s ago" },
  { id: "4", homeTeam: "Crystal Palace", awayTeam: "Bridge City", status: "blocked", margin: 22.1, lastChecked: "47s ago" },
  { id: "5", homeTeam: "Red Star", awayTeam: "Blue United", status: "consistent", margin: 96.0, lastChecked: "2s ago" },
  { id: "6", homeTeam: "Eastside FC", awayTeam: "Westend Athletic", status: "flagged", margin: 58.4, lastChecked: "34s ago" },
];

const statusTheme: Record<Status, { label: string; text: string; dot: string; border: string }> = {
  consistent: { label: "Consistent", text: "text-pitch-green", dot: "bg-pitch-green", border: "border-line-hairline" },
  flagged: { label: "Flagged", text: "text-signal-amber", dot: "bg-signal-amber", border: "border-l-signal-amber border-line-hairline" },
  blocked: { label: "Blocked", text: "text-signal-red", dot: "bg-signal-red", border: "border-l-signal-red border-line-hairline" },
};

export function MatchCard({ fixture, delay = 0 }: { fixture: Fixture; delay?: number }) {
  const t = statusTheme[fixture.status];
  return (
    <Link
      href={`/matches/${fixture.id}`}
      className={`block bg-bg-raised border ${t.border} rounded-lg p-6 no-underline transition-all duration-120 hover:-translate-y-0.5 hover:brightness-110 animate-fade-up opacity-0`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm font-[500] text-text-primary truncate">{fixture.homeTeam}</span>
        <span className="shrink-0 text-xs text-text-tertiary font-mono">vs</span>
        <span className="text-sm font-[500] text-text-primary truncate text-right">{fixture.awayTeam}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${t.text}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.dot}`} />
          {t.label}
        </span>
        <span className="font-mono text-xs text-text-primary">{fixture.margin}%</span>
      </div>
      <p className="font-mono text-[10px] text-text-tertiary mt-3">Checked {fixture.lastChecked}</p>
    </Link>
  );
}

export function MatchGrid({ preview }: { preview?: boolean }) {
  const items = preview ? fixtures.slice(0, 6) : fixtures;
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em]">
          Live Match Trust Analysis
        </h2>
        {preview && (
          <Link href="/matches" className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors no-underline">
            View all &rarr;
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((f, i) => (
          <MatchCard key={f.id} fixture={f} delay={700 + i * 80} />
        ))}
      </div>
    </section>
  );
}
