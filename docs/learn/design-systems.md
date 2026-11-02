# Design Systems: what they are, how to reuse one, and why AI apps all look the same

> 4-question note for `E:\Learning\My_tech_knowledgebase\frontend\`. Written while re-theming Life Dashboard (Nov 2026).

---

## 1. The core problem

Without a system, every screen is a fresh set of small decisions: which grey, how much padding,
how round the corners, what a "danger" button looks like. Different screens (or different AI
sessions) answer them differently, so the app drifts and feels stitched together.

AI coding agents make this worse in a specific way. They generate the **statistical average of the
internet**: Inter font, white cards with soft shadows, an indigo/violet accent, purple-blue
gradients, rounded-xl everything, the default shadcn/ui look. Each choice is fine on its own. All
together, they are what people now call **"AI slop" design**: competent, interchangeable and
forgettable. (The first Life Dashboard palette, Inter + indigo on white, was exactly that.)

A **design system** fixes both problems. You make the decisions **once**, write them down in a form
humans *and* agents can read, and every screen draws from it. Personality becomes deliberate
instead of averaged.

---

## 2. The mental model

### Layers of a design system
```
┌──────────────────────────────────────────────────────────────┐
│ 5. Voice & guidelines   "say 'you owe', not 'negative bal.'"   │  ← personality in words
├──────────────────────────────────────────────────────────────┤
│ 4. Patterns             empty states, forms, confirm dialogs   │  ← how pieces combine
├──────────────────────────────────────────────────────────────┤
│ 3. Components           Button, TaskRow, Badge, Dialog          │  ← reusable UI
├──────────────────────────────────────────────────────────────┤
│ 2. Semantic tokens      --accent, --danger, --surface, --ink    │  ← meaning ("what is it for")
├──────────────────────────────────────────────────────────────┤
│ 1. Primitive tokens     --tomato-500: #E4572E, --space-4: 16px  │  ← raw values
└──────────────────────────────────────────────────────────────┘
        + illustration & icon style, motion rules, type scale
```
- **Primitives** are the palette: every colour, size and duration you're allowed to use.
- **Semantic tokens** point at primitives and carry meaning: `--danger: var(--tomato-600)`.
  Components only use semantic tokens. To re-theme the whole app (or add dark mode), you just point the semantic layer at different primitives.
- **Components** are built only from tokens. **Patterns** are recipes made of components.

### "Is it per project, or can I reuse one?" Both. Split it into two halves:
| Half | What it is | Reuse it? |
|---|---|---|
| **Structure** | Token *names* and layers, spacing scale, type scale, component APIs and behaviour, accessibility rules, state rules | **Yes, borrow freely.** This is engineering, and the big systems have tested it on millions of users. |
| **Brand / personality** | The actual colours, fonts, corner shapes, illustration style, voice | **Make your own per project.** Copying a famous product's brand makes your app look like theirs (and their logos and names are trademarks). |

So you take a design system "from the top ones" by **adopting their structure and re-skinning it**
with your own tokens.

### The well-known systems (where to learn from)
| System | By | Good for learning |
|---|---|---|
| Material Design 3 | Google | Token architecture (ref → sys → comp), dynamic colour, state layers (hover/press overlays) |
| Human Interface Guidelines | Apple | Platform conventions, clarity, motion |
| Carbon | IBM | Data-dense enterprise UI, very complete docs |
| Primer | GitHub | Developer tools; great semantic colour naming |
| Polaris | Shopify | Content and voice guidelines |
| Atlassian Design System | Atlassian | Tokens + accessibility process |
| Radix Colors / Radix Themes | WorkOS | 12-step colour scales where each step has a job (bg, border, text), with dark mode built in |
| shadcn/ui | community | Not really a design system: copy-paste components themed by CSS variables. That's why every shadcn app looks alike unless you change the tokens. |

### Style families (the "look" has names too)
A design system is the *structure*; a style family is the *look* you dress it in. A few you'll see named online:
| Style | Recognise it by |
|---|---|
| Flat / "SaaS default" | White cards, soft blurred shadows, rounded-xl, indigo accent: the AI-slop look |
| Glassmorphism | Frosted translucent panels over colourful blurred backgrounds |
| Neumorphism | Soft extruded shapes, the same colour as the background |
| **Neo-brutalism (neubrutalism)** | Thick black outlines, **hard offset shadows with no blur**, flat bold colours (often yellow or pink), chunky grotesk type. Made popular by Gumroad's redesign. |
| Swiss / International style | Strict grids, strong sans-serif type, lots of whitespace, very little decoration |

Life Dashboard's **Swiss Ink** sits between the last two: a *soft* neo-brutalism. It keeps the
1.5 px black frames, offset shadows and one highlighter colour, but uses a calm off-white paper,
small radii and Swiss-style typography so it stays readable all day.
Component kits in this style: **RetroUI** (actively developed, shadcn-CLI compatible) and the older **neobrutalism.dev** (ekmas/neobrutalism-components).

### What people are talking about right now: **DESIGN.md**
- In **April 2026, Google Labs open-sourced the DESIGN.md spec**, which grew out of its Stitch design tool. It's a Markdown file in the project root that describes your design system for AI agents: machine-readable tokens plus the *reasons* behind them ("use the accent only for the single most important action").
- It's the visual counterpart of `AGENTS.md` / `CLAUDE.md`. Those tell an agent *how to code*, and DESIGN.md tells it *how things should look*.
- The community repo **VoltAgent/awesome-design-md** collects DESIGN.md files extracted from real websites. It reached tens of thousands of stars within days of its launch. You can study them, or start from one and change the brand half.
- Known weak spots: the file can drift from the real CSS, nothing validates it automatically yet, and a huge system won't fit an agent's context.
- **Life Dashboard already works this way**: `.agent/design/tokens.css` is the token layer, `ui.css` + `design/README.md` are the components and rules, and Antigravity reads them as its source of truth. We could export the same content as a `DESIGN.md` so tools like Stitch can import it.

---

## 3. Production code breakdown

### Primitive → semantic → component tokens in CSS
```css
:root {
  /* 1. primitives: the raw palette (never used directly by components) */
  --paper-50: #FBF6EC;  --ink-900: #22201C;  --tomato-500: #E4572E;  --tomato-600: #C8431D;

  /* 2. semantic: meaning */
  --bg: var(--paper-50);
  --ink: var(--ink-900);
  --accent: var(--tomato-500);
  --accent-hover: var(--tomato-600);
}
:root[data-theme="dark"] {           /* dark mode = re-point the semantic layer */
  --bg: #17140F;  --ink: #F3ECDF;  --accent: #FF7A52;
}

