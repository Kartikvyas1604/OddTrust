"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/network-health")
      .then((r) => r.json())
      .then((d) => setSlot(d.currentSlot ?? null))
      .catch(() => {});
  }, []);

  return (
    <footer className="mt-auto border-t border-line-hairline/40">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-5 text-xs text-text-tertiary">
            <span className="font-[500] text-text-secondary">
              Odds<span className="text-pitch-green">Trust</span>
            </span>
            <span className="hidden sm:inline h-3 w-px bg-line-hairline/40" />
            <span className="hidden sm:inline">&copy; {new Date().getFullYear()}</span>
            <span className="hidden sm:inline h-3 w-px bg-line-hairline/40" />
            <span className="hidden sm:inline">On-Chain Trust Oracle</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pitch-green" />
              <span className="font-mono">Solana Devnet</span>
            </div>
            {slot && (
              <span className="font-mono">#{slot.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
