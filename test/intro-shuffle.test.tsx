import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

// Mock GSAP so no real animation runs under jsdom. The timeline is a chainable
// stub; progress() is a spy so we can assert skip behavior.
const timelineStub = {
  to: vi.fn(() => timelineStub),
  from: vi.fn(() => timelineStub),
  set: vi.fn(() => timelineStub),
  add: vi.fn(() => timelineStub),
  progress: vi.fn(() => timelineStub),
  eventCallback: vi.fn(() => timelineStub),
  kill: vi.fn(() => timelineStub),
};
// Capture the timeline's onComplete so tests can simulate the intro finishing.
let capturedOnComplete: (() => void) | undefined;
vi.mock("gsap", () => ({
  default: {
    timeline: vi.fn((opts?: { onComplete?: () => void }) => {
      capturedOnComplete = opts?.onComplete;
      return timelineStub;
    }),
    set: vi.fn(),
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn() },
  },
}));
// Mock three.js — jsdom has no WebGL. Minimal stubs for the classes the
// component constructs, enough that setup runs without throwing.
vi.mock("three", () => {
  const vec = () => ({ set: vi.fn() });
  class Geo {
    attributes = { position: { array: new Float32Array(0), count: 0, needsUpdate: false } };
    computeVertexNormals() {}
    dispose() {}
  }
  return {
    Scene: class {
      add() {}
    },
    PerspectiveCamera: class {
      position = vec();
      aspect = 1;
      lookAt() {}
      updateProjectionMatrix() {}
    },
    WebGLRenderer: class {
      setPixelRatio() {}
      setSize() {}
      setClearColor() {}
      render() {}
      dispose() {}
    },
    AmbientLight: class {
      position = vec();
    },
    DirectionalLight: class {
      position = vec();
    },
    PlaneGeometry: Geo,
    MeshStandardMaterial: class {
      dispose() {}
    },
    Mesh: class {
      position = vec();
      rotation = { set: vi.fn() };
      constructor(public geometry: Geo) {}
    },
    CanvasTexture: class {
      dispose() {}
    },
    Color: class {},
    DoubleSide: 2,
    FrontSide: 0,
    BackSide: 1,
  };
});
// useGSAP: run the callback in an effect (like the real hook) and honor cleanup.
vi.mock("@gsap/react", async () => {
  const React = await import("react");
  return {
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});

import { shouldPlayIntro, markIntroSeen } from "@/lib/intro";
vi.mock("@/lib/intro", async (orig) => {
  const actual = await orig<typeof import("@/lib/intro")>();
  return { ...actual, shouldPlayIntro: vi.fn(), markIntroSeen: vi.fn() };
});

import IntroShuffle from "@/components/home/IntroShuffle";

afterEach(() => {
  vi.clearAllMocks();
  capturedOnComplete = undefined;
  window.sessionStorage.clear();
});

describe("IntroShuffle", () => {
  it("renders nothing once the intro should not play (seen / reduced motion)", async () => {
    vi.mocked(shouldPlayIntro).mockReturnValue(false);
    const { container } = render(<IntroShuffle />);
    await waitFor(() => {
      expect(container.querySelector(".intro-overlay")).toBeNull();
    });
    expect(markIntroSeen).not.toHaveBeenCalled();
  });

  it("plays on a fresh visit and marks the session only when the intro finishes", async () => {
    vi.mocked(shouldPlayIntro).mockReturnValue(true);
    render(<IntroShuffle />);
    // Overlay present with a keyboard-focusable skip button while playing.
    expect(document.querySelector(".intro-overlay")).not.toBeNull();
    const skip = screen.getByRole("button", { name: "건너뛰기" });
    expect(skip.tagName).toBe("BUTTON");

    // The session is marked seen on completion — not at build time — so a
    // dev double-invoke of the effect replays instead of bailing.
    await waitFor(() => expect(capturedOnComplete).toBeTypeOf("function"));
    expect(markIntroSeen).not.toHaveBeenCalled();
    act(() => capturedOnComplete!());
    expect(markIntroSeen).toHaveBeenCalledTimes(1);
  });
});
