import { describe, expect, it } from "vitest";
import { calendarDay, confirmAction, parseChoiceLines, positiveInteger } from "@/lib/domains/validation";
import { answerFeedback } from "@/lib/learning/feedback";

describe("domain inputs", () => {
  it("rejects invalid calendar dates rather than normalizing them", () => {
    expect(calendarDay("2028-02-29")).toBe("2028-02-29");
    for (const value of ["2026-02-29", "2026-02-30", "", "2026-09-09T00:00:00Z"]) expect(() => calendarDay(value)).toThrow();
  });
  it("preserves ordered choice text with stable generated identifiers", () => {
    expect(parseChoiceLines(" 콜 \r\n\n폴드\n레이즈")).toEqual([{ id: "option-1", text: "콜" }, { id: "option-2", text: "폴드" }, { id: "option-3", text: "레이즈" }]);
  });
  it("requires actual confirmation and positive integer deadlines", () => {
    const form = new FormData();
    expect(() => confirmAction(form)).toThrow();
    form.set("confirm", "on"); expect(() => confirmAction(form)).not.toThrow();
    expect(positiveInteger(form, "hours", 12)).toBe(12);
    for (const value of ["0", "-1", "1.5", "NaN"]) { form.set("hours", value); expect(() => positiveInteger(form, "hours")).toThrow(); }
    form.set("hours", "24"); expect(positiveInteger(form, "hours")).toBe(24);
  });
});

describe("exact-set learning feedback", () => {
  const choices = [{ id: "a", text: "콜" }, { id: "b", text: "폴드" }, { id: "c", text: "레이즈" }];
  it("identifies omitted correct choices and extra incorrect choices separately", () => {
    expect(answerFeedback({ choices, correct_ids: ["a", "c"], selected_ids: ["a", "b"] })).toEqual({ missing: ["레이즈"], extra: ["폴드"], correct: ["콜", "레이즈"] });
  });
  it("does not treat selection order as an error", () => {
    const feedback = answerFeedback({ choices, correct_ids: ["a", "c"], selected_ids: ["c", "a"] });
    expect(feedback.missing).toEqual([]); expect(feedback.extra).toEqual([]);
  });
});
