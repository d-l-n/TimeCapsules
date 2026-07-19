# Mobile UX/UI Redesign Prompt — Brutalist + Metro System

## Role

You are a **Senior Mobile UX/UI Designer** and **Senior Frontend Engineer**.

## Scope

You are **NOT** creating a new application. You are redesigning the **current mobile experience** of an existing movie/TV tracking application (React + Vite + Tailwind CSS stack).

### Preserve (do not touch)
- Existing functionality
- Business logic
- Routes
- Data models
- Authentication
- State management
- API / database integration (Firebase or Supabase)

### Redesign only
- Layout
- Component structure (only when strictly necessary)
- Visual system
- Interaction patterns
- Mobile usability

---

## 1. Project Goal

Transform the current mobile UI into a **BRUTALIST + METRO + MOBILE-FIRST** movie/TV tracking experience.

**Inspiration:**
- Windows Phone Metro tiles
- Neo-brutalism
- Editorial magazine layouts
- Physical interface panels (printed paper blocks)
- Modern productivity apps

**Explicitly avoid:**
- ❌ Netflix clone
- ❌ IMDb clone
- ❌ Letterboxd clone
- ❌ Material Mobile UI
- ❌ iOS-style cards
- ❌ Glassmorphism
- ❌ Soft rounded interfaces

The end result must be visually unique and immediately recognizable as *not* another streaming platform clone.

---

## 2. Mobile Design Principles

Optimize for:
- One-hand usage
- Thumb reachability
- Fast interactions
- Clear visual hierarchy
- Large touch targets
- High information density without clutter

**Minimum touch target:** 44×44px. Every interactive element must look and feel tappable.

**Prefer:** large blocks, large typography, large buttons, large posters.
**Avoid:** tiny controls, dense menus, hidden/gesture-only actions.

---

## 3. Visual System

### Neo-Brutalist rules
| Property | Value |
|---|---|
| Background | `#F6F6F3` |
| Text | `#111111` |
| Borders | `3px solid #111111` |
| Shadows | `6px 6px 0px #111111` |
| Border radius | `4px` max |

**Forbidden effects:** gradients, blur, transparency, glass effects, soft/diffuse shadows.

Everything should read as **printed paper blocks** stacked on the screen.

### Color system (flat accent blocks only)
| Color | Hex | Meaning |
|---|---|---|
| Yellow | `#FFD400` | Attention / primary actions |
| Blue | `#4D7CFE` | Active / in-progress |
| Green | `#76E56F` | Completed |
| Pink | `#FF5CA8` | Favorites |
| Orange | `#FF8A00` | Achievements |
| Purple | `#A855F7` | (available for secondary accents — define usage) |

Colors must carry consistent semantic meaning across every screen — never used decoratively.

---

## 4. Mobile Navigation

Replace the desktop sidebar entirely with a **bottom navigation bar**.

- **Max 5 items:** Home · Library · Search · Stats · Profile
- Background: black
- Icons: white, Fluent System Icons
- Active item: **yellow block** highlight

---

## 5. Screen Specifications

### 5.1 Home Screen — Vertical Metro Dashboard

**Header**
- Avatar
- Greeting
- Search button
- Notifications

**Main tile — Continue Watching**
- Full-width card
- Example content: title, episode, % complete (e.g. *"THE LAST OF US — Episode 4 — 56% complete"*)

**Statistics row**
- Two-column brutalist tiles (e.g. Movies: 324 / Series: 128)

**Recent Activity**
- Horizontal scrolling poster strip

**Editorial blocks** (magazine-style sections)
- "Your longest streak"
- "Movie of the week"
- "Recommended tonight"

### 5.2 Library Screen

- 2-column grid, large posters
- Each card: poster, title, status badge, rating
- Card style: black border + hard shadow
- **Sticky filter bar** with horizontal-scrolling chips: All / Watching / Completed / Planned / Favorites

### 5.3 Search Screen

- Dedicated screen, large search input, instant results
- Each result: poster, title, year, type, status button
- Filters: Movies / Series / Genres / Platforms

### 5.4 Detail Screen

**Structure (top to bottom):**
1. Poster
2. Large title
3. Rating
4. Metadata
5. Actions — **full-width buttons**: Continue Watching / Add to List / Rate

**Episodes (vertical list)**
- Each row: number, title, duration, status
- Current episode: blue background
- Completed episode: green checkmark

### 5.5 Statistics Screen

**Top: large KPI cards**
- Hours watched (e.g. 621)
- Titles (e.g. 324)
- Average rating (e.g. 8.6)
- Day streak (e.g. 18)

**Charts**
- Stacked vertical sections (no tiny graphs)
- Use large bars, simple charts, heatmap blocks

---

## 6. Interactions & Micro-animations

- Animation duration: **100–150ms**, fast and snappy
- Button pressed state: `translate(3px, 3px)` (shifts into its own shadow)
- Button default state: `translate(0, 0)`
- Hover is not required (mobile-first); **touch feedback is required** on every tappable element
- Cards: subtle movement/scale on tap

---

## 7. Poster System

- Posters are the primary visual element: large thumbnails, high contrast
- Vary tile sizes for rhythm (Metro-style), including:
  - 2×1 cards
  - Featured posters
  - Full-width featured items

---

## 8. Responsive Rules

- **Mobile minimum width:** 320px
- Must support small phones, large phones, and foldables
- **Tablet:** adapt the layout intentionally — do not simply stretch the mobile layout

---

## 9. Accessibility

- Maintain WCAG AA contrast ratios
- Readable typography at all sizes
- Large, unambiguous controls
- Proper screen reader labels on all interactive elements

---

## 10. Implementation Rules

- Do not introduce unnecessary libraries — reuse the existing React/Vite/Tailwind stack
- Reuse existing components wherever possible; refactor only when structurally required
- Maintain clean architecture
- Prefer CSS variables / design tokens for the color and spacing system defined above

**Create these reusable components:**
- `BrutalistCard`
- `MetroTile`
- `PosterCard`
- `StatBlock`
- `FilterChip`
- `BottomNavigation`

---

## 11. Final Result — Definition of Done

The final mobile application should feel like:

> "A futuristic personal movie archive built with brutalist Metro principles."

It must be instantly recognizable and **must not resemble any existing streaming platform**.
