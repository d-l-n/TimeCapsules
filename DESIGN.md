---
name: Time Capsules
description: Personal TV show & movie tracking dashboard
colors:
  primary: "#FFD400"
  highlight: "#FF5CA8"
  neutral-bg: "#F6F6F3"
  neutral-surface: "#FFFFFF"
  neutral-surface-light: "#ECEAE4"
  neutral-border: "#111111"
  neutral-text: "#111111"
  neutral-text-secondary: "#555555"
  dark-bg: "#0f0f0f"
  dark-surface: "#1c1c1c"
  dark-surface-light: "#282828"
  dark-border: "#f0f0f0"
  dark-text: "#f0f0f0"
  dark-text-secondary: "#999999"
  accent-blue: "#4D7CFE"
  accent-green: "#76E56F"
  accent-orange: "#FF8A00"
  accent-purple: "#A855F7"
  accent-red: "#FF4A4A"
typography:
  display:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "0.02em"
  mono:
    fontFamily: "IBM Plex Mono, Courier New, Courier, monospace"
rounded:
  sm: "0px"
  md: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#111111"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    border: "3px solid {colors.neutral-border}"
    boxShadow: "4px 4px 0 {colors.neutral-border}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    border: "3px solid {colors.neutral-border}"
    boxShadow: "4px 4px 0 {colors.neutral-border}"
  card-default:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    border: "3px solid {colors.neutral-border}"
    boxShadow: "8px 8px 0 {colors.neutral-border}"
  input-text:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    border: "3px solid {colors.neutral-border}"
    padding: "8px 12px"
---

# Design System: Time Capsules

## 1. Overview

Time Capsules is a monochrome brutalist dashboard for personal TV show and
movie tracking. Raw, bold, unapologetic — the interface earns its roughness
with thick borders, hard offset shadows, zero rounded corners on structural
elements, and maximally dense information display.

The system rejects everything polished: glassmorphism, neumorphism, soft
shadows, gradient text, rounded cards, and "AI-made" visual tells like cream
off-white backgrounds or decorative grid patterns. Every pixel carries
information or interactivity — nothing is ornamental.

Dark mode is a first-class citizen: same contrast, same personality, same
information density. Both themes share identical shadow vocabulary and border
grammar, just inverted.

**Key Characteristics:**
- 3px hard borders as default, 4px on emphasis
- Solid offset shadows only (zero blur, zero spread)
- 4px corner radius on interactive elements only
- Uppercase labels, heavy (800/900) weight everywhere
- Maximum 200ms transitions on interaction feedback only
- No page-load animations, no orchestrated entrances

## 2. Colors

