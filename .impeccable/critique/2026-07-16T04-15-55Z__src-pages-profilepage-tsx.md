---
target: src/pages/ProfilePage.tsx
total_score: 26
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-07-16T04-15-55Z
slug: src-pages-profilepage-tsx
---
# Impeccable Critique: Profile Page

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Trakt import progress is opaque — only "Importing..." then a count, no per-item feedback |
| 2 | Match System / Real World | 3 | Labels clear; "Spoiler-free mode" needs explanation (desc text provides it) |
| 3 | User Control and Freedom | 4 | All destructive actions guarded by confirmation modals with cancel |
| 4 | Consistency and Standards | 3 | Trakt section breaks typography scale with 8px/9px fonts vs 12px elsewhere |
| 5 | Error Prevention | 3 | Confirm modals on destruction; re-auth catch for email change |
| 6 | Recognition Rather Than Recall | 3 | Tab state URL-driven; but Trakt fields require user to remember credentials |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts; 3 separate import clicks; mobile needs 2 taps for settings |
| 8 | Aesthetic and Minimalist Design | 3 | Brutalist aesthetic consistent; left column is 7 dense sections competing equally |
| 9 | Error Recovery | 2 | alert() for delete failure; Trakt errors show color only, no recovery path |
| 10 | Help and Documentation | 1 | No help link, FAQ, or contextual tooltips anywhere |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Not AI-generated.** Confident brutalist vocabulary (thick borders, shadow-brutal, #ccff00 accent, uppercase labels) reads as authored opinions, not model average. No absolute-ban violations (no gradient text, glassmorphism, side-stripe borders, eyebrow kickers, sketchy SVGs).

**Detector scan:** Clean — 1 finding (false positive on nav separator in Layout.tsx). No actionable hits.

**AI slop risk areas:** Trakt section density and 8px/9px font sizes look like feature accretion rather than composition.

## Overall Impression

A page with strong DNA hamstrung by feature creep. The brutalist skeleton is working — thick borders, confident accent, URL-driven state. But 7 sections in the left column plus 3 tabs with sub-tabs on the right create a cognitive warzone. Every section shouts equally loud, so nothing guides the eye. The Trakt import in particular is an emotional sink: dense fields, illegible 8px type, 3 separate import buttons where 1 "Import All" would do.

Biggest opportunity: cut the left column in half (content-wise) and bring the font scale back to readable.

## What's Working

1. **URL-driven tab state.** Tab and view params survive refresh, back/forward. Solid engineering that directly benefits UX.
2. **Confirmation modals with clear affordances.** Three modals, distinct visual treatment (highlight for danger, accent for action), cancel on every one.
3. **Distinct visual identity.** The #ccff00 accent on thick black borders with #f5f0eb bg is memorable and confident. Feels like a real product, not a template.

## Priority Issues

### P1: Left-column information overload
**What**: 7 sections stacked (Profile form, Appearance with 5 controls, Trakt with 6+ inputs, Cache, Sign Out, Delete). All visible simultaneously.  
**Why**: 20+ interactive elements competing for attention. User must scan past everything to reach bottom actions.  
**Fix**: Collapse sections. Move Trakt to dedicated page or slide-out. Compact appearance toggles into 1-2 lines.  
**Suggested command**: $impeccable distill

### P1: Trakt import UX — dense, illegible, 3 clicks where 1 works
**What**: Two text inputs + 2 buttons + instructions link + 3 separate import buttons. Uses 	ext-[8px] and 	ext-[9px].  
**Why**: 8px and 9px text violates WCAG SC 1.4.4. Splitting import into 3 buttons forces redundant work. Instructions hidden behind toggle, not guided.  
**Fix**: Add "Import All" button. Use page-standard 	ext-xs/	ext-sm. Add step-by-step guidance. Move to /import route.  
**Suggested command**: $impeccable clarify

### P1: No keyboard navigation
**What**: Zero keyboard shortcuts. No Escape handler on modals (despite ole="dialog").  
**Why**: Power users and accessibility-dependent users cannot navigate efficiently. Modals trap keyboard users.  
**Fix**: Esc dismiss on all modals. Keyboard shortcuts for save (Ctrl+Enter), tab switching (1/2/3).  
**Suggested command**: $impeccable audit

### P2: lert() for delete failure
**What**: Line 175 uses lert(errMsg) — blocks browser, unstyled, screen-reader hostile.  
**Why**: Amateurish error handling. No recovery path offered.  
**Fix**: Inline error in confirmation modal with retry button.  
**Suggested command**: $impeccable harden

### P2: Inconsistent font sizes
**What**: Trakt section uses 	ext-[8px], 	ext-[9px], 	ext-[10px] — non-standard values, break from 	ext-xs (12px) used elsewhere.  
**Why**: WCAG 1.4.4 fails at 8px. Visual inconsistency makes Trakt look like a different product.  
**Fix**: Replace with 	ext-xs and 	ext-sm tokens.  
**Suggested command**: $impeccable typeset

## Persona Red Flags

### Alex (Power User)
- Zero keyboard shortcuts. Every action requires a click.
- Trakt import requires 3 clicks for history/ratings/watchlist. No "Import All" bulk action.
- Tab switching drops Calendar view state — resets to Timeline on return.
- No Esc key on confirmation modals.

### Jordan (First-Timer)
- Empty tabs (History, Stats, Lists) show no empty-state guidance on first visit.
- Trakt "Client ID" / "Access Token" fields have no explanation of where to get these.
- "Spoiler-free mode" and "Collapse preference" are self-explanatory only after reading 9px description text.
- No onboarding, tooltips, or help link anywhere.

### Sam (Accessibility)
- lert() for delete failure is screen-reader hostile.
- 	ext-[8px] and 	ext-[9px] fail WCAG minimum text size.
- Focus indicator relies on ocus:bg-accent/10 — background color change alone fails WCAG 2.4.7 (not a 3:1 contrast change).
- Tab order may not match visual order in 2-column grid.

### Casey (Mobile User)
- Settings collapsed behind "SET" button — label is ambiguous.
- Once open, 7-section settings block is a tall scroll on mobile.
- No sticky save button for profile form.

## Minor Observations
- **"SET" button label** (line 338): {settingsOpen ? 'X' : 'SET'} — "X" for close is fine, "SET" as open trigger is confusing. Hamburger icon or "Settings" would be clearer.
- **No profile photo preview**: User enters a photoURL but never sees the result before saving.
- **Tab state loss**: Switching from Calendar view to Stats and back loses Calendar view (defaults to Timeline).
- **Inline font-family repeated 3x**: style={{ fontFamily: 'Arial Black, Impact, sans-serif' }} should be a utility class.
- **Duplicate localStorage loops** (lines 89-101): Code debt — two identical or loops in cache clear.

## Questions to Consider

1. Does Trakt import belong on the profile page at all? It's the densest section on a preferences page. A dedicated /import route would simplify both surfaces.
2. Could appearance settings be 1 compact row instead of 5 full-width sections? The spoiler-free and collapse-pref toggles each take 10+ lines for a binary choice.
3. Should tab state persist uniformly? Losing Calendar view when switching to Stats is a trust-breaker — user thinks their selection was lost.
