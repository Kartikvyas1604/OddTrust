import type { Metadata } from "next";
import { Fraunces, Martian_Mono } from "next/font/google";
import "./globals.css";
import { Background, Nav, Footer } from "@oddtrust/ui";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600"],
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian-mono",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "OddsTrust — On-Chain Trust Oracle",
  description:
    "Autonomous on-chain trust oracle for sports betting odds verification. Detects anomalies, computes arbitrage stakes, and publishes proofs to Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${martianMono.variable}`}>
      <body>
        <Background />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 mx-auto w-full max-w-[1440px] px-6 lg:px-12">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
