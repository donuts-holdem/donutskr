"use client";

import { useState, useRef } from "react";
import type { Block, Paragraph, Run } from "@/lib/program-blocks";
import { useRepeatableRows } from "@/lib/admin/useRepeatableRows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ── ParagraphEditor ───────────────────────────────────────────────────────────
type KeyedRun = { key: string; value: Run };

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

// ── BlockEditor (main export) ─────────────────────────────────────────────────
export function BlockEditor({ name, initial }: { name: string; initial: Block[] }) {
  // Use a ref so addBlock can vary the empty block type before calling add()
  const nextBlockRef = useRef<Block>({ type: "paragraph", runs: [{ text: "" }] });
  const { rows, values, add, remove, update, moveUp, moveDown } = useRepeatableRows<Block>(
    initial,
    () => nextBlockRef.current,
  );

  function addBlock(type: "paragraph" | "list" | "image") {
    if (type === "paragraph") {
      nextBlockRef.current = { type: "paragraph", runs: [{ text: "" }] };
    } else if (type === "list") {
      nextBlockRef.current = { type: "list", items: [[{ runs: [{ text: "" }] }]] };
    } else {
      nextBlockRef.current = { type: "image", src: "", alt: "" };
    }
    add();
  }

  // Compute image-block index for file input naming
  let imgCount = 0;
  const imageIndexMap = new Map<string, number>();
  for (const row of rows) {
    if (row.value.type === "image") {
      imageIndexMap.set(row.key, imgCount++);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Serialization hidden input */}
      <input type="hidden" name={name} value={JSON.stringify(values)} />

      {rows.map((row, idx) => {
        const block = row.value;
        const isFirst = idx === 0;
        const isLast = idx === rows.length - 1;

        // ── Raw block (read-only, reorder-only) ──────────────────────────────
        if (block.type === "raw") {
          return (
            <Card key={row.key} className="border-destructive/40">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <Badge variant="destructive">개발자 확인 필요</Badge>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveUp(idx)}
                    disabled={isFirst}
                    aria-label="위로 이동"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveDown(idx)}
                    disabled={isLast}
                    aria-label="아래로 이동"
                  >
                    ↓
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(block.html)}
                >
                  복사
                </Button>
                <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs font-mono whitespace-pre-wrap break-all">
                  {block.html}
                </pre>
              </CardContent>
            </Card>
          );
        }

        // ── Image block ───────────────────────────────────────────────────────
        if (block.type === "image") {
          const imgIdx = imageIndexMap.get(row.key) ?? 0;
          return (
            <Card key={row.key}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">이미지</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveUp(idx)}
                    disabled={isFirst}
                    aria-label="위로 이동"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveDown(idx)}
                    disabled={isLast}
                    aria-label="아래로 이동"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(row.key)}
                  >
                    삭제
                  </Button>
                </div>
              </CardHeader>
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
                    onChange={(e) => update(row.key, { ...block, alt: e.target.value })}
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
                    onCheckedChange={(v) => update(row.key, { ...block, decorative: !!v, alt: v ? "" : block.alt })}
                  />
                  <Label htmlFor={`block_image_${imgIdx}_decorative`} className="text-sm">
                    장식용 이미지
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── List block ────────────────────────────────────────────────────────
        if (block.type === "list") {
          return (
            <Card key={row.key}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">목록</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveUp(idx)}
                    disabled={isFirst}
                    aria-label="위로 이동"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveDown(idx)}
                    disabled={isLast}
                    aria-label="아래로 이동"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(row.key)}
                  >
                    삭제
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ListEditor
                  items={block.items}
                  onChange={(items) => update(row.key, { type: "list", items })}
                />
              </CardContent>
            </Card>
          );
        }

        // ── Paragraph block ───────────────────────────────────────────────────
        return (
          <Card key={row.key}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">문단</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveUp(idx)}
                  disabled={isFirst}
                  aria-label="위로 이동"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveDown(idx)}
                  disabled={isLast}
                  aria-label="아래로 이동"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(row.key)}
                >
                  삭제
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ParagraphEditor
                paragraph={{ runs: block.runs }}
                onChange={(p) => update(row.key, { type: "paragraph", runs: p.runs })}
              />
            </CardContent>
          </Card>
        );
      })}

      {/* Add block controls */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">+ 블록 추가</span>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("paragraph")}>
          문단
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("list")}>
          목록
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")}>
          이미지
        </Button>
      </div>
    </div>
  );
}
