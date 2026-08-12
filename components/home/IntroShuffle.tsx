"use client";

import { useRef, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { INTRO_PREHYDRATION_JS, markIntroSeen, shouldPlayIntro } from "@/lib/intro";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });

// Real 3D riffle shuffle (Three.js). Cards are bendable meshes: the deck splits
// into two packets that meet SHORT-edge to short-edge, each flexes into an arc,
// then they interleave into one deck. WebGL depth means cards never clip.
const N = 28;
const H = N / 2; // cards per packet
const TH = 0.007; // vertical spacing between stacked cards (thin deck)
const CW = 1.0; // card width
const CL = 1.42; // card length (portrait)
const SEG = 22; // length segments — enough to bend smoothly
const BEND_MAX = 0.95; // flex arc (radians) — the thumbs curl each half
const GAP = CL * 0.4; // packets close, inner edges near center; cards drop to the pile at pz=0
const TABLE_Y = 0.02; // outer edges rest here (on the table); only the bend lifts the inner edge

const isTop = (i: number) => i < H;
const rankP = (i: number) => (isTop(i) ? i : i - H);

type CardState = { pz: number; py: number; tilt: number; bend: number };

// Perfect interleave — top half → even slots, bottom half → odd slots.
const slotOf = (i: number) => (isTop(i) ? 2 * rankP(i) : 2 * rankP(i) + 1);
const splitPZ = (i: number) => (isTop(i) ? GAP : -GAP);
// Split pose: two CONTIGUOUS packets of equal height, side by side in Z (the two
// halves of the deck). Merge pose: the single interleaved deck. Cards drop into
// the merge in slot order (bottom-up), each landing on top of the growing pile.
const splitY = (i: number) => TABLE_Y + rankP(i) * TH;
const mergeY = (i: number) => TABLE_Y + slotOf(i) * TH;

