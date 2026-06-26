"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subtle scroll-reveal: fades + lifts children into view the first time they
 * intersect the viewport. Elements already in view on mount reveal immediately
 * (IntersectionObserver fires synchronously for them), so above-the-fold content
 * is never withheld. Honors prefers-reduced-motion by showing instantly.
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
    // Reveal on first intersection. Under reduced motion the element still
    // reveals here, but `motion-reduce:transition-none` (below) makes it snap
    // in with no animation — so no synchronous setState special-case is needed.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
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
