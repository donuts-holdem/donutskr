"use client";
import * as React from "react"

const QUESTIONS = [
    {
        id: 1,
        title: "AJ offsuit · BB vs UTG1 Open",
        stage: "Preflop",
        hero: { pos: "BB", stack: 15, cards: ["As", "Jd"] },
        pot: "4.5 BB",
        eff: "16BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "16", dim: true },
            { pos: "UTG1", stack: "14", active: true, action: "Raise 2" },
            { pos: "LJ", stack: "16", dim: true },
            { pos: "HJ", stack: "16", dim: true },
            { pos: "CO", stack: "16", dim: true },
            { pos: "BTN", stack: "16", dealer: true, dim: true },
            { pos: "SB", stack: "15.5", dim: true },
            { pos: "BB", stack: "15", hero: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            { key: "call", label: "CALL", ev: 1.6, freq: 99.5, correct: true },
            { key: "raise", label: "RAISE 6", ev: 1.55, freq: 0.1 },
            { key: "allin", label: "ALLIN 16", ev: 1.58, freq: 0.4 },
        ],
        answers: ["call"],
        villains: [{ pos: "UTG1", cards: ["9h", "9d"] }],
    },
    {
        id: 2,
        title: "44 · BTN vs CO Open",
        stage: "Preflop → River",
        hero: { pos: "BTN", stack: 46, cards: ["4d", "4c"] },
        villain: { pos: "CO", stack: 61.9, cards: ["Js", "6c"] },
        board: ["Qh", "Ts", "9s", "Kc", "7c"],
        pot: "6.7 BB",
        eff: "16BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "16", dim: true },
            { pos: "UTG1", stack: "58", dim: true },
            { pos: "LJ", stack: "22", dim: true },
            { pos: "HJ", stack: "28", dim: true },
            { pos: "CO", stack: "61.9", action: "Raise 2.1", villain: true },
            { pos: "BTN", stack: "43.9", hero: true, dealer: true },
            { pos: "SB", stack: "51.5", dim: true },
            { pos: "BB", stack: "33", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            {
                key: "call",
                label: "CALL",
                ev: 0.36,
                freq: 100.0,
                correct: true,
            },
            { key: "raise", label: "RAISE 6.82", ev: 0.04, freq: 0.0 },
            { key: "allin", label: "ALLIN 46", ev: -1.26, freq: 0.0 },
        ],
        answers: ["call"],
    },
    {
        id: 3,
        title: "54 offsuit · BB vs LJ Open",
        stage: "Preflop → River",
        hero: { pos: "BB", stack: 23, cards: ["5h", "4s"] },
        villain: { pos: "LJ", stack: 23, cards: ["Qc", "Jd"] },
        board: ["Js", "3h", "2d", "8h", "Ks"],
        pot: "5.5 BB",
        eff: "25BB",
        ante: "5.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "25", dim: true },
            { pos: "UTG1", stack: "25", dim: true },
            {
                pos: "LJ",
                stack: "23",
                active: true,
                action: "Raise 2",
                villain: true,
            },
            { pos: "HJ", stack: "25", dim: true },
            { pos: "CO", stack: "25", dim: true },
            { pos: "BTN", stack: "25", dealer: true, dim: true },
            { pos: "SB", stack: "24.5", dim: true },
            { pos: "BB", stack: "23", hero: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            {
                key: "call",
                label: "CALL",
                ev: 0.21,
                freq: 100.0,
                correct: true,
            },
            { key: "raise", label: "RAISE 7", ev: 0.03, freq: 0.0 },
            { key: "allin", label: "ALLIN 25", ev: -0.62, freq: 0.0 },
        ],
        answers: ["call"],
    },
    {
        id: 4,
        title: "54 suited · CO First In",
        stage: "Preflop",
        hero: { pos: "CO", stack: 17, cards: ["5c", "4c"] },
        pot: "2.5 BB",
        eff: "24BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "24", dim: true },
            { pos: "UTG1", stack: "32", dim: true },
            { pos: "LJ", stack: "42", dim: true },
            { pos: "HJ", stack: "52", dim: true },
            { pos: "CO", stack: "17", hero: true },
            { pos: "BTN", stack: "33", dealer: true, dim: true },
            { pos: "SB", stack: "26.5", dim: true },
            { pos: "BB", stack: "52", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 100.0, correct: true },
            { key: "raise", label: "RAISE 2", ev: -0.1, freq: 0.0 },
            { key: "allin", label: "ALLIN 17", ev: -0.7, freq: 0.0 },
        ],
        answers: ["fold"],
    },
    {
        id: 5,
        title: "88 · UTG1 vs UTG Open",
        stage: "Preflop",
        hero: { pos: "UTG1", stack: 38, cards: ["8h", "8d"] },
        villain: { pos: "UTG", stack: 24, cards: ["Kd", "Td"] },
        pot: "6.5 BB",
        eff: "26BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "24", action: "Raise 2", villain: true },
            { pos: "UTG1", stack: "36", hero: true },
            { pos: "LJ", stack: "34", dim: true },
            { pos: "HJ", stack: "30", dim: true },
            { pos: "CO", stack: "6", dim: true },
            { pos: "BTN", stack: "18", dealer: true, dim: true },
            { pos: "SB", stack: "13.5", dim: true },
            { pos: "BB", stack: "9", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            { key: "call", label: "CALL", ev: 0.17, freq: 49.6, correct: true },
            {
                key: "raise",
                label: "RAISE 5",
                ev: 0.17,
                freq: 50.2,
                correct: true,
            },
            { key: "allin", label: "ALLIN 34", ev: 0.0, freq: 0.1 },
        ],
        answers: ["call", "raise"],
        multi: true,
    },
    {
        id: 6,
        title: "98 suited · SB vs HJ Open",
        stage: "Preflop → Flop",
        hero: { pos: "SB", stack: 30, cards: ["9s", "8s"] },
        villain: { pos: "HJ", stack: 30, cards: ["As", "9c"] },
        board: ["Ts", "5h", "5d"],
        pot: "6 BB",
        eff: "32BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "32", dim: true },
            { pos: "UTG1", stack: "32", dim: true },
            { pos: "LJ", stack: "32", dim: true },
            {
                pos: "HJ",
                stack: "30",
                active: true,
                action: "Raise 2",
                villain: true,
            },
            { pos: "CO", stack: "32", dim: true },
            { pos: "BTN", stack: "32", dealer: true, dim: true },
            { pos: "SB", stack: "30", hero: true },
            { pos: "BB", stack: "31", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            { key: "call", label: "CALL", ev: 0.14, freq: 81.5, correct: true },
            {
                key: "raise",
                label: "RAISE 7",
                ev: 0.14,
                freq: 18.5,
                correct: true,
            },
            { key: "allin", label: "ALLIN 32", ev: -0.34, freq: 0.0 },
        ],
        answers: ["call", "raise"],
        multi: true,
    },
    {
        id: 7,
        title: "88 · BB vs UTG1 All-in + LJ Call",
        stage: "Preflop",
        hero: { pos: "BB", stack: 8, cards: ["8d", "8c"] },
        villains: [
            { pos: "UTG1", cards: ["Ah", "9h"] },
            { pos: "LJ", cards: ["Ad", "Qc"] },
        ],
        pot: "20.5 BB",
        eff: "9BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "9", dim: true },
            { pos: "UTG1", stack: "0", action: "Allin 9", villain: true },
            { pos: "LJ", stack: "0", action: "Call", villain: true },
            { pos: "HJ", stack: "9", dim: true },
            { pos: "CO", stack: "9", dim: true },
            { pos: "BTN", stack: "9", dealer: true, dim: true },
            { pos: "SB", stack: "8.5", dim: true },
            { pos: "BB", stack: "8", hero: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            {
                key: "call",
                label: "CALL",
                ev: 1.48,
                freq: 100.0,
                correct: true,
            },
        ],
        answers: ["call"],
    },
    {
        id: 8,
        title: "A5 suited · LJ vs BB All-in",
        stage: "Preflop",
        hero: { pos: "LJ", stack: 16, cards: ["Ac", "5c"] },
        villain: { pos: "BB", stack: 65, cards: ["Ah", "Jd"] },
        pot: "21.5 BB",
        eff: "48BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "48", dim: true },
            { pos: "UTG1", stack: "16", dim: true },
            { pos: "LJ", stack: "16", hero: true, action: "Raise 2" },
            { pos: "HJ", stack: "28", dim: true },
            { pos: "CO", stack: "63", dim: true },
            { pos: "BTN", stack: "71", dealer: true, dim: true },
            { pos: "SB", stack: "32.5", dim: true },
            {
                pos: "BB",
                stack: "65",
                active: true,
                action: "Allin 18",
                villain: true,
            },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 100.0, correct: true },
            { key: "call", label: "CALL", ev: -1.69, freq: 0.0 },
        ],
        answers: ["fold"],
    },
    {
        id: 9,
        title: "A5 suited · LJ vs UTG1 Open",
        stage: "Preflop",
        hero: { pos: "LJ", stack: 42, cards: ["Ad", "5d"] },
        pot: "4.5 BB",
        eff: "24BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "24", dim: true },
            { pos: "UTG1", stack: "30", action: "Raise 2", active: true },
            { pos: "LJ", stack: "42", hero: true },
            { pos: "HJ", stack: "52", dim: true },
            { pos: "CO", stack: "17", dim: true },
            { pos: "BTN", stack: "33", dealer: true, dim: true },
            { pos: "SB", stack: "26.5", dim: true },
            { pos: "BB", stack: "52", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            { key: "call", label: "CALL", ev: 0.03, freq: 42.0, correct: true },
            {
                key: "raise",
                label: "RAISE 6",
                ev: 0.03,
                freq: 58.0,
                correct: true,
            },
            { key: "allin", label: "ALLIN 42", ev: -0.77, freq: 0.0 },
        ],
        answers: ["call", "raise"],
        multi: true,
    },
    {
        id: 10,
        title: "TT · BTN vs CO 4-bet",
        stage: "Preflop",
        hero: { pos: "BTN", stack: 87.2, cards: ["Ts", "Tc"] },
        villain: { pos: "CO", stack: 51.77, cards: ["As", "Ad"] },
        pot: "31.53 BB",
        eff: "56BB",
        ante: "2.5 BB",
        note: "",
        players: [
            { pos: "UTG", stack: "56", dim: true },
            { pos: "UTG1", stack: "80", dim: true },
            { pos: "LJ", stack: "64", dim: true },
            { pos: "HJ", stack: "90", dim: true },
            {
                pos: "CO",
                stack: "51.77",
                active: true,
                action: "Raise 20.23",
                villain: true,
            },
            {
                pos: "BTN",
                stack: "87.2",
                hero: true,
                dealer: true,
                action: "Raise 8.8",
            },
            { pos: "SB", stack: "103.5", dim: true },
            { pos: "BB", stack: "237", dim: true },
        ],
        actions: [
            { key: "fold", label: "FOLD", ev: 0.0, freq: 0.0 },
            { key: "call", label: "CALL", ev: 5.82, freq: 0.1 },
            {
                key: "allin",
                label: "ALLIN 72",
                ev: 5.97,
                freq: 99.9,
                correct: true,
            },
        ],
        answers: ["allin"],
    },
]

