"use client";

import React, { useEffect, useRef, useState } from "react";

function CountUp({
  end,
  duration,
  suffix = "",
}: {
  end: number;
  duration: number;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const raf = requestAnimationFrame(function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

export function Hero() {
  return (
    <section className="py-16 md:py-20 text-center animate-fade-in opacity-0 [animation-delay:300ms] [animation-fill-mode:forwards]">
      {/* tournament trust score */}
      <p className="text-xs font-mono-data text-text-secondary uppercase tracking-[0.12em] mb-2">
        Tournament Trust Score
      </p>
      <h1 className="text-6xl md:text-8xl font-[500] tracking-tight leading-none text-trophy-gold">
        <CountUp end={97} duration={800} suffix="%" />
      </h1>

      {/* stats row */}
      <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm font-mono-data">
        <div className="text-center">
          <p className="text-text-secondary text-xs">Total Fixtures</p>
          <p className="text-text-primary mt-0.5 text-base">
            <CountUp end={128} duration={800} />
          </p>
        </div>
        <div className="text-center">
          <p className="text-text-secondary text-xs">Consistent</p>
          <p className="text-pitch-green mt-0.5 text-base">
            <CountUp end={114} duration={800} />
          </p>
        </div>
        <div className="text-center">
          <p className="text-text-secondary text-xs">Flagged</p>
          <p className="text-signal-amber mt-0.5 text-base">
            <CountUp end={14} duration={800} />
          </p>
        </div>
      </div>
    </section>
  );
}
