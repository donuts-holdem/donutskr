"use client";

import { useState } from "react";
import type { Paragraph, Run } from "@/lib/program-blocks";
import {
  blocksToSegments,
  segmentsToBlocks,
  newSegmentKey,
  type Segment,
} from "@/lib/admin/block-editor-segments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/admin/ImagePreview";


// ── RunEditor ─────────────────────────────────────────────────────────────────
function RunEditor({
  run,
  onChange,
  onRemove,
}: {
  run: Run;
  onChange: (r: Run) => void;
  onRemove: () => void;
}) {
  const [showHref, setShowHref] = useState(!!run.href);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Input
        className="w-40"
        value={run.text}
        onChange={(e) => onChange({ ...run, text: e.target.value })}
        placeholder="텍스트"
      />
      <Button
        type="button"
        variant={run.bold ? "default" : "outline"}
        size="sm"
        aria-pressed={!!run.bold}
        onClick={() => onChange({ ...run, bold: !run.bold })}
      >
        굵게
      </Button>
      <Button
        type="button"
        variant={showHref ? "default" : "outline"}
        size="sm"
        aria-label="링크"
        aria-pressed={showHref}
        onClick={() => {
          const next = !showHref;
          setShowHref(next);
          if (!next) onChange({ ...run, href: undefined });
        }}
      >
        🔗
      </Button>
      {showHref && (
        <Input
          className="w-48"
          value={run.href ?? ""}
          onChange={(e) => onChange({ ...run, href: e.target.value || undefined })}
          placeholder="URL"
        />
      )}
      <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
        삭제
      </Button>
    </div>
  );
}

// ── RunListEditor (runs of one formatted paragraph) ───────────────────────────
type KeyedRun = { key: string; value: Run };

