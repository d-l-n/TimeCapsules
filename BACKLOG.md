# Backlog — Time Capsules

## 🔴 Pendientes (abiertas) — ordenadas por criticidad

### Alta — Bugs que rompen flujo / dejan estado inconsistente
- [x] **`GroupsPage.tsx` — error TS de build** — `t.nav.groups` ya existe en `en.ts`/`es.ts` y `tsc -b` pasa limpio. Item obsoleto/ya resuelto.
- [x] **Quitar/des-guardar serie o película** — Flujo verificado: Dashboard (`removeFromWatchlist` + refresh de todos los hooks), Discover (`toggleWatchedEpisode(...,false)` + `moviePrompt`), GroupDetail (`removeShowFromGroup` + `refreshShows`). Cada handler borra el doc correcto y refresca la UI sin estado inconsistente.
- [x] **`PositionEditor` se cierra al seleccionar opción/atajo** — Causa raíz: el `<input>` `onBlur` disparaba `handleResumeSave` → cerraba el editor al hacer click en un preset mientras el input tenía valor. Fix: `onMouseDown={e => e.preventDefault()}` en botones de preset y clear para evitar el blur; el guardado real ocurre en `onPreset`/`onClear`.

### Media — UX / consistencia visual
- [x] **Discover: alinear botones de acción** — Unificado el contenedor de acciones en un solo `<div className="relative">` con el botón de marca y el `moviePrompt` como hijo; eliminado el `space-y-1.5` que desalineaba "VISTA" vs "GUARDAR".
- [x] **Iconografía de estados de visionado** — Añadidos `WatchedIcon` (✓), `RewatchIcon` (↻), `TimerIcon` (⏱) en `Icons.tsx` (SVG consistentes, `stroke` brutalista). Usados en `EpisodeRow` (badge W→ícono, rewatch, resume timer) y `GroupDetail` (✓ miembros).

### Alta — Bugs que rompen flujo / dejan estado inconsistente
- [x] **Dark theme no funciona** — Añadidos `[data-theme="dark"]` overrides para `--color-*` en `index.css`. Toggle en sidebar/profile ya cambia colores bg/surface/text/border. 
- [x] **useNotifications.ts:19 FirebaseError: Missing or insufficient permissions** — Causa real: índices compuestos faltantes para `notifications` (user_id+created_at DESC, user_id+read, user_id+type). Las Firestore Rules ya existían correctas. Añadidos 3 índices en `firestore.indexes.json`.
- [x] **ProfilePage.tsx:73 FirebaseError: Missing or insufficient permissions** — Eliminada integración Trakt entera (`trakt_credentials`, imports, state, handlers, componente `TraktSection`). Ya no hay lectura/escritura a colección sin regla.

