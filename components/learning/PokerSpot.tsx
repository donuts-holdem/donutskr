import { pokerCategoryLabels, pokerFormatLabels } from "@/lib/learning/spot";
import type { PokerSpot as PokerSpotData } from "@/lib/learning/types";

const suits: Record<string, { symbol: string; label: string }> = { s: { symbol: "♠", label: "스페이드" }, h: { symbol: "♥", label: "하트" }, d: { symbol: "♦", label: "다이아몬드" }, c: { symbol: "♣", label: "클로버" } };

function Cards({ cards }: { cards: string[] }) {
  return <span className="flex flex-wrap gap-2">{cards.map(card => <span key={card} role="img" aria-label={suits[card[1]].label + " " + card[0]} className={"inline-flex min-h-11 min-w-9 items-center justify-center gap-1 rounded-md border border-border bg-bg px-2 font-mono font-semibold " + (["h", "d"].includes(card[1]) ? "text-coral-to" : "text-ink")}>
    <span aria-hidden="true">{card[0]}{suits[card[1]].symbol}</span>
  </span>)}</span>;
}

export function PokerSpot({ spot }: { spot?: PokerSpotData | null }) {
  if (!spot) return null;
  return <section aria-label="포커 상황" className="mt-5 rounded-card border border-border bg-glass p-4 sm:p-5">
    <p className="text-xs font-semibold tracking-wide text-gold">NLHE · {pokerFormatLabels[spot.format]} · {spot.players}인 · {pokerCategoryLabels[spot.category]}</p>
    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-4 text-sm">
      <div><dt className="text-xs text-ink/60">유효 스택</dt><dd className="mt-1 font-mono">{spot.stack_bb} BB</dd></div>
      <div><dt className="text-xs text-ink/60">포지션</dt><dd className="mt-1">나 {spot.hero_position}{spot.villain_position && " / 상대 " + spot.villain_position}</dd></div>
      {spot.pot_bb !== null && <div><dt className="text-xs text-ink/60">현재 팟</dt><dd className="mt-1 font-mono">{spot.pot_bb} BB</dd></div>}
      <div className="basis-full"><dt className="text-xs text-ink/60">내 핸드</dt><dd className="mt-2"><Cards cards={spot.hero_hand} /></dd></div>
      {spot.board.length > 0 && <div className="basis-full"><dt className="text-xs text-ink/60">보드</dt><dd className="mt-2"><Cards cards={spot.board} /></dd></div>}
      <div className="basis-full"><dt className="text-xs text-ink/60">이전 액션</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-ink/80">{spot.action_history}</dd></div>
    </dl>
  </section>;
}
