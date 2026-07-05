"use client";

import React from "react";
import Link from "next/link";

type Status = "consistent" | "flagged" | "blocked";

interface Fixture {
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

const statusConfig: Record<Status, { label: string; color: string; dot: string }> = {
  consistent: { label: "Consistent", color: "text-pitch-green", dot: "bg-pitch-green" },
  flagged: { label: "Flagged", color: "text-signal-amber", dot: "bg-signal-amber" },
  blocked: { label: "Blocked", color: "text-signal-red", dot: "bg-signal-red" },
};

export function MatchCard({ fixture }: { fixture: Fixture }) {
  const cfg = statusConfig[fixture.status];
  return (
    <Link
      href={`/matches/${fixture.id}`}
      className="group block bg-bg-panel border border-line-hairline rounded-lg p-4 no-underline transition-all duration-120 hover:-translate-y-0.5 hover:bg-bg-raised"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm text-text-primary font-[500]">
          {fixture.homeTeam}
        </span>
        <span className="text-xs text-text-tertiary font-mono-data">vs</span>
        <span className="text-sm text-text-primary font-[500]">
          {fixture.awayTeam}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-xs font-mono-data ${cfg.color}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        <span className="font-mono-data text-xs text-text-primary">
          {fixture.margin}%
        </span>
      </div>
      <p className="text-[10px] font-mono-data text-text-tertiary mt-2">
        Checked {fixture.lastChecked}
      </p>
    </Link>
  );
}

export function MatchGrid({ preview }: { preview?: boolean }) {
  const displayFixtures = preview ? fixtures.slice(0, 3) : fixtures;
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono-data text-text-secondary uppercase tracking-[0.1em]">
          Live Match Trust Analysis
        </h2>
        {preview && (
          <Link
            href="/matches"
            className="text-xs font-mono-data text-text-secondary hover:text-text-primary transition-colors duration-200 no-underline"
          >
            View all &rarr;
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayFixtures.map((fixture, i) => (
          <div
            key={fixture.id}
            className="animate-stagger-fade opacity-0"
            style={{ animationDelay: `${600 + i * 80}ms` }}
          >
            <MatchCard fixture={fixture} />
          </div>
        ))}
      </div>
    </section>
  );
}
