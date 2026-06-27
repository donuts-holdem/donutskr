import sanitizeHtml from "sanitize-html";
import type { Block, Paragraph, Run } from "@/lib/program-blocks";
import { PROGRAM_SANITIZE_CONFIG } from "@/lib/program-sanitize";

function renderRun(run: Run, key: number): React.ReactNode {
  const { text, bold, href } = run;
  if (href) {
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer">
        {bold ? <strong>{text}</strong> : text}
      </a>
    );
  }
  if (bold) return <strong key={key}>{text}</strong>;
  return text;
}

function renderParagraph(para: Paragraph, key: number): React.ReactNode {
  if (para.runs.length === 0) {
    return <p key={key}><br /></p>;
  }
  return <p key={key}>{para.runs.map((run, i) => renderRun(run, i))}</p>;
}

export function ProgramBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-dark text-ink/80 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "image":
            return (
              // eslint-disable-next-line @next/next/no-img-element -- block images are arbitrary external Framer URLs
              <img key={i} src={block.src} alt={block.alt} />
            );
          case "paragraph":
            return renderParagraph({ runs: block.runs }, i);
          case "list":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    {item.map((para, k) => renderParagraph(para, k))}
                  </li>
                ))}
              </ul>
            );
          case "raw":
            return (
              <div
                key={i}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html, PROGRAM_SANITIZE_CONFIG) }}
              />
            );
        }
      })}
    </div>
  );
}
