"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Resolution = "idle" | "inspecting" | "executed" | "blocked";

interface GateAgent {
  id: string;
  label: string;
  inspectFixture: string;
}

const agents: GateAgent[] = [
  { id: "Gate-01", label: "Margin Check", inspectFixture: "Stormhaven vs Northgate" },
  { id: "Gate-02", label: "Liquidity Gate", inspectFixture: "Ironbound FC vs Silverlake" },
  { id: "Gate-03", label: "Trust Anchor", inspectFixture: "Crystal Palace vs Bridge City" },
  { id: "Gate-04", label: "Settlement Guard", inspectFixture: "Eastside FC vs Westend" },
];

function GateRow({ agent }: { agent: GateAgent }) {
  const [state, setState] = useState<Resolution>("idle");

  const resolve = useCallback(() => {
    setState("inspecting");
    setTimeout(() => {
      setState(Math.random() > 0.4 ? "executed" : "blocked");
    }, 700 + Math.random() * 600);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(resolve, Math.random() * 1000);
    const iv = setInterval(resolve, 5000 + Math.random() * 3000);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, [resolve]);

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 ${
        state === "executed" ? "border-pitch-green/40" :
        state === "blocked" ? "border-signal-red/40" :
        state === "inspecting" ? "border-line-hairline bg-bg-raised/30" :
        "border-line-hairline/40 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-text-primary">{agent.id}</span>
        {state === "inspecting" && <span className="font-mono text-[10px] text-text-tertiary animate-pulse">Inspecting...</span>}
        {state === "executed" && <span className="font-mono text-[10px] text-pitch-green">EXECUTED</span>}
        {state === "blocked" && <span className="font-mono text-[10px] text-signal-red">BLOCKED</span>}
      </div>
      <p className="text-[10px] text-text-tertiary">{agent.label}</p>
      {state === "blocked" && (
        <p className="font-mono text-[9px] text-signal-red/70 mt-1.5 leading-tight">
          Cause: {agent.inspectFixture} flagged
        </p>
      )}
    </div>
  );
}

export function GatePanel() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); ob.disconnect(); } }, { threshold: 0.25 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`transition-all duration-600 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <h2 className="text-xs font-mono text-text-secondary uppercase tracking-[0.15em] mb-4">
        Composability Gate
      </h2>
      <p className="text-xs text-text-tertiary leading-relaxed max-w-lg mb-6">
        External agents audit trust data before execution. Each gate independently resolves a transaction based on live oracle state.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        {agents.map((a) => (
          <GateRow key={a.id} agent={a} />
        ))}
      </div>
    </section>
  );
}
