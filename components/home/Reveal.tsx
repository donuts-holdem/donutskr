"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subtle scroll-reveal: fades + lifts children into view the first time they
 * intersect the viewport. Elements already in (or near) view on mount reveal
 * immediately via a synchronous getBoundingClientRect check, so above-the-fold
 * content is never withheld. The observer uses threshold: 0 (so elements taller
 * than the viewport can't slip past a ratio gate) and a positive bottom
 * rootMargin to preload the reveal just before scroll-in. Honors
 * prefers-reduced-motion by snapping in with no transition.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
  /**
   * Render visible from the first paint (SSR) instead of fading in on scroll.
   * Use for above-the-fold content (e.g. the hero) so the LCP text is never
   * gated behind client JS / IntersectionObserver.
   */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (or SSR-less env): reveal immediately rather than
    // leaving content stuck at opacity-0 forever.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    // If any part of the element is already within the (preload-expanded)
    // viewport on mount, reveal synchronously — covers the case where the
    // observer's async first callback would otherwise leave in-view content
    // briefly (or, for tall elements, permanently) hidden.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 1.15 && rect.bottom > 0) {
      setShown(true);
      return;
    }

    // Reveal on first intersection. threshold: 0 fires as soon as a single
    // pixel enters, so elements taller than the viewport can't slip past a
    // ratio gate. The positive bottom rootMargin preloads the reveal ~15% of
    // the viewport height before the element actually scrolls into view.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px 15% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <Tag
      ref={ref as never}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className ?? ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
