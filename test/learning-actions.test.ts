import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), admin: vi.fn(), member: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/membership/server", () => ({ requireActiveMember: mocks.member }));
vi.mock("@/lib/domains/server", () => ({ domainRpc: mocks.rpc, refreshDomains: mocks.refresh, actionError: (error: Error) => ({ error: error.message }) }));
import { saveQuestion, submitLearning } from "@/app/learning/actions";

function questionForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    prompt: "플랍에서 다음 액션을 선택하세요.", choices: '[{"id":"a","text":"체크"},{"id":"b","text":"베팅"}]',
    answer_mode: "SINGLE", correct_ids: "a", explanation: "상대 범위와 보드의 연결성을 고려합니다.", difficulty: "INTERMEDIATE", kind: "GTO",
    authorship_note: "자체 작성 후 솔버 검증", authorship_confirmed: "on", solver: "검증 솔버", assumptions: "레이크 없는 MTT", evidence: "내부 검증 파일", frequencies: "체크 100%",
    spot_category: "FLOP", spot_format: "MTT", spot_players: "6", spot_stack_bb: "30", spot_hero_position: "BTN", spot_villain_position: "BB",
    spot_hero_hand: "A♠, K♥", spot_board: "Qs 10d 2c", spot_pot_bb: "5.5", spot_action_history: "BTN 2 BB 오픈, BB 콜. 플랍 BB 체크.",
  })) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin.mockResolvedValue({});
  mocks.member.mockResolvedValue({ supabase: {} });
  mocks.rpc.mockResolvedValue({ id: "attempt", day: "2026-09-15", correct_count: 4, xp: 30, current_streak: 2, answers: [] });
});

describe("versioned learning authoring", () => {
  it("normalizes the complete poker situation before the atomic version save", async () => {
    expect((await saveQuestion({}, questionForm())).error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith({}, "save_learning_question", expect.objectContaining({ p_payload: expect.objectContaining({
      spot: { game: "NLHE", category: "FLOP", format: "MTT", players: 6, stack_bb: 30, hero_position: "BTN", villain_position: "BB",
        hero_hand: ["As", "Kh"], board: ["Qs", "Td", "2c"], pot_bb: 5.5, action_history: "BTN 2 BB 오픈, BB 콜. 플랍 BB 체크." },
    }) }));
  });
  it.each([
    ["spot_board", "As Td 2c"], ["spot_board", "Qs Td"], ["spot_hero_hand", "As As"], ["spot_hero_hand", "Ax Kh"],
    ["spot_stack_bb", "0"], ["spot_stack_bb", "Infinity"], ["spot_players", "6.5"], ["spot_players", "11"],
    ["spot_villain_position", "BTN"], ["spot_hero_position", "DEALER"], ["spot_pot_bb", "0"], ["spot_action_history", ""],
    ["spot_category", "NONE"], ["spot_format", "UNKNOWN"],
  ])("rejects an invalid %s before creating a version (%s)", async (field, value) => {
    const form = questionForm(); form.set(field, value);
    expect((await saveQuestion({}, form)).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("allows a general concept question without inventing a poker situation", async () => {
    const form = questionForm(); form.set("kind", "GENERAL"); form.set("spot_category", "NONE");
    expect((await saveQuestion({}, form)).error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith({}, "save_learning_question", expect.objectContaining({ p_payload: expect.objectContaining({ spot: null }) }));
  });
  it("allows a preflop spot without community cards or a supplied pot", async () => {
    const form = questionForm(); form.set("spot_category", "PREFLOP"); form.set("spot_board", ""); form.set("spot_pot_bb", "");
    expect((await saveQuestion({}, form)).error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith({}, "save_learning_question", expect.objectContaining({ p_payload: expect.objectContaining({ spot: expect.objectContaining({ board: [], pot_bb: null }) }) }));
  });
});

describe("final learning submission", () => {
  it("returns the first server result with every question selection and streak", async () => {
    const form = new FormData(); form.set("day", "2026-09-15");
    for (let index = 1; index <= 5; index++) form.append("answer:10000000-0000-4000-8000-00000000000" + index, "a");
    form.append("answer:10000000-0000-4000-8000-000000000005", "b");
    const state = await submitLearning({}, form);
    expect(state).toEqual(expect.objectContaining({ result: expect.objectContaining({ correct_count: 4, xp: 30, current_streak: 2 }) }));
    expect(mocks.rpc).toHaveBeenCalledWith({}, "submit_daily_learning", { p_day: "2026-09-15", p_answers: {
      "10000000-0000-4000-8000-000000000001": ["a"], "10000000-0000-4000-8000-000000000002": ["a"],
      "10000000-0000-4000-8000-000000000003": ["a"], "10000000-0000-4000-8000-000000000004": ["a"],
      "10000000-0000-4000-8000-000000000005": ["a", "b"],
    } });
  });
});
