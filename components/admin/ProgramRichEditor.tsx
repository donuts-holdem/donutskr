"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { serializeBlocks } from "@/components/admin/rich-editor-serialize";

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={!!active}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
      <ToolbarButton label="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        굵게
      </ToolbarButton>
      <ToolbarButton
        label="소제목"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        소제목
      </ToolbarButton>
      <ToolbarButton label="목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        목록
      </ToolbarButton>
      <ToolbarButton
        label="링크"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("링크 URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      >
        링크
      </ToolbarButton>
      <ToolbarButton label="이미지" onClick={onPickImage}>
        이미지
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
      StarterKit.configure({ heading: { levels: [2] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Image,
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "prose-dark min-h-40 rounded-b-lg p-3 outline-none" } },
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
    editor?.chain().focus().setImage({ src: url }).run();
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
      <div className="rounded-lg border border-input p-2">
        {editor && <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} />}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
