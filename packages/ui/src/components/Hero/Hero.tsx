"use client";

import { useEffect, useRef, useState } from "react";

function CountUp({ end, duration, suffix = "" }: { end: number; duration: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = 0;
    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const p = Math.min((now - startRef.current) / duration, 1);
      setValue(Math.floor(p * end));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);

  return <span>{value}{suffix}</span>;
}

export function Hero() {
  return (
    <section className="py-16 text-center animate-fade-up opacity-0">
      <p className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em] mb-3">
        Tournament Trust Score
      </p>
      <h1 className="text-7xl md:text-9xl font-[500] tracking-tight leading-none text-trophy-gold">
        <CountUp end={97} duration={800} suffix="%" />
      </h1>

      <div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-4">
        {[
          { label: "Matches Audited", value: 128, color: "text-text-primary" },
          { label: "Consistency Checks", value: 114, color: "text-pitch-green" },
          { label: "Inconsistencies Found", value: 14, color: "text-signal-amber" },
        ].map((s) => (
          <div key={s.label} className="text-center min-w-[120px]">
            <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`font-mono text-lg ${s.color}`}>
              <CountUp end={s.value} duration={800} />
            </p>
          </div>
        ))}
      </div>

      <div
        className="absolute left-0 right-0 top-1/4 h-32 pointer-events-none overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 w-[30%] animate-sweep opacity-[0.04]"
          style={{
            background: "linear-gradient(90deg, transparent, #1E7A3E, transparent)",
          }}
        />
      </div>
    </section>
  );
}
