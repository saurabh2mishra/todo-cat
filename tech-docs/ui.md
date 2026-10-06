# UI

## Design direction: The Index

Lissie keeps records with the gravity of a museum archivist. Your tasks are specimens she has agreed to maintain. The aesthetic is a sparse personal catalog — precise, low-chrome, with a barely-perceptible cool purple-charcoal undertone that is Lissie's worldview made visible.

**Typefaces**: `Instrument Serif` (Google, weight 400) for `h1` headings on shell/auth pages — opinionated, slightly quirky, editorial. Geist Sans for all UI text. The contrast is the point: Lissie's world is orderly, not neutral.

**Color palette**: a cool purple-grey infrastructure, not warm.

**Signature detail**: open todo rows grow a 2px yellow left-strip on hover (`::before` pseudo-element using `--accent`). No ALL-CAPS labels. Inline delete confirmation replaces the todo row rather than a modal.

## Token system

All tokens live in the `:root` block in [`app/globals.css`](../app/globals.css) and are registered with Tailwind v4's `@theme inline` block, making them available as `bg-background`, `text-foreground`, etc.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#fafafa` | `#141318` | Page background |
| `--foreground` | `#1a1822` | `#eceaef` | Primary text |
| `--surface` | `#f3f2f7` | `#1d1a24` | Todo panel, raised areas |
| `--muted` | `#6e6a7a` | `#9994a6` | Secondary text, placeholders |
| `--line` | `#e2dfe9` | `#302d3a` | Borders, dividers |
| `--accent` | `#f2b705` | `#f2b705` | Focus rings and the todo left-strip only |
| `--danger` | `#b42318` | `#f97066` | Errors, delete confirmation |

The `--surface` token exists for panels that need to be visually separated from the page background without a border.

## Shared components

- [`components/ui/button.tsx`](../components/ui/button.tsx) — `primary` (dark fill) and `secondary` (bordered) variants; h-10, text-sm.
- [`components/ui/text-field.tsx`](../components/ui/text-field.tsx) — labelled input, h-10, text-sm; label associates by `name`/`id`.
- [`components/ui/shell.tsx`](../components/ui/shell.tsx) — the narrow column for auth/device pages (max-w-xs, centered, py-16).
- [`components/ui/page-header.tsx`](../components/ui/page-header.tsx) — h1 in Instrument Serif (`font-display`, text-4xl) + optional subtitle in `text-muted`.
- [`components/ui/form.tsx`](../components/ui/form.tsx) — vertical field stack and `FormError` (role="alert").
- [`components/ui/text-link.tsx`](../components/ui/text-link.tsx) — underline link, uses `decoration-line` (maps to `--line`).

## Todo panel

[`components/todo-panel.tsx`](../components/todo-panel.tsx) is the interactive todo list, replacing the old read-only sidebar.

Accepts `refreshKey: number` — a `useEffect` watches it and re-fetches when Lissie changes something (the parent `LissieChat` increments the key after each tool completion). Mutations (add, toggle done, delete) re-fetch from the server after completion; toggle also optimistically updates the local state first.

The add form is pinned to the bottom of the panel. The title input is required; the date input (`type="date"`, returns `yyyy-mm-dd`) is optional. Due dates are displayed as "Jan 15" using a fixed-year `Intl.DateTimeFormat` to avoid UTC-offset issues (the service stores dates without time).

Delete confirmation is inline: clicking `×` replaces the row with a "Remove …? [Remove] [Cancel]" strip. The confirmed `DELETE /api/todos/:id` call is then a standard REST adapter call.

## CopilotKit styling gotchas

CopilotKit renders its own shadow DOM-adjacent component tree under `[data-copilotkit]`. Global Tailwind classes do not reach it. All CopilotKit theming happens via CSS custom properties set on `.lissie-chat [data-copilotkit]` in `globals.css`.

Key things to know:

- The CopilotKit property names (`--background`, `--foreground`, `--primary`, etc.) follow a shadcn-style convention — they are separate from the app's own tokens of the same names. The overrides in `globals.css` bridge them.
- The send button uses `[class*="bg-black"]` as its selector hook. This will break if CopilotKit renames the class. Check against the installed version if the send button looks unstyled.
- `color-scheme: light` / `dark` must be set explicitly on `[data-copilotkit]`, otherwise native date inputs and scrollbars inside the chat ignore the OS preference.
- The dark-mode CopilotKit overrides use `--primary: #f2b705` (yellow) because in dark mode, CopilotKit uses `--primary` as the send button background color. In light mode it uses a dark color and `--primary-foreground` handles the button text, so there `--primary: #1a1822`.
