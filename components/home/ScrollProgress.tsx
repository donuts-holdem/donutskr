"use client";

import { useEffect, useState } from "react";

/**
 * Thin scroll-progress indicator pinned to the very top (above the header),
 * echoing the editorial reference. Uses a compositor-friendly scaleX transform
 * driven by rAF-throttled scroll. Decorative, so hidden from assistive tech.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        setProgress(max > 0 ? doc.scrollTop / max : 0);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[#FFE58A]/90 will-change-transform"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
