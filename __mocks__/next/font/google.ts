// Vitest mock for next/font/google — returns a stub className so font
// calls don't crash in jsdom (next/font compiles away at build time but
// executes as a JS call in the test runner).
const makeFontStub = () => () => ({ className: "mock-font", style: { fontFamily: "mock" } });

export const Space_Grotesk = makeFontStub();
export const Inter = makeFontStub();
export const Pretendard = makeFontStub();
export const Roboto = makeFontStub();
export const Lato = makeFontStub();
