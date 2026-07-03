import Image from "next/image";

/* ------------------------------------------------------------------ *
 * SeasonBackdrop — a season's `bg_image` rendered as site-wide
 * atmosphere, not content. A fixed full-bleed layer sits behind every
 * public page (negative z-index, `pointer-events-none`, `aria-hidden`),
 * heavily blurred and dimmed so it reads as mood/texture rather than a
 * hero image. Layered dark scrims keep the dark-theme copy legible; a
 * faint gold bloom ties it to the DO:NUTS palette. Renders nothing when
 * there is no active season image.
 * ------------------------------------------------------------------ */
export function SeasonBackdrop({ image }: { image: string | null }) {
  if (!image) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* The image itself — scaled up so the heavy blur never reveals the
          layer's edges, kept low quality (decoration) and lazy so it never
          competes for LCP. */}
      <Image
        src={image}
        alt=""
        fill
        quality={30}
        loading="lazy"
        sizes="100vw"
        className="scale-110 object-cover opacity-40 blur-2xl"
      />

      {/* Flat scrim: the baseline darkening that guarantees legibility. */}
      <div className="absolute inset-0 bg-bg/60" />

      {/* Vertical fade — the image settles calmly under the sticky header and
          dissolves into the footer, only breathing through the mid-viewport. */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg" />

      {/* Faint gold bloom, bleeding off the top-right, echoing the season
          hero treatment. */}
      <div className="absolute right-0 top-0 h-1/2 w-1/2 -translate-y-1/4 translate-x-1/4 rounded-full bg-gold/5 blur-3xl" />
    </div>
  );
}
