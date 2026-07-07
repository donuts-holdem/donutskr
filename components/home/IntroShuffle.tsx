"use client";

import { useRef, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INTRO_PREHYDRATION_JS, markIntroSeen, shouldPlayIntro } from "@/lib/intro";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });

// Five-card deck. `red` picks the brand pink for hearts/diamonds; the rest sit
// in the near-black ink so the faces read on the cream card.
const CARDS = [
  { suit: "♠", red: false },
  { suit: "♥", red: true },
  { suit: "♣", red: false },
  { suit: "♦", red: true },
  { suit: "♠", red: false },
];

export default function IntroShuffle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [visible, setVisible] = useState(true);

  useGSAP(
    () => {
      if (!shouldPlayIntro()) {
        setVisible(false);
        return;
      }
      markIntroSeen();

      const cards = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(".intro-card") ?? [],
      );
      const left = cards.filter((_, i) => i % 2 === 0);
      const right = cards.filter((_, i) => i % 2 === 1);

      const tl = gsap.timeline({
        onComplete: () => {
          removeSkipListeners();
          setVisible(false);
        },
      });
      timelineRef.current = tl;

      // Deck starts stacked dead-center with a faint fan.
      gsap.set(cards, {
        xPercent: -50,
        yPercent: -50,
        left: "50%",
        top: "50%",
        rotate: (i) => (i - 2) * 1.5,
        y: (i) => i * -1,
      });

      tl.to(left, { x: -90, rotate: -8, duration: 0.35, ease: "power2.out" })
        .to(right, { x: 90, rotate: 8, duration: 0.35, ease: "power2.out" }, "<")
        .to(cards, {
          x: 0,
          rotate: (i) => (i - 2) * 1.5,
          duration: 0.55,
          ease: "power3.inOut",
          stagger: { each: 0.05, from: "center" },
        })
        .from(
          ".intro-word-inner",
          { yPercent: 120, duration: 0.6, ease: "power3.out", stagger: 0.1 },
          "-=0.15",
        )
        .to(".intro-stack", { opacity: 0, duration: 0.4, ease: "power1.in" }, "+=0.4")
        .to(rootRef.current, { yPercent: -100, duration: 0.6, ease: "power3.inOut" }, "-=0.1");

      const skip = () => timelineRef.current?.progress(1);
      function removeSkipListeners() {
        window.removeEventListener("keydown", skip);
        window.removeEventListener("wheel", skip);
      }
      window.addEventListener("keydown", skip);
      window.addEventListener("wheel", skip, { passive: true });
      // Also remove on true unmount (e.g. reduced-motion/never-played path,
      // or the component being torn down before the timeline completes).
      return removeSkipListeners;
    },
    { scope: rootRef },
  );

  if (!visible) return null;

  return (
    <>
      {/* Runs before hydration so seen/reduced-motion sessions never flash the overlay. */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_PREHYDRATION_JS }} />
      <div
        ref={rootRef}
        className="intro-overlay flex items-center justify-center overflow-hidden"
        onClick={() => timelineRef.current?.progress(1)}
      >
        <div className="intro-stack relative h-36 w-24" aria-hidden="true">
          {CARDS.map((c, i) => (
            <div
              key={i}
              className="intro-card absolute flex h-36 w-24 items-center justify-center rounded-lg bg-cream text-4xl shadow-lg"
            >
              <span className={c.red ? "text-pink" : "text-bg"}>{c.suit}</span>
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className={`${display.className} pointer-events-none absolute bottom-[22%] flex flex-col items-center gap-2 text-center`}
        >
          <span className="overflow-hidden py-1 leading-none">
            <span className="intro-word-inner block text-4xl font-bold tracking-[-0.02em] text-gold sm:text-5xl">
              DO:<span className="text-pink">NUTS</span>
            </span>
          </span>
          <span className="overflow-hidden py-1 leading-none">
            <span className="intro-word-inner block text-lg font-medium uppercase tracking-[0.3em] text-cream">
              Poker Club
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => timelineRef.current?.progress(1)}
          className="absolute bottom-8 right-8 rounded-pill border border-border px-4 py-2 text-2xs font-medium uppercase tracking-[0.2em] text-cream/70 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          건너뛰기
        </button>
      </div>
    </>
  );
}