A restrained monochrome palette with a single accent color that the user can
swap (default yellow #FFD400). The accent is reserved for active states,
primary actions, and selection indicators only — never decoration.

### Primary
- **Signal (accent)** (#FFD400 / oklch(0.87 0.17 97)): Active nav items,
  primary buttons, focused/selected states. Always paired with black text
  (#111111) for maximum contrast.

### Neutral (light)
- **Paper (bg)** (#F6F6F3): Page background.
- **Canvas (surface)** (#FFFFFF): Card, input, and panel backgrounds.
- **Primer (surface-light)** (#ECEAE4): Secondary surface — subtle
  containers, section headers.
- **Type (text)** (#111111): Body text, headings, icons.
- **Ash (text-secondary)** (#555555): Secondary/muted text, metadata, labels.
- **Border** (#111111): All borders and dividers.

### Neutral (dark)
- **Paper** (#0f0f0f): Page background.
- **Canvas** (#1c1c1c): Surface background.
- **Primer** (#282828): Elevated surfaces, section headers.
- **Type** (#f0f0f0): Body text.
- **Ash** (#999999): Muted text.
- **Border** (#f0f0f0): Borders.

### Semantic accents
- **Blue** (#4D7CFE): Focus-visible outlines only.
- **Green** (#76E56F): Completed/comfirmation states.
- **Pink** (#FF5CA8): Destructive actions, alerts, unread badges.
- **Orange** (#FF8A00): Planned/pending states.
- **Red** (#FF4A4A): Error states.
- **Purple** (#A855F7): Misc accent (group features).
- **Highlight** (#FF5CA8): Secondary accent — unread indicators, alarm states.

### Named Rules
**The Accent Rarity Rule.** The primary accent (#FFD400) appears on ≤15% of
any screen. Its rarity is what gives it meaning. Never use accent as a
background tint, decorative stripe, or hover glow.

**The Flat-By-Default Rule.** Surfaces are flat. Depth is communicated
exclusively through solid offset shadows (see Elevation), never through
gradients, blurs, or multiple stacked backgrounds.

## 3. Typography

**Display Font:** Inter (900 weight, -0.02em tracking, uppercase)
**Body Font:** Inter (400 weight, 1.5 line-height)
**Mono Font:** IBM Plex Mono (metadata, counts, ratings)

Single-family system. Inter carries everything from display headings to body
text to button labels. No serif pairing — the weight contrast (400 body vs
900 heading) provides hierarchy without a second family.

### Hierarchy
- **Display (h1)** (900, `clamp(1.5rem, 4vw, 2.5rem)`, 1.1): Page titles.
  Always uppercase.
- **Headline (h2)** (900, `clamp(1.125rem, 3vw, 1.5rem)`, 1.2): Section
  titles. Always uppercase.
- **Title (h3)** (900, `clamp(0.875rem, 2vw, 1.125rem)`, 1.2): Card titles,
  panel headers. Usually uppercase.
- **Body** (400, `0.875rem`, 1.5): Main reading text. Max line length 75ch.
- **Label** (800, `0.6875rem`, 1.2, `0.02em` tracking): Buttons, badges, nav
  items. Always uppercase.
- **Metadata** (400, `0.625rem`, 1.2): Episode counts, dates, secondary stats.
  Mono family.

### Named Rules
**The Only-Weight Rule.** Hierarchy comes from weight (400 vs 800 vs 900),
not from font size. A 900-weight label at 11px carries more visual weight
than a 400-weight heading at 20px. Trust the weight scale.

## 4. Elevation

Flat surfaces with solid offset shadows. Zero blur, zero spread — the shadow
is a hard geometric translation of the element's border. This is true to the
brutalist ethos: the shadow is not an atmospheric effect, it's a mechanical
offset.

Depth is tiered by shadow distance, not by blur radius. A card at rest sits
at 8px offset; a hovered card lifts to 10px offset; a modal sits at 12px.

### Shadow Vocabulary
- **Rest (shadow-brutal-sm)** (`box-shadow: 4px 4px 0 #111111`): Default
  interactive element (button) at rest.
- **Rest (shadow-brutal)** (`box-shadow: 8px 8px 0 #111111`): Default card at
  rest.
- **Hover (shadow-brutal-lg)** (`box-shadow: 10px 10px 0 #111111`): Card on
  hover, large buttons on hover.
- **Modal (shadow-brutal-xl)** (`box-shadow: 12px 12px 0 #111111`): Drawers,
  modals, dropdown panels.

All shadows invert border-color in dark mode (border is #f0f0f0, shadows use
same rule).

### Named Rules
**The No-Blur Rule.** Shadows never use blur or spread values. A shadow is a
solid block of the border color offset from the element. Blur would introduce
atmosphere; this system has none.

## 5. Components

Tactile and forceful. Every interactive component has a clear rest/hover/active
trifecta: rest sits with a small offset shadow, hover lifts (-2px, -2px
translate with larger shadow), active presses down (2px, 2px translate with
no shadow). All transitions are 120ms ease — instant enough to feel
mechanical.

### Buttons
- **Shape:** Flat corners (4px radius). 3px hard border.
- **Primary (.btn-accent):** Yellow (#FFD400) background, black text, black
  border, 4px shadow. Hover: lifts 2px up-left, shadow grows to 6px.
  Active: presses flat, no shadow.
- **Secondary (.btn-brutal default):** White surface, black text, black
  border, 4px shadow. Same hover/active behavior as primary.
- **Highlight (.btn-highlight):** Pink (#FF5CA8) background. Same behavior.
  Used for destructive or urgent actions.
- **Giant (.btn-xl):** 16px font, 6px shadow at rest, 8px on hover. Used for
  primary CTAs on detail pages.
- **Disabled:** 45% opacity, no hover/active transformations.

### Cards
- **Corner Style:** 4px radius (images inside cards have 0px).
- **Background:** Surface (white / dark gray).
- **Shadow Strategy:** 8px offset shadow at rest (shadow-brutal).
- **Border:** 3px hard border.
- **Internal Padding:** 12px (varies per card type).
- **Hover (.card-lift):** Lifts 2px up-left with larger shadow (10px).
  Active presses flat. Only on clickable cards.
- **Condition badges:** 2px border, 9px uppercase font, positioned absolute
  on corners of card image area.

### Inputs / Fields
- **Style:** 3px hard border, surface background, flat corners (4px radius
  invisible — border and bg are the same shape).
- **Focus:** Blue (#4D7CFE) outline via `:focus-visible`, 3px width, 2px
  offset.
- **Focus alternative:** Yellow tinted background (`bg-yellow/30`) used on
  some inline editable fields.
- **Placeholder:** Secondary text color (Ash).
- **Disabled:** 45% opacity.

### Navigation
- **Desktop sidebar:** Fixed left, 224px wide. Background = text color
  (inverted: black on light, white on dark). White text, 3px right border.
  Active nav link = yellow background, black text.
- **Mobile bottom nav:** Fixed bottom, full width. Same inverted background
  scheme. 5 equal flex items, each 56px tall. Active tab = yellow background
  with black icon/text.
- **Tablet hamburger:** Drawer slides from left (224px) with 280ms
  cubic-bezier ease-out. Staggered link entrance (40ms increments). Overlay
  backdrop at 50-70% opacity.

### Chips / Badges
- **Style:** 2px hard border, 9-10px uppercase font, 800 weight, 6px
  horizontal padding.
- **Media type badges:** Yellow background, top-left of card image.
- **Status badges:** Color-coded (blue=watching, green=completed,
  orange=planned, red=dropped), bottom-left of card image.
- **IMDb rating badge:** Surface background, top-right of card image.

### Notification badge
- **Shape:** Square with 2px hard border, pink background, black text,
  9px bold.
- **Position:** Absolute, offset top-right of bell icon.

### The "X" close button
- **Shape:** 24x24px square, 2px border, pink background, black "✕".
- **Hover:** Turns yellow on hover.

## 6. Do's and Don'ts

### Do:
- **Do** use 3px borders as the default thickness for containers and
  interactive elements. 2px for secondary elements (badges, close buttons).
  4px for emphasis.
- **Do** use solid offset shadows (zero blur) for all depth communication.
- **Do** use uppercase + 800/900 weight for labels, buttons, and navigation.
- **Do** reserve accent yellow for active/selected/primary-action states only.
- **Do** keep all transitions under 200ms — interaction feedback should feel
  mechanical, not choreographed.
- **Do** respect `prefers-reduced-motion`: animations become instant,
  confetti cancels.
- **Do** invert the full palette for dark mode — same contrast, same
  personality.

### Don't:
- **Don't** use glassmorphism, neumorphism, soft shadows, blurred backdrops,
  or gradient text.
- **Don't** use rounded corners >4px on any structural element. Full pill
  shapes are prohibited (except where dictated by the browser, e.g. scrollbar
  thumbs).
- **Don't** use `border-left` or `border-right` as a colored accent stripe on
  cards or list items.
- **Don't** use cream/warm off-white backgrounds (#f5f0eb is the deliberate
  pale paper tone, not a "warmth" default).
- **Don't** use decorative grid backgrounds, hand-drawn SVG illustrations,
  repeating-linear-gradient stripes, or numbered section markers.
- **Don't** animate on page load — no orchestrated entrance sequences, no
  staggered section reveals.
- **Don't** use the accent color as a background tint, hover glow, or
  decorative element.
- **Don't** use bounce/spring easings for transitions — use ease or ease-out
  only.
