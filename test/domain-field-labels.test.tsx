import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Area, Field } from "@/components/domains/Fields";

afterEach(cleanup);
it("associates repeated form-field names with their own accessible labels", () => {
  render(<><Field name="day" label="출제 날짜" /><Field name="day" label="보호 날짜" /><Area name="notes" label="첫 문항 검수" /><Area name="notes" label="다음 문항 검수" /></>);
  expect(screen.getByLabelText("출제 날짜")).not.toBe(screen.getByLabelText("보호 날짜"));
  expect(screen.getByLabelText("첫 문항 검수")).not.toBe(screen.getByLabelText("다음 문항 검수"));
});
