# Backlog — Time Capsules

## 🔴 Pendientes (abiertas) — ordenadas por criticidad

### Alta — Bugs que rompen flujo / dejan estado inconsistente
- [x] **`GroupsPage.tsx` — error TS de build** — `t.nav.groups` ya existe en `en.ts`/`es.ts` y `tsc -b` pasa limpio. Item obsoleto/ya resuelto.
- [x] **Quitar/des-guardar serie o película** — Flujo verificado: Dashboard (`removeFromWatchlist` + refresh de todos los hooks), Discover (`toggleWatchedEpisode(...,false)` + `moviePrompt`), GroupDetail (`removeShowFromGroup` + `refreshShows`). Cada handler borra el doc correcto y refresca la UI sin estado inconsistente.
- [x] **`PositionEditor` se cierra al seleccionar opción/atajo** — Causa raíz: el `<input>` `onBlur` disparaba `handleResumeSave` → cerraba el editor al hacer click en un preset mientras el input tenía valor. Fix: `onMouseDown={e => e.preventDefault()}` en botones de preset y clear para evitar el blur; el guardado real ocurre en `onPreset`/`onClear`.

### Media — UX / consistencia visual
- [x] **Discover: alinear botones de acción** — Unificado el contenedor de acciones en un solo `<div className="relative">` con el botón de marca y el `moviePrompt` como hijo; eliminado el `space-y-1.5` que desalineaba "VISTA" vs "GUARDAR".
- [x] **Iconografía de estados de visionado** — Añadidos `WatchedIcon` (✓), `RewatchIcon` (↻), `TimerIcon` (⏱) en `Icons.tsx` (SVG consistentes, `stroke` brutalista). Usados en `EpisodeRow` (badge W→ícono, rewatch, resume timer) y `GroupDetail` (✓ miembros).

### Baja — Mejoras UX solicitadas (Julio 2026)
- [x] **GroupDetail: cards idénticas a Dashboard** — Reemplazado el wrapper propio por `ShowCard` (neon hover `card-neon-*-hover` + `card-brutal`); acciones (marca/progress/X) ahora en slot `actions` con `opacity-0 group-hover:opacity-100`.
- [x] **Marcar show como visto desde la card (Dashboard + Grupos)** — Añadido helper `cardActions` en `Dashboard.tsx` usando el slot `actions` de `ShowCard`: botón "MARK AS WATCHED" para todo media type (no solo movies) en watchlist, más "✕" remove en watchlist/upToDate/finished. Skipped: prompt rewatch/unwatch (Dashboard no tiene estado watched por card; requeriría query extra).
- [x] **GroupDetail: progreso de series inline** — El botón "PROGRESS" ahora expande `GroupProgressSection` inline debajo de la misma card (`col-span-full` cuando seleccionada), sin sacarlo del flujo.

---

## ✅ Completado (historial)

### Núcleo / Fundación
- Página de perfil (`/profile`, 3 tabs), mobile bottom pill/nav, ocultar header+navbar al scroll.
- i18n EN/ES, routing/estructura (`/settings`, `/discover`, `/calendar`), estilos Tailwind (dark mode, acento 5 colores).
- Filtrado por `user_id === auth.uid` en Dashboard/History/Stats. Migración de datos al usuario (`06-migrate-user.ts`, 1330 docs).
- Separar queries en servicios (`showService`, `historyService`, `statsService`), custom hooks refactor (`useFollowedShows`/`useHistory`/`useStats`), hooks barrel export.
- Firestore Rules, Firebase offline persistence, AGENTS.md + skills.
- Scripts/data pipeline (`03-enrich-tmdb`, `04-merge-imdb`, `05-qa-validate`, enrichment 425 shows), TMDB API key fix, Poster URL fix.
- PWA + Service Worker (Workbox, precache, runtime caching, manifest maskable).

### Discover / ShowDetail
- Discover: ADD→SAVE, persistir búsqueda, botón borrar, sugerencias trending, ADD button crea show si no existe.
- ShowDetail: marcar episodios (toggle/rewatch/✓×N), streaming providers, resume position (⏱ + parser), ratings CRUD, collapse temporadas vistas.
- Episodios faltantes TMDB (contador X/Y, episodios solo-TMDB marcables con ID sintético).
- Recomendaciones relacionadas (similar + recommended), películas → colección (detecta `tv_time_id < 0`), temporada 0 filtrada, providers redirigen a TMDB.
- Refactor ShowDetail en componentes (`StreamProviders`, `CollectionGrid`, `MediaGrid`, `CatchUpModal`, `ConfirmSeasonModal`, `SeasonSection`, `EpisodeRow`, `RatingPicker`, `PositionEditor`, `types.ts`); 1618→966 líneas.

### Dashboard / Stats / Groups
- Dashboard redesign (Watchlist + Upcoming integrados, stats bar, horizontal scrolls), "Viendo Ahora" posters.
- Auto-migración Pendientes → Viendo Ahora → Finalizados (`getBingingShows` reescrita con watchlist+watched+resume).
- Rewatch múltiple (`watchedCounts` Map), auto-recalcular stats en toggle, eliminado `updateAddictionScoreOnToggle` (dead code).
- Groups: `sortByProgress` limpia al cambiar grupo.
- Stats auto-recalc, badge confetti.

### Nav / Header (port de mpoints-tracker)
- `useNavVisibility` reescrito (scroll container detection, idle 300ms, breakpoints, reset ruta), nav pill flotante, `AppHeader` component, `NavContext`, `chrome--hidden` en section headers, nav overlay mobile, CSS nav pill, safe-area insets. Tests actualizados.

### PWA / Infra
- SW Update Button (3 estados, fallback 2s), OfflineBanner + `useOnlineStatus`, ScrollToTop, ReloadButton + SW update, confetti badges.

### Auditoría / Over-engineering
- Eliminado `papaparse`, `firebase-admin`→devDeps, campos muertos `UserStatsDoc` (`nb_shows_followed`/`score`), duplicación en `useStats`/`useFollowedShows`/`useGroups`, `SunIcon`/`MoonIcon` compartidos, hover dark-mode selectors faltantes.
- Navbar pill mobile reestilizada a brutalismo; overlay de pill eliminado (bloqueaba toques).

### Perfil UX — Rondas Impeccable
- R1 (seguridad): Trakt token `type=text`+ojo, Esc en modales, `alert()`→error inline.
- R2 (visual): unificar `text-[8/9/10px]`→`text-xs`, `font-heading` utility, botón SET→icono+Settings.
- R3 (UX): spoiler-free+collapse compactos, "Import All" Trakt, calendar view state, photoURL preview en vivo.
- R6: Profile photo update bug (`refreshUser()`), over-engineering audit.

### E2E
- Playwright suite (`navigation`, `movie-detail`, `tv-show-detail`, `mobile-layout`), helper `loginAsGuest()`, seed fix con TMDB IDs conocidos, 0 tests skipped.
