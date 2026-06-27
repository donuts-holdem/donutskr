"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { serializeBlocks } from "@/components/admin/rich-editor-serialize";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-pressed={!!active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={active ? "bg-primary/10 text-primary" : undefined}
    >
      {children}
    </Button>
  );
}

function ToolbarSep() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 self-center bg-border" />;
}

// Link editing via an inline Popover (URL input + 적용/제거) instead of window.prompt.
function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const active = editor.isActive("link");

  function apply() {
    const value = url.trim();
    if (value === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    }
    setOpen(false);
  }

  function remove() {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setUrl((editor.getAttributes("link").href as string) ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="링크"
          title="링크"
          aria-pressed={active}
          className={active ? "bg-primary/10 text-primary" : undefined}
        >
          <Link2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-2">
        <Input
          value={url}
          autoFocus
          placeholder="https://..."
          aria-label="링크 URL"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            // KeyboardEvent.code (not key) + IME-composition guard for Korean input.
            if (e.code === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              apply();
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={apply}>
            적용
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={remove}>
            제거
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto bg-muted/30 px-2 py-1.5">
      <ToolbarButton label="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="밑줄" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton label="소제목" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="작은 제목" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton label="목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="순서 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton label="인용" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </ToolbarButton>

      <ToolbarSep />

      <LinkButton editor={editor} />
      <ToolbarButton label="이미지" onClick={onPickImage}>
        <ImagePlus className="size-4" />
      </ToolbarButton>
    </div>
  );
}

export function ProgramRichEditor({ name, initialHtml }: { name: string; initialHtml: string }) {
  const [serialized, setSerialized] = useState(() =>
    serializeBlocks(initialHtml, initialHtml.trim() === ""),
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false, // required under Next SSR
    extensions: [
      StarterKit.configure({
        // Spec formats are all StarterKit-native; only restrict headings to h2/h3.
        heading: { levels: [2, 3] },
        // Disable StarterKit's bundled link so the standalone Link below (with
        // openOnClick + target/rel) is the sole link extension.
        link: false,
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Image,
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "prose-dark min-h-40 bg-input/30 p-3 outline-none" } },
    onUpdate: ({ editor }) => setSerialized(serializeBlocks(editor.getHTML(), editor.isEmpty)),
  });

  async function uploadImage(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/program-image", { method: "POST", body: fd });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "이미지 업로드에 실패했습니다.");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    const alt = window.prompt("이미지 대체 텍스트 (접근성용 · 장식 이미지는 비워두세요)", "") ?? "";
    editor?.chain().focus().setImage({ src: url, alt }).run();
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
          e.target.value = "";
        }}
      />
      <div className="overflow-hidden rounded-lg border border-input">
        {editor && <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} />}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
