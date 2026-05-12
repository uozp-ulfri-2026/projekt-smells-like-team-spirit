user:

Look through the code (just `./src`), and find places where my classmates and Copilot unnecessarily override shadcn components (all imported from `./src/components/ui`) with their own Tailwind classes - it breaks consistent styling. Please alos identify any places where you would add shadcn components instead of using our custom ones (use shadcn mcp server to search for them). Are there any other UI issues you want to highlight? Always try to simplify and reduce. Write a markdown file at the root.

---

copilot:

# shadcn UI audit (`src` only)

Date: 2026-05-12

This audit only reviews files under `./src`.

## Quick take

The good news: there are **not that many true cases** of shadcn components being visually overridden.

The less-good news: the places that _do_ drift tend to be the most visible ones. The bigger consistency problem is actually this:

- a few shadcn primitives are turned into custom one-off widgets with heavy `className`/`style` overrides, and
- several places build custom panels/buttons with raw HTML instead of using existing shadcn primitives.

So the strongest recommendation is: **simplify, reduce, and compose more; style less.**

---

## Actual shadcn override hotspots

These are the places where a component imported from `src/components/ui` is doing more than light layout adjustment and is effectively being restyled into a custom design.

### 1. `src/components/explorator.tsx:271`

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => onSelectArticle(row.id)}
  className="h-auto w-full justify-start gap-2 border border-l-4 px-2 py-2 text-left transition-colors"
  style={{ ... }}
>
```

**Why this is a problem**

- `variant="ghost"` suggests “minimal button styling”, but then the component gets:
  - a full custom border treatment,
  - a custom left accent border,
  - custom background colors,
  - custom selected-state box-shadow semantics on the inner dot,
  - card/list-item behavior rather than button behavior.
- At that point this is no longer really a `Button`; it is a custom article row masquerading as one.

**Recommendation**

Pick one of these and keep it boring:

1. **Use a plain semantic button/list item** and own the styling fully.
2. **Use `Command` / `CommandItem`** if this is meant to be a searchable/selectable results list.
3. **Use `Card` or a lightweight list row component** and keep `Button` only for explicit actions.

**Simplest direction**

This feels most like a `Command` result row, not a `Button`.

---

### 2. `src/components/article-card.tsx:64-69`

```tsx
<Card
  className="absolute top-4 right-4 z-20 h-[90vh] w-96 border overflow-hidden shadow-lg"
  style={{
    borderColor: article ? hexToRgba(topicStyle.color, 0.55) : undefined,
    boxShadow: article
      ? `0 18px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px ${hexToRgba(topicStyle.color, 0.16)}`
      : undefined,
  }}
>
```

**Why this is a problem**

- The `Card` itself is mostly okay structurally, but the visual treatment is being customized at the surface level.
- The tinted border + custom shadow create a one-off card style that won’t match other cards unless repeated everywhere.
- The top accent bar already communicates topic color well. The extra shadow/border tint is probably overkill.

**Recommendation**

- Keep the accent strip.
- Drop the custom `boxShadow` override.
- If topic state needs to be visible, prefer a `Badge` or small colored meta row instead of changing the whole card shell.

**Verdict**

This is a **real but moderate** override issue.

---

## Things I would _not_ flag as problems

A few places use `className` on shadcn components, but only for layout/spacing. That is normal composition, not a styling smell.

Examples:

- `src/App.tsx:407` — `Card className="p-0 flex-1 min-h-0 overflow-hidden relative"`
- `src/components/article-card.tsx:91,94,95,109` — spacing/typography on `CardContent`, `CardHeader`, `CardTitle`
- `src/components/explorator.tsx` — disabled opacity on pagination next/previous controls

Those are fine. Not every `className` is a crime scene.

---

## Places where I would add shadcn components instead of custom UI

I checked the shadcn registry and confirmed these relevant components exist:

- `command`
- `badge`
- `empty`
- `scroll-area`
- also available in the registry: `drawer`, `sheet`, `card`, `button-group`, etc.

Suggested add command if you want these primitives locally:

`bunx shadcn@latest add @shadcn/badge @shadcn/command @shadcn/empty @shadcn/scroll-area`

### 1. Use `Command` in `src/components/explorator.tsx`

Current structure:

- `Input` for search
- `Select` for topic filter
- custom mapped list of results
- custom empty state
- custom selected row styling

**Why `Command` fits**

This component is already behaving like a searchable command palette / picker:

- filterable list
- keyboard-friendly item selection would be valuable
- consistent row styling out of the box
- built-in `CommandEmpty`

**What to replace**

- The custom result list around `pagedRows.map(...)`
- Potentially the search input as well

**What to keep**

- The topic filter can stay as `Select`
- The topic-colored dot can remain as a tiny accent inside each item

---

### 2. Use `Empty` in `src/components/explorator.tsx:264`

Current code:

```tsx
<div className="py-4 text-sm text-gray-500">Ni zadetkov za izbrane filtre.</div>
```

**Why `Empty` fits**

- This is exactly an empty state.
- It avoids one-off text styling.
- It gives you a consistent title/description/media/action structure.

**Also important**

- `text-gray-500` is a token escape hatch and will age badly in themed UI.
- Use semantic tokens (`text-muted-foreground`) or the `Empty` primitive instead.

---

### 3. Use `Badge` for topic labels in `src/components/article-card.tsx`

Current topic display is a styled paragraph:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide" style={{ color: topicStyle.textColor }}>
```

