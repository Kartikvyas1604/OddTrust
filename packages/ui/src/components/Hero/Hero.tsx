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
    <section className="relative py-16 text-center animate-fade-up opacity-0">
      <p className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em] mb-3">
        Tournament Trust Score
      </p>
      <h1 className="text-7xl md:text-9xl font-[500] tracking-tight leading-none text-trophy-gold">
        <CountUp end={97} duration={800} suffix="%" />
      </h1>

      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <div className="bg-bg-raised border border-line-hairline rounded-lg p-5 min-w-[160px] text-center">
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-void mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-text-tertiary" />
          </div>
          <p className="font-mono text-2xl text-text-primary mb-0.5">
            <CountUp end={128} duration={800} />
          </p>
          <p className="text-[11px] text-text-secondary uppercase tracking-wider">Matches Audited</p>
        </div>
        <div className="bg-bg-raised border border-line-hairline rounded-lg p-5 min-w-[160px] text-center">
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-void mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-pitch-green" />
          </div>
          <p className="font-mono text-2xl text-pitch-green mb-0.5">
            <CountUp end={114} duration={800} />
          </p>
          <p className="text-[11px] text-text-secondary uppercase tracking-wider">Consistency Checks</p>
        </div>
        <div className="bg-bg-raised border border-line-hairline rounded-lg p-5 min-w-[160px] text-center">
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-void mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-signal-amber" />
          </div>
          <p className="font-mono text-2xl text-signal-amber mb-0.5">
            <CountUp end={14} duration={800} />
          </p>
          <p className="text-[11px] text-text-secondary uppercase tracking-wider">Inconsistencies Found</p>
        </div>
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