const HOME_LOGO =
    "data:image/webp;base64,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"
const HEADER_LOGO =
    "data:image/webp;base64,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"

type ResultStatus = "correct" | "wrong"
type Result = { status: ResultStatus; picked: string[] } | null

function suitClass(card: string) {
    const s = card.slice(-1).toLowerCase()
    return s === "s" ? "s" : s
}

function suitSymbol(card: string) {
    const s = card.slice(-1).toLowerCase()
    return s === "s"
        ? "♠"
        : s === "h"
          ? "♥"
          : s === "d"
            ? "♦"
            : s === "c"
              ? "♣"
              : ""
}

function rank(card: string) {
    return card.slice(0, -1)
}

function fmtBB(v: any) {
    return String(v ?? "")
        .replace(/bb/g, "BB")
        .replace(/BB/g, "BB")
}

function evText(ev: number | null | undefined) {
    if (ev === null || ev === undefined) return "EV -"
    const fixed = ev.toFixed(2).replace("+0.00", "0.00").replace(/\.00$/, "")
    return `${ev > 0 ? "+" : ""}${fixed} EV`
}

function pct(n: number) {
    return `${Math.round(n * 10) / 10}`.replace(".0", "") + "%"
}

function CardFace({ card }: { card: string }) {
    return (
        <div
            className={`dh-card-mini ${suitClass(card)}`}
            data-suit={suitSymbol(card)}
        >
            <span>{rank(card)}</span>
        </div>
    )
}

function CardBack() {
    return <div className="dh-card-mini back" />
}

function ProgressDots({
    current,
    results,
}: {
    current: number
    results: Result[]
}) {
    return (
        <div className="dh-progress-dots" aria-label="진행률">
            {QUESTIONS.map((_: any, i: number) => {
                const cls =
                    i === current
                        ? "current"
                        : results[i]?.status === "correct"
                          ? "done-good"
                          : results[i]?.status === "wrong"
                            ? "done-bad"
                            : ""
                return <span key={i} className={`dh-q-dot ${cls}`} />
            })}
        </div>
    )
}

