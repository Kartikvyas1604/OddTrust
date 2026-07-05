"use client";

import React, { useEffect, useRef, useState } from "react";

type Entry = {
  id: number;
  slot: string;
  fixture: string;
  status: "verified" | "inconsistent" | "failed";
  margin: string;
};

const statusConfig = {
  verified: { label: "Verified", color: "text-pitch-green" },
  inconsistent: { label: "Inconsistent", color: "text-signal-amber" },
  failed: { label: "Failed", color: "text-signal-red" },
};

const allFixtures = [
  "FC Zenith vs Atlas United",
  "Stormhaven vs Northgate",
  "Ironbound vs Silverlake",
  "Crystal Palace vs Bridge City",
  "Red Star vs Blue United",
  "Eastside vs Westend",
  "Harbor FC vs Southside",
  "Valley United vs Crest Athletic",
];

function generateEntry(id: number): Entry {
  const rand = Math.random();
  const status = rand > 0.75 ? "failed" : rand > 0.4 ? "verified" : "inconsistent";
  const slot = String(284_391_800 + Math.floor(Math.random() * 200));
  const fixture = allFixtures[Math.floor(Math.random() * allFixtures.length)];
  const margin = (70 + Math.random() * 30).toFixed(1);
  return { id, slot, fixture, status, margin };
}

const initialEntries: Entry[] = Array.from({ length: 5 }, (_, i) =>
  generateEntry(i)
);

export function ProofFeed() {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const countRef = useRef(5);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextId = countRef.current++;
      setEntries((prev) => [generateEntry(nextId), ...prev.slice(0, 49)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono-data text-text-secondary uppercase tracking-[0.1em]">
          Proof Feed
        </h2>
        <span className="font-mono-data text-[10px] text-text-tertiary">
          {entries.length} entries
        </span>
      </div>
      <div className="bg-bg-panel border border-line-hairline rounded-lg overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-line-hairline bg-bg-void/50">
          <span className="text-[10px] font-mono-data text-text-tertiary w-[80px] shrink-0">
            Slot
          </span>
          <span className="text-[10px] font-mono-data text-text-tertiary flex-1">
            Fixture
          </span>
          <span className="text-[10px] font-mono-data text-text-tertiary w-[80px] text-right shrink-0">
            Margin
          </span>
          <span className="text-[10px] font-mono-data text-text-tertiary w-[90px] text-right shrink-0">
            Status
          </span>
        </div>

        {/* entries */}
        <div className="divide-y divide-line-hairline/50 max-h-[360px] overflow-y-auto">
          {entries.map((entry, i) => {
            const cfg = statusConfig[entry.status];
            const isNew = i === 0 && entry.id >= 5;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-3 py-2 ${
                  isNew ? "animate-feed-enter" : ""
                }`}
              >
                <span className="font-mono-data text-xs text-text-tertiary w-[80px] shrink-0">
                  {entry.slot}
                </span>
                <span className="text-xs text-text-primary flex-1 truncate">
                  {entry.fixture}
                </span>
                <span className="font-mono-data text-xs text-text-primary w-[80px] text-right shrink-0">
                  {entry.margin}%
                </span>
                <span
                  className={`font-mono-data text-xs ${cfg.color} w-[90px] text-right shrink-0`}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
