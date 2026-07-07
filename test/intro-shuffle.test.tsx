import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock GSAP so no real animation runs under jsdom. The timeline is a chainable
// stub; progress() is a spy so we can assert skip behavior.
const timelineStub = {
  to: vi.fn(() => timelineStub),
  from: vi.fn(() => timelineStub),
  set: vi.fn(() => timelineStub),
  add: vi.fn(() => timelineStub),
  progress: vi.fn(() => timelineStub),
  kill: vi.fn(() => timelineStub),
};
vi.mock("gsap", () => ({
  default: {
    timeline: vi.fn(() => timelineStub),
    set: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));
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

  it("plays and marks the session on a fresh visit", async () => {
    vi.mocked(shouldPlayIntro).mockReturnValue(true);
    render(<IntroShuffle />);
    // Overlay present with a keyboard-focusable skip button.
    expect(document.querySelector(".intro-overlay")).not.toBeNull();
    const skip = screen.getByRole("button", { name: "건너뛰기" });
    expect(skip.tagName).toBe("BUTTON");
    await waitFor(() => expect(markIntroSeen).toHaveBeenCalledTimes(1));
  });
});