### Media — UX / consistencia visual
- [x] **Desktop sidebar: hover sobre item activo lo vuelve ilegible** — Añadido `.sidebar-link--active:hover` en `index.css` para mantener bg accent + texto oscuro al hoverear item activo.
- [x] **Notification popup hereda color blanco del sidebar** — `Layout.tsx:101-102` el `<span>` del título carece de `text-text`, hereda `color: #FFFFFF` del sidebar → texto "Notificaciones (0)" invisible sobre `bg-surface-light` (#ECEAE4).
- [x] **Sidebar nav: Stats y Account se marcan ambos como activos** — `Layout.tsx:147-149` la detección `pathname.startsWith('/profile')` es true para `/profile?section=stats` Y `/profile`. Ambos items del sidebar reciben `sidebar-link--active`.
- [x] **Dashboard "Finalizados": primera card desproporcionada** — `smallSpans(i)` asigna `2x1` a `i % 5 === 0`, pero `as '1x1'` descarta el span. Se necesita rediseño: últ. finalizado como tile 2x, resto 1x, ordenado por fecha desc.
- [x] **EmotionPicker: botón Remove pasa string vacío en vez de null** — `EmotionPicker.tsx:48` `handlePick('')` → `setEmotion(uid, id, '')` en vez de `setEmotion(uid, id, null)`. Backend no interpreta `''` como remove.
- [x] **Dashboard: smallSpans cast '1x1' descarta variante '2x1'** — `Dashboard.tsx:261,296` casteo `as '1x1'` en cards con `smallSpans()` que retorna `'2x1'` en `i % 5 === 0`.
- [x] **ShowDetail: collapsePref no es reactivo** — `ShowDetail.tsx:408` lee `localStorage.getItem('collapsePreference')` sincrónicamente en render, no estado. Cambios desde ProfilePage no se reflejan hasta re-render.
- [x] **ShowDetail: handleResumeKeyDown causa re-render en cadena** — `ShowDetail.tsx:690` depende de `handleResumeSave` que depende de `editValue`. Cada keystroke recrea la callback → `SeasonSection` re-renderiza todo.
- [x] **integration.test.ts: errores TS en mocks de Firestore** — `src/services/integration.test.ts:17,18,28,83` tipos incorrectos en `collection()`, `where()`, `mockClear()`.

### Baja — Mejoras UX solicitadas (Julio 2026)
- [x] **# — ¿Qué significa filtro "COLEC" en Cuenta>Listas?** — Renombrado a `COLECCIONES` en español (`ListsPage.tsx:20`). Filtro correcto, solo confusión de label — resuelto.
- [ ] **Mock Firestore en e2e** — Reemplazar Firebase real por mock en Playwright para evitar dependencia de cuota, latencia y necesidad de cuenta/sembrado. Discutir beneficios vs costo de implementación.

- [x] **GroupDetail: cards idénticas a Dashboard** — Reemplazado el wrapper propio por `ShowCard` (neon hover `card-neon-*-hover` + `card-brutal`); acciones (marca/progress/X) ahora en slot `actions` con `opacity-0 group-hover:opacity-100`.
- [x] **Mobile UX/UI Redesign (Brutalist + Metro, mobile-first)** — `timecapsule-mobile-redesign-prompt.md`. Hecho: bottom nav fija negra + bloque amarillo activo con 5 ítems (Home·Library·Search·Stats·Profile) en `index.css` (`.nav-pill`) y `Layout.tsx`; nueva `LibraryPage.tsx` (`/library`) con grid 2-col + sticky filter chips (All/Watching/Completed/Planned/Favorites) reusando `ShowCard` + `useFollowedShows`/`useWatchlist`/`getUserWatchedShowIds`; `ShowDetail` botones full-width en móvil + episodios watched en verde (`EpisodeRow.tsx`); `DiscoverPage` búsqueda instantánea debounced (400ms). Base desktop previa (tokens, tiles Metro, StatsPage KPI) ya existía. Touch targets ≥44px globales. Skipped: heatmap en Stats (barras bastan), Home header avatar+saludo específico (DashboardHero ya tiene stats 2-col).
- [x] **Instalar spec-kit (TimeCapsules)** — [github/spec-kit](https://github.com/github/spec-kit) v0.13.0 instalado vía `uv tool install specify-cli` + `specify init . --integration opencode --here --force`. Scaffold en `.specify/` (templates, scripts, workflows, memory/constitution.md) y 10 slash-commands en `.opencode/commands/` (`/speckit.constitution|specify|clarify|plan|checklist|tasks|analyze|implement|converge|taskstoissues`). Flujo SDD listo: constitution → specify → plan → tasks → implement → converge. `.specify/memory/constitution.md` y `data/` añadidos a `.gitignore`.
- [ ] **Aplicar spec-kit a otros proyectos del workspace** — Repetir init en los demás proyectos (mismo patrón opencode). Pendiente evaluar.
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
- Migrado login a email real (`PLAYWRIGHT_USER`/`PLAYWRIGHT_PASSWORD`); specs nuevos (`auth`, `dashboard-flow`, `discover`, `groups`, `library-profile`) corren contra Firebase. Bloqueado por cuota Firestore del proyecto (`RESOURCE_EXHAUSTED`). Pendiente mock Firestore para CI.
