# Time Capsules

## Register

product

## Platform

web

## Users

Single user — the owner of the viewing history. They import their own CSV data
from Trakt / Letterboxd / manual logs and want a live dashboard that reflects
what they actually watched, not what an algorithm suggests.

## Product Purpose

Turn an imported viewing history into a living, browseable record of every TV
show and movie watched. No recommendations, no social feed, no gamification —
just a personal archive enriched with metadata (TMDB posters, IMDb ratings)
and tools to resume where you left off.

## Positioning

A brutalist dashboard that transforms imported viewing history into a living
record, without algorithms or recommendations.

## Brand Personality

Raw, bold, unapologetic. The interface earns its roughness — thick borders,
hard shadows, high contrast, no rounded corners, no gradients. It looks like
somebody built it for themselves and didn't sand off the edges.

## Anti-references

- Glassmorphism, neumorphism, soft shadows, blurred backdrops
- Overly polished SaaS dashboards (Linear, Notion, Stripe)
- Rounded everything, gradient text, side-stripe borders
- "AI-made" tells: cream/warm off-white backgrounds, decorative grid patterns,
  hand-drawn illustrations, numbered section markers

## Design Principles

1. **Honest materials.** CSS does what CSS does. No custom scrollbar themes, no
   reinventing native affordances. A button looks like a button.
2. **Function over decoration.** Every visual choice justifies itself by what it
   communicates — state, hierarchy, interactivity. If it doesn't carry
   information, remove it.
3. **Speed is a feature.** 120-200ms transitions on interaction feedback only.
   No page-load animation sequences. Users open the app to find a show, not to
   watch it animate in.
4. **Dark mode is not an afterthought.** Both themes are first-class — same
   information density, same contrast, same personality. Toggling is instant
   and never loses state.
5. **Go bold or go home.** When in doubt, double the border width, bump the
   contrast, or add another 2px of shadow. The mistake is being too subtle,
   not too loud.

## Accessibility & Inclusion

- WCAG AA contrast target (4.5:1 body text)
- `prefers-reduced-motion` respected: all animations opt out cleanly
- `data-reduce-effects` attribute for additional motion reduction
- Both themes maintain equal contrast ratios