function RunListEditor({
  runs,
  onChange,
}: {
  runs: Run[];
  onChange: (runs: Run[]) => void;
}) {
  const [keyedRuns, setKeyedRuns] = useState<KeyedRun[]>(() =>
    runs.map((r) => ({ key: crypto.randomUUID(), value: r })),
  );

  function sync(next: KeyedRun[]) {
    setKeyedRuns(next);
    onChange(next.map((k) => k.value));
  }

  return (
    <div className="flex flex-col gap-1">
      {keyedRuns.map((kr) => (
        <RunEditor
          key={kr.key}
          run={kr.value}
          onChange={(r) => sync(keyedRuns.map((k) => (k.key === kr.key ? { ...k, value: r } : k)))}
          onRemove={() => sync(keyedRuns.filter((k) => k.key !== kr.key))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => sync([...keyedRuns, { key: crypto.randomUUID(), value: { text: "" } }])}
      >
        + 조각
      </Button>
    </div>
  );
}

// ── ParagraphEditor (used inside list items) ──────────────────────────────────
function ParagraphEditor({
  paragraph,
  onChange,
}: {
  paragraph: Paragraph;
  onChange: (p: Paragraph) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyedRuns, setKeyedRuns] = useState<KeyedRun[]>(() =>
    paragraph.runs.map((r) => ({ key: crypto.randomUUID(), value: r })),
  );

  function syncRuns(next: KeyedRun[]) {
    setKeyedRuns(next);
    onChange({ runs: next.map((k) => k.value) });
  }

  return (
    <div className="flex flex-col gap-2 flex-1">
      {!expanded ? (
        <Input
          value={keyedRuns[0]?.value.text ?? ""}
          onChange={(e) => {
            const next = [...keyedRuns];
            next[0] = { ...keyedRuns[0], value: { ...(keyedRuns[0]?.value ?? { text: "" }), text: e.target.value } };
            syncRuns(next);
          }}
          placeholder="문단 내용"
        />
      ) : (
        <div className="flex flex-col gap-1">
          {keyedRuns.map((kr) => (
            <RunEditor
              key={kr.key}
              run={kr.value}
              onChange={(r) => syncRuns(keyedRuns.map((k) => (k.key === kr.key ? { ...k, value: r } : k)))}
              onRemove={() => syncRuns(keyedRuns.filter((k) => k.key !== kr.key))}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncRuns([...keyedRuns, { key: crypto.randomUUID(), value: { text: "" } }])}
          >
            + 조각
          </Button>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setExpanded((e) => !e)}
      >
        서식
      </Button>
    </div>
  );
}

// ── ParagraphListEditor (paragraphs within one list item) ─────────────────────
type KeyedP = { key: string; value: Paragraph };

function ParagraphListEditor({
  paragraphs,
  onChange,
}: {
  paragraphs: Paragraph[];
  onChange: (ps: Paragraph[]) => void;
}) {
  const [keyedPs, setKeyedPs] = useState<KeyedP[]>(() =>
    paragraphs.map((p) => ({ key: crypto.randomUUID(), value: p })),
  );

  function syncPs(next: KeyedP[]) {
    setKeyedPs(next);
    onChange(next.map((k) => k.value));
  }

  return (
    <div className="flex flex-col gap-2">
      {keyedPs.map((kp) => (
        <ParagraphEditor
          key={kp.key}
          paragraph={kp.value}
          onChange={(p) => syncPs(keyedPs.map((k) => (k.key === kp.key ? { ...k, value: p } : k)))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          syncPs([...keyedPs, { key: crypto.randomUUID(), value: { runs: [{ text: "" }] } }])
        }
      >
        + 문단
      </Button>
    </div>
  );
}

// ── ListEditor ────────────────────────────────────────────────────────────────
type KeyedItem = { key: string; value: Paragraph[] };

function ListEditor({
  items,
  onChange,
}: {
  items: Paragraph[][];
  onChange: (items: Paragraph[][]) => void;
}) {
  const [keyedItems, setKeyedItems] = useState<KeyedItem[]>(() =>
    items.map((v) => ({ key: crypto.randomUUID(), value: v })),
  );

  function sync(next: KeyedItem[]) {
    setKeyedItems(next);
    onChange(next.map((i) => i.value));
  }

  function addItem() {
    sync([...keyedItems, { key: crypto.randomUUID(), value: [{ runs: [{ text: "" }] }] }]);
  }
  function removeItem(key: string) {
    sync(keyedItems.filter((i) => i.key !== key));
  }
  function updateItem(key: string, value: Paragraph[]) {
    sync(keyedItems.map((i) => (i.key === key ? { ...i, value } : i)));
  }
  function moveItemUp(idx: number) {
    if (idx <= 0) return;
    const a = [...keyedItems];
    [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
    sync(a);
  }
  function moveItemDown(idx: number) {
    if (idx >= keyedItems.length - 1) return;
    const a = [...keyedItems];
    [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
    sync(a);
  }

  return (
    <div className="flex flex-col gap-3">
      {keyedItems.map((item, idx) => (
        <div key={item.key} className="flex flex-col gap-1 pl-3 border-l border-border">
          <ParagraphListEditor
            paragraphs={item.value}
            onChange={(ps) => updateItem(item.key, ps)}
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => moveItemUp(idx)}
              aria-label="항목 위로"
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => moveItemDown(idx)}
              aria-label="항목 아래로"
            >
              ↓
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(item.key)}>
              삭제
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        + 항목
      </Button>
    </div>
  );
}

// ── Reusable card header with reorder (+ optional delete) controls ─────────────
function SegmentHeader({
  label,
  idx,
  total,
  onUp,
  onDown,
  onRemove,
}: {
  label: React.ReactNode;
  idx: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onRemove?: () => void;
}) {
  return (
    <CardHeader className="flex-row items-center justify-between gap-2">
      {typeof label === "string" ? (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      ) : (
        label
      )}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUp}
          disabled={idx === 0}
          aria-label="위로 이동"
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDown}
          disabled={idx === total - 1}
          aria-label="아래로 이동"
        >
          ↓
        </Button>
        {onRemove && (
          <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
            삭제
          </Button>
        )}
      </div>
    </CardHeader>
  );
}

// ── BlockEditor (main export) ─────────────────────────────────────────────────
export function BlockEditor({ name, initial }: { name: string; initial: import("@/lib/program-blocks").Block[] }) {
  const [segments, setSegments] = useState<Segment[]>(() => {
    const segs = blocksToSegments(initial);
    // Guarantee a text area at both ends so the operator can write before the
    // first card (e.g. a leading image) and keep writing after the last one.
    if (segs[0].kind !== "text") {
      segs.unshift({ kind: "text", key: newSegmentKey(), text: "" });
    }
    const last = segs[segs.length - 1];
    if (last.kind !== "text") {
      segs.push({ kind: "text", key: newSegmentKey(), text: "" });
    }
    return segs;
  });

  const blocks = segmentsToBlocks(segments);

  function update(key: string, patch: Partial<Segment>) {
    setSegments((s) => s.map((seg) => (seg.key === key ? ({ ...seg, ...patch } as Segment) : seg)));
  }
  function remove(key: string) {
    setSegments((s) => s.filter((seg) => seg.key !== key));
  }
  function moveUp(idx: number) {
    setSegments((s) => {
      if (idx <= 0) return s;
      const a = [...s];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      return a;
    });
  }
  function moveDown(idx: number) {
    setSegments((s) => {
      if (idx >= s.length - 1) return s;
      const a = [...s];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      return a;
    });
  }
  // Insert a non-text segment before any trailing empty text area, so the
  // editor always ends in a text area for continued writing.
  function addBlock(make: () => Segment) {
    setSegments((s) => {
      const seg = make();
      const last = s[s.length - 1];
      if (last && last.kind === "text" && last.text === "") {
        return [...s.slice(0, -1), seg, last];
      }
      return [...s, seg, { kind: "text", key: newSegmentKey(), text: "" }];
    });
  }

  // Image-block index for file input naming, in stored-block order.
  let imgCount = 0;
  const imageIndexMap = new Map<string, number>();
  for (const seg of segments) {
    if (seg.kind === "image") imageIndexMap.set(seg.key, imgCount++);
  }

  const total = segments.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Serialization hidden input */}
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {segments.map((seg, idx) => {
        // ── Text segment (merged plain paragraphs) ───────────────────────────
        if (seg.kind === "text") {
          return (
            <div key={seg.key} className="flex flex-col gap-1">
              <Textarea
                className="min-h-40"
                value={seg.text}
                onChange={(e) => update(seg.key, { text: e.target.value })}
                placeholder="설명을 입력하세요. 줄바꿈(엔터)으로 문단이 나뉩니다."
                aria-label="설명 본문"
              />
            </div>
          );
        }

        // ── Formatted paragraph segment (bold / link) ────────────────────────
        if (seg.kind === "paragraph") {
          return (
            <Card key={seg.key}>
              <SegmentHeader
                label="서식 문단"
                idx={idx}
                total={total}
                onUp={() => moveUp(idx)}
                onDown={() => moveDown(idx)}
                onRemove={() => remove(seg.key)}
              />
              <CardContent>
                <RunListEditor runs={seg.runs} onChange={(runs) => update(seg.key, { runs })} />
              </CardContent>
            </Card>
          );
        }

        // ── List segment ─────────────────────────────────────────────────────
        if (seg.kind === "list") {
          return (
            <Card key={seg.key}>
              <SegmentHeader
                label="목록"
                idx={idx}
                total={total}
                onUp={() => moveUp(idx)}
                onDown={() => moveDown(idx)}
                onRemove={() => remove(seg.key)}
              />
              <CardContent>
                <ListEditor
                  items={seg.block.items}
                  onChange={(items) => update(seg.key, { block: { type: "list", items } })}
                />
              </CardContent>
            </Card>
          );
        }

        // ── Image segment ────────────────────────────────────────────────────
        if (seg.kind === "image") {
          const imgIdx = imageIndexMap.get(seg.key) ?? 0;
          const block = seg.block;
          return (
            <Card key={seg.key}>
              <SegmentHeader
                label="이미지"
                idx={idx}
                total={total}
                onUp={() => moveUp(idx)}
                onDown={() => moveDown(idx)}
                onRemove={() => remove(seg.key)}
              />
              <CardContent className="flex flex-col gap-3">
                <ImagePreview src={block.src} />
                <div>
                  <Label className="mb-1 block text-xs">이미지 파일</Label>
                  <Input type="file" name={`block_image_${imgIdx}_file`} accept="image/*" />
                </div>
                <div>
                  <Label className="mb-1 block text-xs" htmlFor={`block_image_${imgIdx}_alt`}>
                    대체 텍스트
                  </Label>
                  <Input
                    id={`block_image_${imgIdx}_alt`}
                    value={block.decorative ? "" : block.alt}
                    onChange={(e) => update(seg.key, { block: { ...block, alt: e.target.value } })}
                    placeholder="이미지 설명"
                    disabled={!!block.decorative}
                  />
                  {!block.decorative && !block.alt && (
                    <p className="text-xs text-muted-foreground">대체 텍스트를 입력하면 접근성에 좋습니다</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`block_image_${imgIdx}_decorative`}
                    checked={!!block.decorative}
                    onCheckedChange={(v) =>
                      update(seg.key, { block: { ...block, decorative: !!v, alt: v ? "" : block.alt } })
                    }
                  />
                  <Label htmlFor={`block_image_${imgIdx}_decorative`} className="text-sm">
                    장식용 이미지
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── Raw segment (read-only, reorder-only — no delete) ────────────────
        return (
          <Card key={seg.key} className="border-destructive/40">
            <SegmentHeader
              label={<Badge variant="destructive">개발자 확인 필요</Badge>}
              idx={idx}
              total={total}
              onUp={() => moveUp(idx)}
              onDown={() => moveDown(idx)}
            />
            <CardContent className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(seg.block.html)}
              >
                복사
              </Button>
              <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs font-mono whitespace-pre-wrap break-all">
                {seg.block.html}
              </pre>
            </CardContent>
          </Card>
        );
      })}

      {/* Add block controls */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">+ 블록 추가</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            addBlock(() => ({
              kind: "list",
              key: newSegmentKey(),
              block: { type: "list", items: [[{ runs: [{ text: "" }] }]] },
            }))
          }
        >
          목록
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            addBlock(() => ({
              kind: "image",
              key: newSegmentKey(),
              block: { type: "image", src: "", alt: "" },
            }))
          }
        >
          이미지
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            addBlock(() => ({ kind: "paragraph", key: newSegmentKey(), runs: [{ text: "" }] }))
          }
        >
          서식 문단
        </Button>
      </div>
    </div>
  );
}