// Procedural card back: a gold lattice on the warm surface, with ROUNDED
// corners (transparent outside → alphaTest gives a crisp rounded card). Returns
// null under a canvas-less environment (tests) — caller guards.
function makeCardTexture(): THREE.CanvasTexture | null {
  const c = document.createElement("canvas");
  c.width = 200;
  c.height = 284;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const pad = 6;
  const r = 30; // corner radius
  const roundRect = () => {
    ctx.beginPath();
    ctx.roundRect(pad, pad, c.width - pad * 2, c.height - pad * 2, r);
  };
  // Fill + lattice, clipped to the rounded card.
  ctx.save();
  roundRect();
  ctx.clip();
  ctx.fillStyle = "#141211"; // --color-surface
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(255, 229, 138, 0.26)"; // --color-gold, low alpha
  ctx.lineWidth = 1.5;
  const s = 18;
  for (let x = -c.height; x < c.width; x += s) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + c.height, c.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + c.height, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  ctx.restore();
  // Gold rounded border.
  roundRect();
  ctx.strokeStyle = "rgba(255, 229, 138, 0.9)";
  ctx.lineWidth = 7;
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// A real playing-card FACE: cream card, rank + suit in opposite corners and a
// large center pip. Drawn mirrored so it reads correctly on the plane's back
// side. Returns null under a canvas-less environment (tests).
const SUITS: Record<string, { glyph: string; red: boolean }> = {
  S: { glyph: "♠", red: false },
  H: { glyph: "♥", red: true },
  D: { glyph: "♦", red: true },
  C: { glyph: "♣", red: false },
};
const FACE_DEFS = [
  ["A", "S"],
  ["K", "H"],
  ["Q", "D"],
  ["J", "C"],
  ["10", "S"],
  ["A", "H"],
  ["9", "C"],
  ["Q", "S"],
  ["K", "D"],
  ["7", "H"],
] as const;

function makeFaceTexture(rank: string, suitKey: string): THREE.CanvasTexture | null {
  const c = document.createElement("canvas");
  c.width = 200;
  c.height = 284;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const suit = SUITS[suitKey];
  const ink = suit.red ? "#c0392b" : "#1a1a1a";
  const pad = 6;
  const r = 30;
  // Mirror so it reads correctly on the plane's back side.
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.roundRect(pad, pad, c.width - pad * 2, c.height - pad * 2, r);
  ctx.fillStyle = "#f7f6f3"; // --color-cream
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  // Corner indices (rank over suit), top-left and bottom-right (rotated).
  const drawIndex = (x: number, y: number, flip: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.rotate(Math.PI);
    ctx.font = "bold 34px Georgia, serif";
    ctx.fillText(rank, 0, 0);
    ctx.font = "30px Georgia, serif";
    ctx.fillText(suit.glyph, 0, 30);
    ctx.restore();
  };
  drawIndex(32, 42, false);
  drawIndex(c.width - 32, c.height - 42, true);
  // Center pip.
  ctx.font = "120px Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.fillText(suit.glyph, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export default function IntroShuffle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [visible, setVisible] = useState(true);

  useGSAP(
    () => {
      if (!shouldPlayIntro()) {
        setVisible(false);
        return;
      }

      const skip = () => timelineRef.current?.progress(1);
      function removeSkipListeners() {
        window.removeEventListener("keydown", skip);
        window.removeEventListener("wheel", skip);
      }

      let cleanupThree: (() => void) | null = null;

      try {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("no canvas");

        // --- scene / camera / lights ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          32,
          window.innerWidth / window.innerHeight,
          0.1,
          100,
        );
        camera.position.set(-2.3, 3.1, -4.4); // Y kept above (card backs show), Z flipped
        camera.lookAt(0, 0.15, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const key = new THREE.DirectionalLight(0xfff2d8, 1.1);
        key.position.set(3, 6, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xe78aa7, 0.35); // brand pink rim
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        // Two materials per card: the back (gold lattice, up when face-down) and
        // the face (a real playing card, underside). A card is two meshes sharing
        // one geometry — back renders the +Z side, face the -Z side — so one bend
        // deforms both.
        const backTex = makeCardTexture();
        const backMaterial = new THREE.MeshStandardMaterial({
          map: backTex ?? undefined,
          color: backTex ? 0xffffff : 0x141211,
          side: THREE.FrontSide,
          roughness: 0.62,
          metalness: 0.12,
          alphaTest: backTex ? 0.5 : 0,
        });
        const faceTextures = FACE_DEFS.map(([rank, suit]) => makeFaceTexture(rank, suit));
        const faceMaterials = faceTextures.map(
          (ft) =>
            new THREE.MeshStandardMaterial({
              map: ft ?? undefined,
              color: ft ? 0xffffff : 0xf7f6f3,
              side: THREE.BackSide,
              roughness: 0.7,
              metalness: 0.02,
              alphaTest: ft ? 0.5 : 0,
            }),
        );

        // --- cards ---
        const cards: {
          mesh: THREE.Mesh;
          face: THREE.Mesh;
          base: Float32Array;
          state: CardState;
          lastBend: number;
          top: boolean;
        }[] = [];
        for (let i = 0; i < N; i++) {
          const geo = new THREE.PlaneGeometry(CW, CL, 1, SEG);
          const mesh = new THREE.Mesh(geo, backMaterial);
          const face = new THREE.Mesh(geo, faceMaterials[i % faceMaterials.length]);
          const base = Float32Array.from(geo.attributes.position.array);
          scene.add(mesh);
          scene.add(face);
          cards.push({
            mesh,
            face,
            base,
            state: { pz: 0, py: i * TH, tilt: -Math.PI / 2, bend: 0 },
            lastBend: -1,
            top: isTop(i),
          });
        }

        // Bend a card into an arc like a real table riffle: the OUTER short edge
        // stays flat on the table, the INNER edge is lifted (curls up, +z local →
        // +y world). Mirrored per packet so both inner edges rise toward center.
        const applyBend = (card: (typeof cards)[number]) => {
          const b = card.state.bend;
          if (Math.abs(b - card.lastBend) < 0.001) return;
          card.lastBend = b;
          const attr = card.mesh.geometry.attributes.position;
          const arr = attr.array as Float32Array;
          const theta = b * BEND_MAX;
          const outerY = card.top ? -CL / 2 : CL / 2; // outer edge (flat anchor)
          const dir = card.top ? 1 : -1; // direction toward the inner edge
          const R = theta > 0.001 ? CL / theta : 0;
          for (let v = 0; v < attr.count; v++) {
            const x = card.base[v * 3];
            const y = card.base[v * 3 + 1];
            if (theta < 0.001) {
              arr[v * 3] = x;
              arr[v * 3 + 1] = y;
              arr[v * 3 + 2] = 0;
              continue;
            }
            const u = (dir * (y - outerY)) / CL; // 0 at outer edge, 1 at inner
            const a = u * theta;
            arr[v * 3] = x;
            arr[v * 3 + 1] = outerY + dir * R * Math.sin(a);
            arr[v * 3 + 2] = R * (1 - Math.cos(a)); // lift up
          }
          attr.needsUpdate = true;
          card.mesh.geometry.computeVertexNormals();
        };

        const frame = () => {
          for (const card of cards) {
            const { pz, py, tilt } = card.state;
            card.mesh.position.set(0, py, pz);
            card.mesh.rotation.set(tilt, 0, 0);
            card.face.position.set(0, py, pz);
            card.face.rotation.set(tilt, 0, 0);
            applyBend(card); // shared geometry — deforms both meshes at once
          }
          renderer.render(scene, camera);
        };

        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        gsap.ticker.add(frame);
        frame(); // initial paint

        cleanupThree = () => {
          gsap.ticker.remove(frame);
          window.removeEventListener("resize", onResize);
          for (const card of cards) card.mesh.geometry.dispose();
          backMaterial.dispose();
          backTex?.dispose();
          for (const m of faceMaterials) m.dispose();
          for (const t of faceTextures) t?.dispose();
          renderer.dispose();
        };

        // --- timeline ---
        const tl = gsap.timeline({
          onComplete: () => {
            markIntroSeen();
            cleanupThree?.();
            removeSkipListeners();
            setVisible(false);
          },
        });
        timelineRef.current = tl;

        const states = cards.map((c) => c.state);
        gsap.set(".intro-glow", { opacity: 0, scale: 0.8 });

        tl
          // 1. Split into two equal, contiguous packets side by side (short edges
          // facing at center), and flex — outer edges on the table, inner edges
          // lifted by the thumbs. Both halves sit at the same height.
          .to(states, {
            pz: (i: number) => splitPZ(i),
            py: (i: number) => splitY(i),
            bend: 1,
            duration: 0.6,
            ease: "power2.inOut",
            stagger: { each: 0.004, from: "center" },
          })
          // 2. The riffle: the thumbs release cards from the BOTTOM up. Each card
          // stays on ITS OWN side (pz unchanged) and drops off the flex, settling
          // to its interleaved height — so the two halves' inner edges interlace at
          // the center. Alternating heights ⇒ the edges mesh, never clip.
          .to(
            states,
            {
              py: (i: number) => mergeY(i),
              bend: 0,
              duration: 0.3,
              ease: "power1.in",
              stagger: (i: number) => slotOf(i) * 0.028,
            },
            "+=0.15",
          )
          // 3. Square up: with the edges interlaced, push the two halves together
          // (pz → 0). Already meshed at alternating heights ⇒ clip-free.
          .to(
            states,
            {
              pz: 0,
              duration: 0.5,
              ease: "power2.inOut",
              stagger: { each: 0.006, from: "center" },
            },
            "+=0.1",
          )
          // 3. Gold bloom + wordmark reveal.
          .to(".intro-glow", { opacity: 0.2, scale: 1, duration: 0.5, ease: "power2.out" }, "-=0.3")
          .from(
            ".intro-word-inner",
            { yPercent: 120, duration: 0.6, ease: "power3.out", stagger: 0.1 },
            "-=0.25",
          )
          // 4. Deck + glow fade, then the overlay wipes up to the hero.
          .to([canvas, ".intro-glow"], { opacity: 0, duration: 0.4, ease: "power1.in" }, "+=0.5")
          .to(rootRef.current, { yPercent: -100, duration: 0.65, ease: "power3.inOut" }, "-=0.15");

        window.addEventListener("keydown", skip);
        window.addEventListener("wheel", skip, { passive: true });
      } catch {
        // WebGL unavailable or setup failed: never leave a stuck overlay.
        cleanupThree?.();
        removeSkipListeners();
        setVisible(false);
      }
      return () => {
        cleanupThree?.();
        removeSkipListeners();
      };
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
        {/* Warm bloom behind the deck at the settle beat. */}
        <div
          className="intro-glow pointer-events-none absolute h-72 w-96 rounded-full bg-gold opacity-0 blur-3xl"
          aria-hidden="true"
        />

        {/* WebGL deck. */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        <div
          className={`${display.className} pointer-events-none absolute bottom-[16%] flex flex-col items-center gap-2 text-center`}
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
