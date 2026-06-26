<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Styling & design system

- **Tailwind v4** (CSS-first). Tokens live in `app/globals.css` under `@theme`
  (DO:NUTS palette: `--color-bg/ink/gold`, `--color-coral-*`, `--radius-card/pill`)
  and the shadcn token layer (`@theme inline` + `:root`/`.dark`). There is no
  `tailwind.config.ts`.
- The whole app runs dark: `<html class="dark">` in `app/layout.tsx`. shadcn
  tokens are mapped to the DO:NUTS dark palette in the `.dark` block — `--primary`
  and `--ring` are gold, `--background`/`--card`/`--border` match the site.
- **Admin pages (`app/admin/**`) use shadcn/ui primitives** from
  `components/ui/*` (Button, Input, Label, Select, Checkbox, Textarea, Card,
  Separator). Add more with `npx shadcn@latest add <name>`. Don't hand-roll
  inputs/buttons in admin.
- **Public site (`app/(site)/**`, `components/home|site|schedule|league|...`)
  keeps the bespoke design** using the custom tokens (`bg-bg`, `text-ink`,
  `text-gold`, `bg-glass`, `border-border`, `rounded-card`). Do NOT convert
  public marketing pages to shadcn.
- shadcn Radix `Select` submits via its `name` prop in server-action forms.
  `SelectItem` value must be non-empty — for optional fields, omit the empty
  item and use `<SelectValue placeholder="...">` (a blank submission parses to
  null in the actions).
- Test env (`test/setup.ts`) polyfills `ResizeObserver` + pointer-capture so
  Radix components render under jsdom.