export default function DonutsHoldemLabQuiz() {
    const [screen, setScreen] = React.useState<
        "home" | "tournament" | "weekly" | "personality" | "quiz" | "summary"
    >("home")
    const [idx, setIdx] = React.useState(0)
    const [selections, setSelections] = React.useState<string[][]>(() =>
        QUESTIONS.map(() => [])
    )
    const [pending, setPending] = React.useState<boolean[]>(() =>
        QUESTIONS.map(() => false)
    )
    const [results, setResults] = React.useState<Result[]>(() =>
        QUESTIONS.map(() => null)
    )
    const [toast, setToast] = React.useState<{
        msg: string
        type: "good" | "bad"
    } | null>(null)
    const [successFx, setSuccessFx] = React.useState(false)
    const [returnToSummaryAfterRetry, setReturnToSummaryAfterRetry] =
        React.useState(false)

    const q: any = QUESTIONS[idx]
    const correctCount = results.filter((r) => r?.status === "correct").length
    const wrongCount = results.filter((r) => r?.status === "wrong").length

    function showToast(msg: string, type: "good" | "bad" = "good") {
        setToast({ msg, type })
        window.setTimeout(() => setToast(null), 1500)
    }

    function showSuccess() {
        setSuccessFx(true)
        window.setTimeout(() => setSuccessFx(false), 980)
    }

    function openTournamentSimulator() {
        setScreen("tournament")
    }

    function openWeeklyQuiz() {
        setScreen("weekly")
    }

    function openPersonalityTest() {
        setScreen("personality")
    }

    function startWeekOne() {
        setScreen("quiz")
    }

    function goHome() {
        setScreen("home")
    }

    function retryQuestion(i: number) {
        setIdx(i)
        setSelections((prev) => {
            const next = prev.map((x) => [...x])
            next[i] = []
            return next
        })
        setPending((prev) => {
            const next = [...prev]
            next[i] = false
            return next
        })
        setResults((prev) => {
            const next = [...prev]
            next[i] = null
            return next
        })
        setReturnToSummaryAfterRetry(true)
        setScreen("quiz")
    }

    function choose(key: string) {
        if (results[idx]) return
        if (selections[idx].includes(key)) return

        const selectedNow = [...selections[idx], key]
        setSelections((prev) => {
            const next = prev.map((x) => [...x])
            next[idx] = selectedNow
            return next
        })

        const isCorrectPick = q.answers.includes(key)

        if (!isCorrectPick) {
            setPending((prev) => {
                const next = [...prev]
                next[idx] = false
                return next
            })
            setResults((prev) => {
                const next = [...prev]
                next[idx] = { status: "wrong", picked: selectedNow }
                return next
            })
            showToast("오답입니다", "bad")
            if (returnToSummaryAfterRetry) {
                window.setTimeout(() => {
                    setReturnToSummaryAfterRetry(false)
                    setScreen("summary")
                }, 850)
            }
            return
        }

        const correctPicked = selectedNow.filter((x) =>
            q.answers.includes(x)
        ).length
        if (correctPicked < q.answers.length) {
            setPending((prev) => {
                const next = [...prev]
                next[idx] = true
                return next
            })
            showToast("정답 하나 더!", "good")
            return
        }

        setPending((prev) => {
            const next = [...prev]
            next[idx] = false
            return next
        })
        setResults((prev) => {
            const next = [...prev]
            next[idx] = { status: "correct", picked: selectedNow }
            return next
        })
        showToast("정답입니다!", "good")
        showSuccess()
        if (returnToSummaryAfterRetry) {
            window.setTimeout(() => {
                setReturnToSummaryAfterRetry(false)
                setScreen("summary")
            }, 1050)
        }
    }

    function next() {
        if (!results[idx]) {
            alert("선택지를 먼저 골라주세요.")
            return
        }
        if (idx < QUESTIONS.length - 1) setIdx(idx + 1)
        else setScreen("summary")
    }

    function prev() {
        if (idx > 0) setIdx(idx - 1)
    }

    function renderPlayer(p: any, i: number) {
        const heroIndex = q.players.findIndex((x: any) => x.hero)
        const posNum = (heroIndex - i + 4 + q.players.length) % q.players.length
        const posClass = `pos${posNum}`
        const sideClass = [1, 2, 3].includes(posNum)
            ? "leftcards"
            : [5, 6, 7].includes(posNum)
              ? "rightcards"
              : posNum === 4
                ? "bottomcards"
                : ""

        const reveal = !!results[idx]
        const showAsVillain = p.villain || (p.active && !p.hero && p.action)
        let cards: React.ReactNode = null

        if (p.hero) {
            cards = q.hero.cards.map((c: string) => (
                <CardFace key={c} card={c} />
            ))
        } else if (showAsVillain && !reveal) {
            cards = (
                <>
                    <CardBack />
                    <CardBack />
                </>
            )
        } else if (reveal && showAsVillain && q.villain) {
            cards = q.villain.cards.map((c: string) => (
                <CardFace key={c} card={c} />
            ))
        } else if (reveal && showAsVillain && q.villains) {
            const v = q.villains.find((x: any) => x.pos === p.pos)
            if (v)
                cards = v.cards.map((c: string) => (
                    <CardFace key={c} card={c} />
                ))
        }

        return (
            <div
                key={`${p.pos}-${i}`}
                className={`dh-player ${posClass} ${sideClass} ${p.hero ? "hero" : ""} ${p.active ? "active" : ""} ${p.villain ? "villain" : ""} ${p.dim ? "dim" : ""}`}
            >
                {cards && <div className="dh-cards">{cards}</div>}
                <div className="dh-seat">
                    <div>
                        {p.pos}
                        <br />
                        {p.stack}
                    </div>
                </div>
                {p.dealer && <div className="dh-dealer">D</div>}
                {p.action ? (
                    <div className="dh-action-tag">{p.action}</div>
                ) : (
                    <div className="dh-chip">●</div>
                )}
            </div>
        )
    }

    function QuizScreen() {
        const reveal = !!results[idx]
        const answerNames = q.actions
            .filter((a: any) => q.answers.includes(a.key))
            .map((a: any) => `${a.label} · ${evText(a.ev)} · ${pct(a.freq)}`)

        return (
            <main className="dh-main">
                <section className="dh-card">
                    <div className="dh-qhead">
                        <div>
                            <div className="dh-qtitle">
                                <span className="dh-q-badge">문제 {q.id}</span>
                                <span>{q.title}</span>
                            </div>
                            <div className="dh-meta">
                                {[
                                    `Hero ${q.hero.pos}`,
                                    `EFF ${fmtBB(q.eff)}`,
                                    `Pot ${fmtBB(q.pot)}`,
                                ].map((m) => (
                                    <span key={m}>{m}</span>
                                ))}
                            </div>
                        </div>
                        <div className="dh-notice">
                            {pending[idx] && (
                                <div className="dh-mode-hint">
                                    정답 하나 더!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dh-table-area">
                        <div className="dh-poker-table">
                            <div className="dh-pot">
                                <div className="dh-pot-bb">{fmtBB(q.pot)}</div>
                                <div className="dh-pot-ante">
                                    {fmtBB(q.ante)}
                                </div>
                            </div>
                            {q.players.map((p: any, i: number) =>
                                renderPlayer(p, i)
                            )}
                        </div>
                    </div>

                    <div className="dh-options">
                        {q.actions.map((a: any) => {
                            const selected = selections[idx].includes(a.key)
                            const classes = [
                                "dh-option",
                                a.key,
                                selected ? "selected" : "",
                                pending[idx] &&
                                selected &&
                                q.answers.includes(a.key)
                                    ? "pending-correct"
                                    : "",
                                reveal && q.answers.includes(a.key)
                                    ? "correct"
                                    : "",
                                reveal && selected && !q.answers.includes(a.key)
                                    ? "wrong"
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" ")
                            return (
                                <button
                                    key={a.key}
                                    className={classes}
                                    onClick={() => choose(a.key)}
                                >
                                    {reveal && (
                                        <div className="dh-freq">
                                            {pct(a.freq)}
                                        </div>
                                    )}
                                    <div className="dh-label">{a.label}</div>
                                    {reveal && (
                                        <div className="dh-ev">
                                            {evText(a.ev)}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {reveal && (
                        <div className="dh-feedback show">
                            <h3>
                                {results[idx]?.status === "correct"
                                    ? "정답입니다"
                                    : "오답입니다"}
                            </h3>
                            <div className="dh-answer-list">
                                {answerNames.map((x: string) => (
                                    <span
                                        key={x}
                                        className={`dh-answer-chip ${results[idx]?.status === "correct" ? "good" : "bad"}`}
                                    >
                                        {x}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="dh-nav">
                        <button
                            className="secondary"
                            onClick={prev}
                            disabled={idx === 0}
                        >
                            이전 문제
                        </button>
                        <button onClick={next}>
                            {idx === QUESTIONS.length - 1
                                ? "결과 보기"
                                : "다음 문제"}
                        </button>
                    </div>
                </section>
            </main>
        )
    }

    function SummaryScreen() {
        const correctItems = QUESTIONS.map((q: any, i: number) => ({
            q,
            i,
            r: results[i],
        })).filter((x) => x.r?.status === "correct")
        const wrongItems = QUESTIONS.map((q: any, i: number) => ({
            q,
            i,
            r: results[i],
        })).filter((x) => x.r?.status === "wrong")

        const itemHTML = (items: any[], type: "correct" | "wrong") =>
            items.length ? (
                items.map(({ q, i }) => {
                    const ans = q.actions
                        .filter((a: any) => q.answers.includes(a.key))
                        .map((a: any) => a.label)
                        .join(", ")
                    return (
                        <button
                            key={i}
                            className="dh-result-item dh-result-click"
                            onClick={() => retryQuestion(i)}
                        >
                            <b>
                                <span className="dh-mini-q">문제 {q.id}</span>
                                {q.title}
                            </b>
                            <div className={type === "correct" ? "ok" : "no"}>
                                {type === "correct" ? "정답" : "오답"}
                            </div>
                            <div className="dh-result-answer">정답: {ans}</div>
                        </button>
                    )
                })
            ) : (
                <div className="dh-result-empty">해당 문제가 없습니다.</div>
            )

        return (
            <main className="dh-main">
                <section className="dh-card dh-summary show">
                    <div className="dh-result-sections">
                        <section className="dh-result-section">
                            <h3>오답</h3>
                            <div className="dh-result-grid">
                                {itemHTML(wrongItems, "wrong")}
                            </div>
                        </section>
                        <section className="dh-result-section">
                            <h3>정답</h3>
                            <div className="dh-result-grid">
                                {itemHTML(correctItems, "correct")}
                            </div>
                        </section>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button
                            onClick={() => {
                                setIdx(0)
                                setSelections(QUESTIONS.map(() => []))
                                setPending(QUESTIONS.map(() => false))
                                setResults(QUESTIONS.map(() => null))
                                setReturnToSummaryAfterRetry(false)
                                setScreen("home")
                            }}
                            className="dh-restart"
                        >
                            처음부터 다시
                        </button>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <div className="dh-root">
            <style>{styles}</style>
            {toast && (
                <div className={`dh-toast ${toast.type} show`}>{toast.msg}</div>
            )}
            {successFx && (
                <div className="dh-fx show">
                    <div className="dh-success-orb">
                        <div className="dh-success-check">✓</div>
                    </div>
                </div>
            )}

            <header className="dh-header">
                <div className="dh-wrap">
                    <div className="dh-top">
                        <div className="dh-brand">
                            <div className="dh-logo" aria-label="DONUTS logo" />
                            <div>
                                <h1>도너츠 홀덤연구소</h1>
                                <div className="dh-sub">PREFLOP QUIZ</div>
                            </div>
                        </div>

                        {(screen === "quiz" || screen === "summary") && (
                            <div className="dh-quiz-status">
                                <button
                                    className="dh-back-home"
                                    onClick={goHome}
                                    aria-label="홈으로"
                                    title="홈으로"
                                >
                                    <svg
                                        className="dh-home-svg"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path d="M3.5 11.2 12 4l8.5 7.2" />
                                        <path d="M5.8 10.4v9.1h4.2v-5.4h4v5.4h4.2v-9.1" />
                                    </svg>
                                </button>
                                <div className="dh-score">
                                    <ProgressDots
                                        current={idx}
                                        results={results}
                                    />
                                    <div className="dh-score-badges">
                                        <div className="dh-score-badge good">
                                            <span>✓</span>
                                            <b>{correctCount}</b>
                                        </div>
                                        <div className="dh-score-badge bad">
                                            <span>×</span>
                                            <b>{wrongCount}</b>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {(screen === "quiz" || screen === "summary") && (
                        <div className="dh-progress">
                            <div
                                style={{
                                    width: `${(idx / QUESTIONS.length) * 100}%`,
                                }}
                            />
                        </div>
                    )}
                </div>
            </header>

            {screen === "home" && (
                <section className="dh-home">
                    <div className="dh-home-card">
                        <div className="dh-home-hero">
                            <div
                                className="dh-home-logo"
                                aria-label="DONUTS logo"
                            />
                            <div>
                                <div className="dh-home-kicker">
                                    DONUTS HOLD'EM LAB
                                </div>
                                <div className="dh-home-title">
                                    도너츠 홀덤연구소
                                </div>
                                <p className="dh-home-desc">
                                    함께하는 즐거운 성장.
                                    <br />
                                    포커에 대한 모든 컨텐츠, 도너츠 홀덤
                                    연구소입니다.
                                </p>
                            </div>
                        </div>

                        <div className="dh-week-grid">
                            <div
                                className="dh-week-card"
                                onClick={openTournamentSimulator}
                            >
                                <div>
                                    <div className="dh-week-label">
                                        토너먼트 시뮬레이터
                                    </div>
                                    <div className="dh-week-sub">
                                        토너먼트 흐름과 선택을 연습하는
                                        시뮬레이션 컨텐츠
                                    </div>
                                </div>
                                <div
                                    className="dh-card-arrow"
                                    aria-hidden="true"
                                >
                                    →
                                </div>
                            </div>
                            <div
                                className="dh-week-card"
                                onClick={openWeeklyQuiz}
                            >
                                <div>
                                    <div className="dh-week-label">
                                        주간 퀴즈
                                    </div>
                                    <div className="dh-week-sub">
                                        프리플랍, 포스트플랍, ICM 등 홀덤 퀴즈
                                        컨텐츠
                                    </div>
                                </div>
                                <div
                                    className="dh-card-arrow"
                                    aria-hidden="true"
                                >
                                    →
                                </div>
                            </div>
                            <div
                                className="dh-week-card"
                                onClick={openPersonalityTest}
                            >
                                <div>
                                    <div className="dh-week-label">
                                        포커 성향 테스트
                                    </div>
                                    <div className="dh-week-sub">
                                        플레이 스타일과 토너먼트 성향을 분석하는
                                        테스트
                                    </div>
                                </div>
                                <div
                                    className="dh-card-arrow"
                                    aria-hidden="true"
                                >
                                    →
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {screen === "tournament" && (
                <section className="dh-home">
                    <div className="dh-home-card">
                        <button className="dh-category-back" onClick={goHome}>
                            ← 메인으로
                        </button>
                        <div className="dh-home-hero">
                            <div
                                className="dh-home-logo"
                                aria-label="DONUTS logo"
                            />
                            <div>
                                <div className="dh-home-kicker">
                                    DONUTS HOLD'EM LAB
                                </div>
                                <div className="dh-home-title">
                                    토너먼트 시뮬레이터
                                </div>
                                <p className="dh-home-desc">
                                    토너먼트 시뮬레이션 컨텐츠 목록입니다.
                                </p>
                            </div>
                        </div>

                        <div className="dh-empty-box">
                            아직 등록된 컨텐츠가 없습니다.
                        </div>
                    </div>
                </section>
            )}

            {screen === "weekly" && (
                <section className="dh-home">
                    <div className="dh-home-card">
                        <button className="dh-category-back" onClick={goHome}>
                            ← 메인으로
                        </button>
                        <div className="dh-home-hero">
                            <div
                                className="dh-home-logo"
                                aria-label="DONUTS logo"
                            />
                            <div>
                                <div className="dh-home-kicker">
                                    DONUTS HOLD'EM LAB
                                </div>
                                <div className="dh-home-title">주간 퀴즈</div>
                                <p className="dh-home-desc">
                                    매주 업데이트되는 홀덤 연구소 퀴즈
                                    목록입니다.
                                </p>
                            </div>
                        </div>

                        <div className="dh-week-grid">
                            <div
                                className="dh-week-card"
                                onClick={startWeekOne}
                            >
                                <div>
                                    <div className="dh-week-label">
                                        1. PREFLOP 의사결정
                                    </div>
                                    <div className="dh-week-sub">
                                        프리플랍 의사결정 10문제
                                    </div>
                                </div>
                                <div
                                    className="dh-card-arrow"
                                    aria-hidden="true"
                                >
                                    →
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {screen === "personality" && (
                <section className="dh-home">
                    <div className="dh-home-card">
                        <button className="dh-category-back" onClick={goHome}>
                            ← 메인으로
                        </button>
                        <div className="dh-home-hero">
                            <div
                                className="dh-home-logo"
                                aria-label="DONUTS logo"
                            />
                            <div>
                                <div className="dh-home-kicker">
                                    DONUTS HOLD'EM LAB
                                </div>
                                <div className="dh-home-title">
                                    포커 성향 테스트
                                </div>
                                <p className="dh-home-desc">
                                    플레이 스타일과 토너먼트 성향을 분석하는
                                    테스트 목록입니다.
                                </p>
                            </div>
                        </div>

                        <div className="dh-empty-box">
                            아직 등록된 컨텐츠가 없습니다.
                        </div>
                    </div>
                </section>
            )}

            {screen === "quiz" && <QuizScreen />}
            {screen === "summary" && <SummaryScreen />}
        </div>
    )
}

const styles = `
.dh-root{--bg:#12090c;--panel:#201216;--line:#4a2a31;--text:#fff6fb;--muted:#ddb8c7;--donut-pink:#e78aa7;--donut-cream:#f6dfb6;color:var(--text);font-family:Inter,Pretendard,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100%;background:radial-gradient(circle at 50% 0%,#3a1f29 0,#1b0d12 34%,#11070a 72%,#0b0406 100%)} 
.dh-root *{box-sizing:border-box}
.dh-header{position:sticky;top:0;z-index:10;background:rgba(22,9,14,.88);backdrop-filter:blur(12px);border-bottom:1px solid rgba(246,223,182,.18)}
.dh-wrap{max-width:1180px;margin:0 auto;padding:18px}
.dh-top{display:flex;gap:14px;align-items:center;justify-content:space-between}
.dh-brand{display:flex;gap:12px;align-items:center}
.dh-logo{width:37px;height:37px;flex:0 0 37px;background-image:url("${HEADER_LOGO}");background-size:contain;background-repeat:no-repeat;background-position:center;background-color:transparent;border-radius:0;box-shadow:none}
.dh-root h1{font-size:22px;margin:0;color:var(--donut-cream);letter-spacing:.01em}
.dh-sub{font-size:13px;color:#f2b8ca;margin-top:3px;font-weight:700;letter-spacing:.05em}
.dh-quiz-status{display:flex;align-items:center;gap:10px;margin-left:auto}
.dh-back-home{width:37px;height:37px;padding:0;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(246,223,182,.12);background:#341c24;color:#fff1f6;cursor:pointer}
.dh-home-svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round}
.dh-score{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.dh-progress-dots{display:flex;align-items:center;gap:5px;padding:8px 10px;border:1px solid rgba(246,223,182,.16);border-radius:999px;background:rgba(255,255,255,.04);pointer-events:none}
.dh-q-dot{width:9px;height:9px;border-radius:999px;background:rgba(246,223,182,.26);transition:.18s}
.dh-q-dot.current{width:24px;background:linear-gradient(90deg,#e78aa7,#f6dfb6);box-shadow:0 0 18px rgba(231,138,167,.24)}
.dh-q-dot.done-good{background:#f6dfb6}
.dh-q-dot.done-bad{background:#f26f8f}
.dh-score-badges{display:flex;gap:7px}
.dh-score-badge{min-width:52px;height:34px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:999px;border:1px solid rgba(246,223,182,.16);background:rgba(255,255,255,.04);font-weight:1000}
.dh-score-badge span{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:14px}
.dh-score-badge.good span{background:rgba(246,223,182,.18);color:#fff2c8}
.dh-score-badge.bad span{background:rgba(242,111,143,.18);color:#ffd5e0}
.dh-score-badge b{font-size:15px;color:#fff6fb}
.dh-progress{height:8px;background:#2a161c;border-radius:999px;overflow:hidden;margin-top:14px}
.dh-progress>div{height:100%;background:linear-gradient(90deg,#e78aa7,#f6dfb6,#8fd7c6);transition:.25s}
.dh-home{max-width:1180px;margin:0 auto;padding:28px 18px 46px}
.dh-home-card{position:relative;overflow:hidden;border-radius:28px;border:1px solid rgba(246,223,182,.16);background:radial-gradient(circle at 18% 8%,rgba(231,138,167,.20),transparent 36%),radial-gradient(circle at 82% 4%,rgba(246,223,182,.13),transparent 32%),linear-gradient(180deg,rgba(35,18,24,.96),rgba(22,10,14,.96));box-shadow:0 26px 90px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.04);padding:34px}
.dh-home-hero{display:grid;grid-template-columns:180px 1fr;gap:28px;align-items:center}
.dh-home-logo{width:180px;height:180px;border-radius:34px;background-image:url("${HOME_LOGO}");background-size:cover;background-position:center;box-shadow:0 18px 48px rgba(231,138,167,.24),inset 0 0 0 2px rgba(255,255,255,.08)}
.dh-home-kicker{color:#f2b8ca;font-weight:1000;letter-spacing:.16em;font-size:13px}
.dh-home-title{margin:8px 0 10px;font-size:42px;line-height:1.08;color:var(--donut-cream);font-weight:1000;letter-spacing:-.03em}
.dh-home-desc{margin:0;color:#f0cad7;line-height:1.65;font-size:15px;max-width:620px}
.dh-week-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:28px}
.dh-week-card{border:1px solid rgba(246,223,182,.16);background:rgba(255,255,255,.045);border-radius:22px;padding:18px;min-height:148px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:.18s;position:relative;overflow:hidden}
.dh-week-card:hover{transform:translateY(-3px);border-color:rgba(246,223,182,.34);box-shadow:0 16px 38px rgba(0,0,0,.22)}
.dh-week-label{color:#f6dfb6;font-size:20px;font-weight:1000}
.dh-week-sub{color:#f0cad7;font-size:13px;line-height:1.45;margin-top:8px}
.dh-card-arrow{align-self:flex-end;margin-top:18px;font-size:30px;line-height:1;font-weight:1000;color:#ffd7e3;opacity:.82;transition:.18s}
.dh-week-card:hover .dh-card-arrow{transform:translateX(7px);color:#f6dfb6;opacity:1}
.dh-category-back{display:inline-flex;align-items:center;gap:8px;margin-bottom:22px;border:1px solid rgba(246,223,182,.16);background:rgba(255,255,255,.045);color:#f6dfb6;border-radius:999px;padding:10px 14px;font-weight:1000;cursor:pointer;transition:.18s}
.dh-category-back:hover{transform:translateX(-3px);border-color:rgba(246,223,182,.34);background:rgba(246,223,182,.08)}
.dh-empty-box{margin-top:28px;border:1px dashed rgba(246,223,182,.22);background:rgba(255,255,255,.035);border-radius:20px;padding:28px;text-align:center;color:#f0cad7;font-weight:800}
.dh-main{max-width:1180px;margin:0 auto;padding:22px 18px 46px}
.dh-card{background:rgba(35,18,24,.94);border:1px solid rgba(246,223,182,.14);border-radius:24px;box-shadow:0 20px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.03);overflow:hidden;position:relative}
.dh-qhead{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;padding:22px;border-bottom:1px solid rgba(246,223,182,.12);background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0))}
.dh-qtitle{font-size:22px;font-weight:900;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dh-q-badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(246,223,182,.18),rgba(231,138,167,.14));border:1px solid rgba(246,223,182,.20);color:#f6dfb6;font-size:13px;font-weight:1000;letter-spacing:.02em}
.dh-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.dh-meta span{font-size:12px;color:#fff4f8;background:#311b23;border:1px solid rgba(246,223,182,.14);border-radius:999px;padding:6px 9px;font-weight:800}
.dh-notice{max-width:450px;color:#f0cad7;font-size:14px;line-height:1.55;text-align:right}
.dh-mode-hint{font-size:13px;color:#ffdf8a;margin-top:8px;font-weight:800}
.dh-table-area{padding:20px 0 26px;background:linear-gradient(180deg,#1b0e13,#140a0e);overflow:hidden}
.dh-poker-table{position:relative;height:470px;width:100%;max-width:980px;margin:0 auto;border-radius:50%;border:8px solid #5a3434;background:radial-gradient(ellipse at center,#241217 0%,#160b0f 58%,#0e0608 100%);box-shadow:inset 0 0 90px rgba(0,0,0,.55),0 0 0 2px rgba(246,223,182,.06)}
.dh-pot{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%);text-align:center}
.dh-pot-bb{font-size:30px;font-weight:1000;letter-spacing:-.03em;color:#fff6fb}
.dh-pot-ante{color:#94a1b2;font-size:15px}
.dh-player{position:absolute;width:100px;height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.dh-seat{width:64px;height:64px;border-radius:50%;border:4px solid #5a4048;background:#24161b;display:grid;place-items:center;text-align:center;font-weight:900;line-height:1.05;color:#fff4f8;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.dh-player.hero .dh-seat{border-color:#f58eb0;box-shadow:0 0 0 3px rgba(245,142,176,.14),0 8px 24px rgba(0,0,0,.35),0 0 20px rgba(245,142,176,.15)}
.dh-player.active .dh-seat{border-color:#ffd59d;box-shadow:0 0 20px rgba(255,213,157,.16),0 8px 24px rgba(0,0,0,.35)}
.dh-player.dim{opacity:.4}
.dh-action-tag{font-size:12px;background:#3a212a;color:#fff;border:1px solid rgba(246,223,182,.16);border-radius:8px;padding:4px 7px;font-weight:800}
.dh-dealer{position:absolute;right:7px;top:22px;background:#f6dfb6;color:#532f28;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:1000}
.dh-chip{font-size:12px;color:#f0cad7}
.dh-cards{display:flex;gap:4px;position:absolute;top:-24px;z-index:3;left:50%;transform:translateX(-50%)}
.dh-player.bottomcards .dh-cards{top:-28px}
.dh-player.hero .dh-cards{top:-30px}
.dh-card-mini{width:34px;height:48px;border-radius:7px;display:grid;place-items:center;color:#fff;font-size:26px;font-weight:1000;box-shadow:0 6px 16px rgba(0,0,0,.35);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
.dh-card-mini::before{content:attr(data-suit);position:absolute;right:2px;bottom:-7px;font-size:34px;line-height:1;color:rgba(255,255,255,.18);z-index:0}
.dh-card-mini span{position:relative;z-index:1;text-shadow:0 1px 8px rgba(0,0,0,.28)}
.dh-card-mini.s{background:#353841}.dh-card-mini.d{background:#6b58bf}.dh-card-mini.h{background:#c84557}.dh-card-mini.c{background:#339966}
.dh-card-mini.back{background:linear-gradient(135deg,#6f6a6c,#434044);border:1px solid rgba(255,255,255,.16)}
.dh-card-mini.back::before{content:"";display:block}
.dh-card-mini.back::after{content:"";display:block;position:absolute;inset:7px;border-radius:4px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.02))}
.pos0{left:47%;top:-6%}.pos1{left:18%;top:2%}.pos2{left:2%;top:38%}.pos3{left:18%;bottom:1%}.pos4{left:47%;bottom:-6%}.pos5{right:18%;bottom:1%}.pos6{right:2%;top:38%}.pos7{right:18%;top:2%}
.dh-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;padding:20px;background:#170d11;border-top:1px solid rgba(246,223,182,.10)}
.dh-option{min-height:86px;border:0;border-radius:16px;padding:14px 15px;text-align:left;color:#fff;font-weight:1000;cursor:pointer;position:relative;transition:.18s;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.dh-option:hover{transform:translateY(-2px);filter:brightness(1.08)}
.dh-option.fold{background:#66666d}.dh-option.call{background:#4b79b7}.dh-option.raise{background:#7a4d35}.dh-option.allin{background:#b23d45}
.dh-option.selected{outline:4px solid #fff;outline-offset:2px}.dh-option.correct{outline:4px solid #f6dfb6;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 0 26px rgba(246,223,182,.25)}.dh-option.wrong{outline:4px solid #ff6060;filter:saturate(.75)}.dh-option.pending-correct{outline:4px solid #ffdf72;animation:dhPulseGold 1s infinite alternate}
.dh-label{font-size:18px}.dh-ev{margin-top:9px;font-size:13px;color:rgba(255,255,255,.86);font-weight:800}.dh-freq{position:absolute;right:14px;top:13px;font-size:13px;color:rgba(255,255,255,.78)}
@keyframes dhPulseGold{from{box-shadow:0 0 0 rgba(255,223,114,0)}to{box-shadow:0 0 24px rgba(255,223,114,.38)}}
.dh-feedback{padding:18px 22px;border-top:1px solid rgba(246,223,182,.10);background:#1b1015}.dh-feedback h3{margin:0 0 8px;font-size:19px}.dh-answer-list{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.dh-answer-chip{padding:8px 10px;border-radius:999px;background:#311b23;border:1px solid rgba(246,223,182,.14);font-weight:900}.dh-answer-chip.good{background:rgba(80,200,120,.15);border-color:#50c878;color:#a8ffbd}.dh-answer-chip.bad{background:rgba(255,65,65,.12);border-color:#ff4141;color:#ffadad}
.dh-nav{display:flex;justify-content:space-between;gap:12px;padding:18px 22px;background:#160c10;border-top:1px solid rgba(246,223,182,.10)}.dh-nav button,.dh-restart{border:0;border-radius:14px;padding:13px 18px;font-weight:1000;cursor:pointer;color:#4b2a24;background:linear-gradient(135deg,#f6dfb6,#efc888)}.dh-nav button.secondary{background:#341c24;color:#fff1f6;border:1px solid rgba(246,223,182,.12)}.dh-nav button:disabled{opacity:.45;cursor:not-allowed}
.dh-summary{padding:26px}.dh-result-sections{display:grid;gap:24px}.dh-result-section h3{margin:0 0 12px;color:#f6dfb6;font-size:20px;display:flex;align-items:center;gap:8px}.dh-result-section:first-child h3{color:#ffd5e0}.dh-result-section h3::before{content:"";width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 18px currentColor}.dh-result-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.dh-result-item{border:1px solid rgba(246,223,182,.12);background:#221319;border-radius:16px;padding:14px;text-align:left;color:inherit;width:100%;cursor:pointer;transition:.18s}.dh-result-item:hover{transform:translateY(-2px);border-color:rgba(246,223,182,.32)}.dh-result-item b{display:block;margin-bottom:6px}.dh-result-item .ok{color:#95ffb0}.dh-result-item .no{color:#ff8f8f}.dh-result-answer{color:#aeb9c8;margin-top:6px}.dh-mini-q{display:inline-flex;margin-right:8px;padding:4px 8px;border-radius:999px;background:rgba(246,223,182,.12);color:#f6dfb6;font-size:12px;font-weight:1000}.dh-result-empty{border:1px dashed rgba(246,223,182,.18);border-radius:16px;padding:18px;color:#d4aebd}
.dh-toast{position:fixed;left:50%;top:110px;transform:translateX(-50%) translateY(-10px);z-index:30;padding:14px 18px;border-radius:999px;background:#241419;border:1px solid rgba(246,223,182,.16);box-shadow:0 14px 50px rgba(0,0,0,.35);font-weight:1000;opacity:0;pointer-events:none;transition:.25s}.dh-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.dh-toast.good{border-color:#f6dfb6;color:#fff1c9}.dh-toast.bad{border-color:#f26f8f;color:#ffd5e0}.dh-fx{position:fixed;inset:0;pointer-events:none;z-index:25;display:none}.dh-fx.show{display:grid;place-items:center}.dh-success-orb{width:138px;height:138px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(246,223,182,.24),rgba(231,138,167,.10) 52%,transparent 68%);border:1px solid rgba(246,223,182,.45);box-shadow:0 0 70px rgba(246,223,182,.20);animation:dhSuccessPop .88s cubic-bezier(.2,1.2,.2,1) forwards}.dh-success-check{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f6dfb6,#e78aa7);color:#281318;font-size:46px;font-weight:1000;box-shadow:0 18px 54px rgba(0,0,0,.30)}@keyframes dhSuccessPop{0%{opacity:0;transform:scale(.72)}35%{opacity:1;transform:scale(1.04)}100%{opacity:0;transform:scale(1.18)}}
@media(max-width:760px){.dh-wrap{padding:14px}.dh-top{align-items:flex-start;flex-direction:column}.dh-quiz-status{width:100%;margin-left:0;justify-content:space-between;gap:10px}.dh-score{order:1;justify-content:flex-start;gap:8px;flex:1 1 auto}.dh-back-home{order:2;flex:0 0 auto}.dh-home{padding:14px 10px 30px}.dh-home-card{padding:22px;border-radius:22px}.dh-home-hero{grid-template-columns:1fr;text-align:center;justify-items:center;gap:18px}.dh-home-logo{width:140px;height:140px;border-radius:28px}.dh-home-title{font-size:31px}.dh-week-grid{grid-template-columns:1fr}.dh-main{padding:14px 0 34px}.dh-qhead{padding:16px}.dh-table-area{padding:22px 0 28px}.dh-poker-table{width:100%;height:270px;min-height:270px;border-width:4px}.dh-player{width:58px;height:54px;gap:2px}.dh-seat{width:42px;height:42px;font-size:10px;border-width:2px}.dh-action-tag{font-size:8px;padding:2px 4px;max-width:58px;border-radius:6px}.dh-chip{font-size:8px}.dh-dealer{width:15px;height:15px;font-size:9px;right:3px;top:14px}.dh-card-mini{width:22px;height:31px;font-size:16px;border-radius:5px}.dh-cards{gap:2px;top:-12px}.dh-player.bottomcards .dh-cards,.dh-player.hero .dh-cards{top:-14px}.dh-pot-bb{font-size:20px}.dh-pot-ante{font-size:11px}.dh-options{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px}.dh-option{min-height:58px;padding:10px;border-radius:12px}.dh-label{font-size:14px}}
@media(max-width:390px){.dh-home-title{font-size:27px}.dh-home-logo{width:118px;height:118px}.dh-poker-table{height:248px;min-height:248px}.dh-action-tag{display:none}}

/* Framer breakpoint / canvas sizing pass */
.dh-root{
  width:100%;
  height:100vh;
  height:100svh;
  min-height:0;
  display:flex;
  flex-direction:column;
  overflow-x:hidden;
  overflow-y:auto;
  position:relative;
}
.dh-header{
  z-index:2;
  flex:0 0 auto;
}
.dh-wrap{
  width:min(100%,1280px);
  max-width:1280px;
  margin:0 auto;
  padding:20px;
}
.dh-home,
.dh-main{
  width:min(100%,1280px);
  max-width:1280px;
  margin:0 auto;
  padding-left:20px;
  padding-right:20px;
}
.dh-home{
  padding-top:64px;
  padding-bottom:96px;
}
.dh-main{
  padding-top:40px;
  padding-bottom:96px;
}
.dh-home-card,
.dh-card{
  width:100%;
}
.dh-home-title{
  font-size:clamp(42px,5.2vw,64px);
}
.dh-qtitle{
  font-size:clamp(18px,2.2vw,22px);
}
.dh-poker-table{
  width:100%;
  max-width:980px;
  margin-left:auto;
  margin-right:auto;
}

/* Framer tablet breakpoint */
@media(max-width:920px){
  .dh-home-hero{
    grid-template-columns:160px 1fr;
  }
  .dh-home-logo{
    width:160px;
    height:160px;
  }
  .dh-week-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
  .dh-table-area{
    padding-top:24px;
    padding-bottom:30px;
  }
}

/* Framer mobile breakpoint, matching the attached Framer page rhythm */
@media(max-width:810px){
  .dh-wrap{
    padding:20px;
  }
  .dh-top{
    flex-direction:column;
    align-items:flex-start;
  }
  .dh-quiz-status{
    width:100%;
    margin-left:0;
    justify-content:space-between;
    gap:10px;
  }
  .dh-score{
    order:1;
    justify-content:flex-start;
    gap:8px;
    flex:1 1 auto;
  }
  .dh-back-home{
    order:2;
    flex:0 0 auto;
  }
  .dh-home,
  .dh-main{
    padding-left:20px;
    padding-right:20px;
  }
  .dh-home{
    padding-top:42px;
    padding-bottom:72px;
  }
  .dh-main{
    padding-top:34px;
    padding-bottom:72px;
  }
  .dh-home-card{
    border-radius:26px;
    padding:22px;
  }
  .dh-home-hero{
    grid-template-columns:1fr;
    text-align:center;
    justify-items:center;
    gap:18px;
  }
  .dh-home-logo{
    width:140px;
    height:140px;
    border-radius:28px;
  }
  .dh-home-title{
    font-size:42px;
  }
  .dh-week-grid{
    grid-template-columns:1fr;
  }
  .dh-card{
    border-radius:26px;
  }
  .dh-qhead{
    padding:18px;
    gap:12px;
  }
  .dh-table-area{
    padding:22px 0 28px;
  }
  .dh-poker-table{
    width:100%;
    max-width:none;
    height:270px;
    min-height:270px;
    border-width:4px;
  }
  .dh-player{
    width:58px;
    height:54px;
    gap:2px;
  }
  .dh-seat{
    width:42px;
    height:42px;
    font-size:10px;
    border-width:2px;
  }
  .dh-action-tag{
    font-size:8px;
    padding:2px 4px;
    max-width:58px;
    border-radius:6px;
  }
  .dh-chip{
    font-size:8px;
  }
  .dh-dealer{
    width:15px;
    height:15px;
    font-size:9px;
    right:3px;
    top:14px;
  }
  .dh-card-mini{
    width:22px;
    height:31px;
    font-size:16px;
    border-radius:5px;
  }
  .dh-card-mini::before{
    font-size:24px;
    bottom:-5px;
  }
  .dh-cards{
    gap:2px;
    top:-12px;
  }
  .dh-player.bottomcards .dh-cards,
  .dh-player.hero .dh-cards{
    top:-14px;
  }
  .dh-pot-bb{
    font-size:20px;
  }
  .dh-pot-ante{
    font-size:11px;
  }
  .dh-options{
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:8px;
    padding:10px;
  }
  .dh-option{
    min-height:58px;
    padding:10px;
    border-radius:12px;
  }
  .dh-label{
    font-size:14px;
  }
}

/* Framer small phone breakpoint */
@media(max-width:480px){
  .dh-root{
    height:100svh;
  }
  .dh-wrap{
    padding:16px;
  }
  .dh-home,
  .dh-main{
    padding-left:16px;
    padding-right:16px;
  }
  .dh-home{
    padding-top:42px;
    padding-bottom:72px;
  }
  .dh-main{
    padding-top:22px;
    padding-bottom:72px;
  }
  .dh-logo{
    width:27px;
    height:27px;
    flex-basis:27px;
  }
  .dh-root h1{
    font-size:18px;
  }
  .dh-sub{
    display:none;
  }
  .dh-home-title{
    font-size:34px;
  }
  .dh-home-logo{
    width:118px;
    height:118px;
  }
  .dh-qhead{
    padding:14px;
    flex-direction:column;
  }
  .dh-q-badge{
    font-size:11px;
    padding:5px 8px;
  }
  .dh-meta{
    gap:5px;
  }
  .dh-meta span{
    font-size:11px;
    padding:5px 7px;
  }
  .dh-table-area{
    padding:20px 0 26px;
  }
  .dh-poker-table{
    height:270px;
    min-height:270px;
  }
  .dh-action-tag{
    font-size:8px;
  }
  .dh-nav{
    padding:12px;
    gap:8px;
  }
  .dh-nav button{
    flex:1;
    padding:11px 12px;
    border-radius:12px;
    font-size:13px;
  }
}


/* v3 mobile villain action visibility fix */
@media(max-width:810px){
  .dh-action-tag{
    display:flex !important;
    align-items:center;
    justify-content:center;
    min-width:54px;
    max-width:72px;
    white-space:nowrap;
    overflow:visible;
    text-overflow:clip;
    line-height:1.05;
    margin-top:1px;
    z-index:4;
  }
}
@media(max-width:480px){
  .dh-action-tag{
    display:flex !important;
    min-width:50px;
    max-width:68px;
    font-size:8px;
    padding:2px 4px;
  }
}
@media(max-width:390px){
  .dh-action-tag{
    display:flex !important;
    min-width:48px;
    max-width:66px;
    font-size:7.5px;
    padding:2px 3px;
  }
}

`
