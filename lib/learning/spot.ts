import { formText } from "@/lib/membership/validation";
import type { PokerCategory, PokerFormat, PokerPosition, PokerSpot } from "@/lib/learning/types";

export const pokerCategoryLabels: Record<PokerCategory, string> = { PREFLOP: "프리플랍", FLOP: "플랍", TURN: "턴", RIVER: "리버", ICM: "ICM" };
export const pokerFormatLabels: Record<PokerFormat, string> = { MTT: "MTT", CASH: "캐시", SNG: "Sit & Go" };
export const pokerPositions: PokerPosition[] = ["BTN", "SB", "BB", "UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO"];

function parseCards(value: string) {
  if (!value.trim()) return [];
  return value.trim().split(/[\s,]+/).map(card => {
    const normalized = card.replace(/^10/, "T").replace(/♠/g, "s").replace(/♥/g, "h").replace(/♦/g, "d").replace(/♣/g, "c");
    if (!/^[2-9TJQKA][cdhs]$/i.test(normalized)) throw new Error("카드는 As Kh처럼 숫자·영문과 무늬를 함께 입력해 주세요.");
    return normalized[0].toUpperCase() + normalized[1].toLowerCase();
  });
}

export function parsePokerSpot(form: FormData): PokerSpot | null {
  const category = formText(form, "spot_category");
  if (!category || category === "NONE") {
    if (formText(form, "kind") === "GTO") throw new Error("GTO 문항의 포커 상황을 입력해 주세요.");
    return null;
  }
  const format = formText(form, "spot_format"), players = Number(formText(form, "spot_players"));
  const stack = Number(formText(form, "spot_stack_bb")), hero = formText(form, "spot_hero_position");
  const villainInput = formText(form, "spot_villain_position"), villain = villainInput === "NONE" ? "" : villainInput;
  if (!Object.hasOwn(pokerCategoryLabels, category) || !Object.hasOwn(pokerFormatLabels, format)) throw new Error("포커 상황의 단계와 게임 형식을 선택해 주세요.");
  if (!Number.isInteger(players) || players < 2 || players > 10) throw new Error("테이블 인원은 2~10명의 정수로 입력해 주세요.");
  if (!Number.isFinite(stack) || stack <= 0 || stack > 10000) throw new Error("유효 스택은 0보다 크고 10,000 BB 이하로 입력해 주세요.");
  if (!pokerPositions.includes(hero as PokerPosition) || (villain && (!pokerPositions.includes(villain as PokerPosition) || villain === hero))) throw new Error("서로 다른 내 포지션과 상대 포지션을 선택해 주세요.");
  const hand = parseCards(formText(form, "spot_hero_hand")), board = parseCards(formText(form, "spot_board"));
  if (hand.length !== 2 || new Set([...hand, ...board]).size !== hand.length + board.length) throw new Error("핸드 2장과 보드에 중복되지 않는 카드를 입력해 주세요.");
  const boardSize: Record<PokerCategory, number[]> = { PREFLOP: [0], FLOP: [3], TURN: [4], RIVER: [5], ICM: [0, 3, 4, 5] };
  if (!boardSize[category as PokerCategory].includes(board.length)) throw new Error("프리플랍은 보드 없이, 플랍·턴·리버는 각각 3·4·5장을 입력해 주세요.");
  const potText = formText(form, "spot_pot_bb"), pot = potText ? Number(potText) : null;
  if ((pot !== null && (!Number.isFinite(pot) || pot <= 0 || pot > 1000000)) || (board.length > 0 && pot === null)) throw new Error("현재 팟을 0보다 크고 1,000,000 BB 이하로 입력해 주세요.");
  const history = formText(form, "spot_action_history");
  if (!history || history.length > 4000) throw new Error("이전 액션을 4,000자 이내로 입력해 주세요.");
  return { game: "NLHE", category: category as PokerCategory, format: format as PokerFormat, players, stack_bb: stack,
    hero_position: hero as PokerPosition, villain_position: (villain || null) as PokerPosition | null,
    hero_hand: hand, board, pot_bb: pot, action_history: history };
}