/* 3. component: only semantic tokens */
.btn-primary { background: var(--accent); color: var(--accent-ink); border-radius: var(--radius-md); }
.btn-primary:hover { background: var(--accent-hover); }
```

### Tailwind v4: expose tokens as utilities
```css
@import "tailwindcss";
@theme inline {
  --color-bg: var(--bg);
  --color-ink: var(--ink);
  --color-accent: var(--accent);
  --radius-md: var(--radius-md);
  --font-display: var(--font-display);
}
/* now <button class="bg-accent text-ink rounded-md font-display"> follows the theme */
```

### A minimal DESIGN.md (the agent-readable version)
```md
# Design: Life Dashboard
## Personality
Warm, printed, a little playful. A paper planner, not a SaaS dashboard.
## Colour (semantic)
- bg #FBF6EC (paper) · ink #22201C · accent #E4572E (tomato): only the main action per screen
- success = money owed to you, done; danger = you owe, overdue
## Type
Display: Bricolage Grotesque 700 for titles and big numbers. UI: Instrument Sans 400–600.
## Rules
- Never use gradients or glassmorphism. Never pure white (#FFF) backgrounds.
- Illustrations: 2-colour line art, flat fills, no 3D, no gradients.
```

---

## 4. Production gotchas

1. **Name tokens by role, not by colour.** `--danger`, not `--red`. When the palette changes, `--red: blue` becomes a lie.
2. **Components never use primitives or hex values.** One raw `#E4572E` in a component means one place the next re-theme misses. (Our rules file enforces "no raw hex in components".)
3. **Dark mode isn't inversion.** You pick separate values: shadows become darker borders, saturated accents get lighter, and pure black is too harsh (use something like `#17140F`).
4. **Contrast is part of the system.** Check every text/background pair for WCAG AA (4.5:1 body text, 3:1 large text and UI). Pretty palettes often fail on muted grey text.
5. **Limit the choices.** A system with 40 greys is no system. Aim for about 10 neutrals, 1 accent, 3 status colours, and 1–2 font families.
6. **The brand half is where "slop" happens.** Avoid the defaults (Inter + indigo + soft shadow + rounded-xl + gradient). Choose a deliberate font pair, an unexpected but meaningful accent, and one signature detail (a shape, a texture, an illustration style).
7. **Illustrations follow tokens too.** Draw them with `currentColor` and token variables, so they re-colour with the theme and dark mode instead of being baked-in PNGs.
8. **Keep one source of truth.** If both `DESIGN.md` and `tokens.css` exist, generate one from the other, or they will drift.

**Sources:** Google Labs DESIGN.md spec (April 2026, via [Better Stack](https://betterstack.com/community/guides/ai/design-md-ai/) and [Emelia](https://emelia.io/hub/design-md-ai-agents-standard)); Material Design 3 token docs; Radix Colors docs; Nathan Curtis's articles on design-token naming.
