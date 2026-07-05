"use client";

import { useEffect, useState } from "react";

type Status = "verified" | "inconsistent" | "failed";

interface Entry {
  id: number;
  slot: string;
  fixture: string;
  status: Status;
  margin: string;
  ts: string;
}

const allFixtures = [
  "FC Zenith vs Atlas United", "Stormhaven vs Northgate",
  "Ironbound vs Silverlake", "Crystal Palace vs Bridge City",
  "Red Star vs Blue United", "Eastside vs Westend",
  "Harbor FC vs Southside", "Valley United vs Crest Athletic",
];

const cfg: Record<Status, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "text-pitch-green" },
  inconsistent: { label: "Inconsistent", cls: "text-signal-amber" },
  failed: { label: "Failed", cls: "text-signal-red" },
};

function makeEntry(id: number): Entry {
  const r = Math.random();
  return {
    id,
    slot: String(284_391_882 + id),
    fixture: allFixtures[Math.floor(Math.random() * allFixtures.length)],
    status: r > 0.75 ? "failed" : r > 0.4 ? "verified" : "inconsistent",
    margin: (70 + Math.random() * 30).toFixed(1),
    ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
  };
}

function seed(n: number): Entry[] {
  const out: Entry[] = [];
  for (let i = 0; i < n; i++) {
    const r = (i * 7 + 3) % 5;
    out.push({
      id: i,
      slot: String(284_391_882 + i),
      fixture: allFixtures[i % allFixtures.length],
      status: r === 0 ? "failed" : r < 3 ? "verified" : "inconsistent",
      margin: (85 + (i * 3) % 15).toFixed(1),
      ts: `00:0${i + 1}:${String(12 + i).padStart(2, "0")}`,
    });
  }
  return out;
}

export function ProofFeed() {
  const [entries, setEntries] = useState<Entry[]>(() => seed(5));
  const [count, setCount] = useState(5);

  useEffect(() => {
    const iv = setInterval(() => {
      setCount((c) => c + 1);
      setEntries((prev) => [makeEntry(count + 1), ...prev.slice(0, 49)]);
    }, 4000);
    return () => clearInterval(iv);
  }, [count]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em]">Proof Feed</h2>
        <span className="font-mono text-[10px] text-text-tertiary">{entries.length} {entries.length === 1 ? "proof" : "proofs"}</span>
      </div>
      <div className="bg-bg-panel border border-line-hairline rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-line-hairline bg-bg-void/50">
          <span className="font-mono text-[10px] text-text-tertiary w-[70px] shrink-0">Slot</span>
          <span className="font-mono text-[10px] text-text-tertiary flex-1">Fixture</span>
          <span className="font-mono text-[10px] text-text-tertiary w-[60px] text-right shrink-0">Margin</span>
          <span className="font-mono text-[10px] text-text-tertiary w-[80px] text-right shrink-0">Time</span>
          <span className="font-mono text-[10px] text-text-tertiary w-[80px] text-right shrink-0">Status</span>
        </div>
        <div className="divide-y divide-line-hairline/50 max-h-[340px] overflow-y-auto">
          {entries.map((e, i) => {
            const s = cfg[e.status];
            return (
              <div key={e.id} className={`flex items-center gap-3 px-4 py-2 ${i === 0 && e.id >= 5 ? "animate-feed-in" : ""}`}>
                <span className="font-mono text-xs text-text-tertiary w-[70px] shrink-0">{e.slot}</span>
                <span className="text-xs text-text-primary flex-1 truncate">{e.fixture}</span>
                <span className="font-mono text-xs text-text-primary w-[60px] text-right shrink-0">{e.margin}%</span>
                <span className="font-mono text-xs text-text-tertiary w-[80px] text-right shrink-0">{e.ts}</span>
                <span className={`font-mono text-xs ${s.cls} w-[80px] text-right shrink-0`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