**Why `Badge` fits**

- Topic/category labels are badge-shaped information architecture.
- It keeps labeling consistent across cards, sidebars, and legends.
- It lets the card shell stay neutral while the metadata carries the accent.

**Simpler direction**

- neutral `Card`
- colored `Badge` for the topic
- optional small accent bar if really needed

---

### 4. Use `ScrollArea` in `src/components/article-card.tsx` and possibly `src/components/explorator.tsx`

Current article panel content:

```tsx
<div className="flex-1 overflow-y-auto">
```

**Why `ScrollArea` fits**

- Consistent scroll behavior and visuals
- Better separation between container shell and scrollable content
- More obviously “a shadcn panel” and less “some div with overflow turned on”

This is a good small cleanup with low risk.

---

### 5. Consider `Sheet`/`Drawer` for `src/components/article-card.tsx`

`ArticleCard` is effectively a dismissible side panel overlay with a close button.

That is very close to the job description of a `Sheet` (desktop) or `Drawer` (especially if you ever care about mobile ergonomics).

**Why this matters**

Right now it is a custom floating `Card` with:

- absolute positioning
- custom close button
- manual overlay/panel behavior

A `Sheet` would reduce custom interaction code and make the UI more predictable.

---

### 6. Use `Card` for repeated floating info panels in `src/App.tsx` and `src/components/timeline-slider.tsx`

These all share a near-identical visual recipe:

- `bg-background/95`
- `border`
- `shadow-md`
- `backdrop-blur`
- rounded panel shell

Examples:

- `src/App.tsx:81` — country color legend
- `src/App.tsx:452` — timeline loading/failure panel
- `src/components/timeline-slider.tsx:25` — timeline control shell
- `src/App.tsx:409-417` — selected-country status panel

**Recommendation**

Create one consistent floating panel primitive, ideally composed from `Card`.

Right now these are four slightly different DIY panels. Same idea, four costumes.

---

## Other UI issues worth highlighting

These are not all shadcn-override issues, but they are consistency issues.

### 1. Raw `<button>` usage where `Button` would be more consistent

Examples:

- `src/App.tsx:411` — clear selected country
- `src/components/explorator.tsx:249` — clear selected-dot state
- `src/components/article-card.tsx:80` — close article panel
- `src/components/map.tsx:540`, `src/components/map.tsx:778` — map popup/control buttons

For the first three, I would strongly prefer the existing shadcn `Button` with appropriate variant/size.

For `map.tsx`, custom buttons may be justified because of portals / map-library constraints, but even there the button styles are effectively a private design system. If they stay custom, they should at least be treated as one shared primitive.

---

### 2. Duplicated floating-surface styling

This is repeated in multiple places with tiny variations:

- `border bg-background/95 shadow-md backdrop-blur`
- slightly different padding/radius/placement each time

That is a classic sign you need one shared panel component.

**Suggested reduction**

Create a small app-level component such as:

- `FloatingPanel`
- or `MapOverlayCard`

…and stop rewriting the shell.

---

### 3. Token inconsistency: `text-gray-500`

Found in:

- `src/components/explorator.tsx:264`

This should almost certainly be `text-muted-foreground` or replaced by `Empty`.

Hardcoded gray is how design systems slowly become archaeology.

---

### 4. The article list item is trying to communicate too many states at once

In `Explorator`, each row currently uses:

- left border color
- tinted background
- tinted border on selection
- colored dot
- colored metadata text

That is a lot of simultaneous encoding.

**Simpler approach**

Keep only two of these:

- colored dot or badge for topic
- selected background/border state

You probably do not need all four.

---

### 5. `ArticleCard` is visually dense for a reading surface

The combination of:

- very tall fixed panel
- custom strong shadow
- topic-tinted shell
- multiple separators
- close button floating over content

makes it feel a little heavier than necessary.

**Reduction idea**

- neutral `Sheet` or neutral `Card`
- topic `Badge`
- fewer separators
- standard header action area

This would look calmer and more “systematic”.

---

## Prioritized cleanup order

If you want the biggest consistency win with the least churn, I would do this in order:

1. **Refactor `Explorator` result rows**
   - stop using heavily restyled `Button` rows
   - consider `Command` for the whole searchable list

2. **Standardize floating panels**
   - legend
   - selected-country panel
   - timeline control shell
   - timeline fallback panel

3. **Normalize raw buttons to shadcn `Button`**
   - clear actions
   - close action

4. **Simplify `ArticleCard` styling**
   - keep topic accent small
   - remove custom card-shell shadow/border styling
   - consider `Sheet`

5. **Replace one-off empty states with `Empty`**
   - especially in `Explorator`

---

## Bottom line

The styling inconsistency problem in `src` is real, but it is **not** mainly caused by dozens of bad shadcn overrides.

It is mostly caused by:

- one meaningful override (`Explorator` row `Button`),
- one moderate override (`ArticleCard` shell styling), and
- several custom panels/buttons that should be composed from shadcn primitives instead of hand-rolled.

If I had to summarize the cleanup philosophy in one sentence:

**Use shadcn components more literally, and invent fewer surfaces.**
