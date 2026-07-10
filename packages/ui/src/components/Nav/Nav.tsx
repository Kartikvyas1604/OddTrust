"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { label: "Oracle", href: "/oracle" },
  { label: "Matches", href: "/matches" },
  { label: "Proof Feed", href: "/proof-feed" },
  { label: "Docs", href: "/docs" },
];

export function Nav() {
  const pathname = usePathname();
  const [slot, setSlot] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/network-health")
      .then((r) => r.json())
      .then((data) => {
        if (data.currentSlot) setSlot(data.currentSlot);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 border-b ${
        scrolled
          ? "bg-bg-void/90 backdrop-blur-md border-line-hairline/50"
          : "bg-bg-void/60 backdrop-blur-sm border-line-hairline/20"
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 flex items-center justify-between h-14">
        <Link
          href="/"
          className="text-lg font-[600] tracking-tight text-text-primary no-underline shrink-0"
        >
          Odds<span className="text-pitch-green">Trust</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const active =
              l.href === "/matches"
                ? pathname.startsWith("/matches")
                : pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm no-underline transition-colors duration-150 ${
                  active
                    ? "text-text-primary font-[500]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-pitch-green opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pitch-green" />
            </span>
            <span className="font-mono text-xs text-text-tertiary">
              {slot ? `#${slot.toLocaleString()}` : "Live"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
