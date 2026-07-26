# Backlog — Time Capsules

## 🟢 Completado — Sesión Julio 2026

### Bugs cerrados
- [x] **#14 No se pueden añadir shows ni marcar como visto** — Firestore rules redeployadas con `create: if isAuth()` para `shows` y `episodes`. [Issue #14](https://github.com/d-l-n/TimeCapsules/issues/14)
- [x] **#12 Error al actualizar email en Perfil** — `updateEmail` → `verifyBeforeUpdateEmail`. Reauth ahora ejecuta `updateProfile` + `saveUserProfile` + `verifyBeforeUpdateEmail` completo. Mensaje de verificación enviado. [Issue #12](https://github.com/d-l-n/TimeCapsules/issues/12)
- [x] **#13 MoonIcon descentrado en Ajustes** — SVG envuelto en `<g transform="translate(3.5, 0)">` para centrar visualmente el cresciente lunar en el viewBox 24×24. [Issue #13](https://github.com/d-l-n/TimeCapsules/issues/13)
- [x] **#11 PWA: InstallBanner no aparece** — `manifest.json` + `sw.js` creados, link en `index.html`. [Issue #11](https://github.com/d-l-n/TimeCapsules/issues/11)
- [x] **#15 syncDefaultLists: campo `seeded` no permitido** — `seeded` añadido a `allowFields` en `custom_lists`. [Issue #15](https://github.com/d-l-n/TimeCapsules/issues/15)
- [x] **#16 `<re-icon>` sin registrar** — CDN reicon eliminado de `index.html`, reemplazado por `ArrowRightIcon` SVG propio en 3 componentes. [Issue #16](https://github.com/d-l-n/TimeCapsules/issues/16)
- [x] **#17 isAdmin() bloqueaba operaciones** — Script `scripts/set-admin-claim.ts` creado y ejecutado para 2 usuarios. Luego se reemplazaron todos los `delete: if isAdmin()` por `delete: if isAuth() && resource.data.user_id == request.auth.uid`, eliminando la necesidad de admin claims para operaciones de usuario. `isAdmin()` solo se mantiene para `badges` (logros del sistema). [Issue #17](https://github.com/d-l-n/TimeCapsules/issues/17)
- [x] **#18 user_stats / allowFields bloquea updateStatsOnToggle** — `allowFields` removido de `user_stats` en rules + script de limpieza ejecutado. [Issue #18](https://github.com/d-l-n/TimeCapsules/issues/18)
- [x] **#19 custom_lists update rule bloquea syncDefaultLists** — Check `request.resource.data.is_default != true` removido del update rule. [Issue #19](https://github.com/d-l-n/TimeCapsules/issues/19)

### DevTools — Rediseño completo
- [x] **Pop-up rediseñado** — Nuevo diseño brutalist con header de franjas diagonales, tabs con indicador deslizante amarillo, entradas escalonadas (`fadeSlideUp`)
- [x] **Tooltip en slider** — SliderControl muestra tooltip con valor exacto al hacer hover sobre el track
- [x] **Animación de entrada** — Panel se desliza desde esquina superior derecha (`animate-slide-in-corner` con cubic-bezier deceleration)
- [x] **Atajo Shift+D** para toggle, Escape para cerrar
- [x] **Persistencia en sessionStorage**
- [x] **Valores coloreados** por tipo (strings=verde, números=azul, booleans=naranja, null=gris)
- [x] **Scrollbar fina** custom (`scrollbar-thin`) para el panel
- [x] **Posicionado** `top-4 right-[15%]` (entre centro y esquina)

### UI/UX general
- [x] **Botón cerrar sesión** — Flechita `⤿` eliminada, rediseñado con estilo `bg-surface` + borde amarillo
- [x] **Botones diferenciados** — Sign-out usa estilo neutro (fondo superficie, hover amarillo), Delete usa `dangerBtn` (colores invertidos, aspecto destructivo)
- [x] **Scrollbars brutalist** — `::-webkit-scrollbar` con thumb amarillo + borde negro, sidebar con thumb semitransparente
- [x] **Dark mode: botones notif/tema** — `sidebar-pill--invert` corregido para hover/active en ambos temas
- [x] **Texto negro en botones de acento** — `.bg-accent`, `.bg-highlight`, `.btn-accent` siempre con `color: #111111`
- [x] **Tipar `t: any` en 9 componentes** — Reemplazado por `ReturnType<typeof useI18n>['t']`

### PWA / Infra
- [x] **manifest.json + sw.js** creados para instalabilidad
- [x] **Firestore rules** desplegadas con todos los fixes
- [x] **Script admin claim** — `scripts/set-admin-claim.ts`

---

## 🔴 Pendientes abiertos

### Media — UX / consistencia visual
- [ ] **Mock Firestore en e2e** — Reemplazar Firebase real por mock en Playwright para evitar dependencia de cuota, latencia y necesidad de cuenta/sembrado.

### Baja — Mejoras
- [ ] **Cache local (hook-cache.ts)** — Ya existe el archivo pero no se usa ampliamente en hooks
- [ ] **Actualizar tests de Layout** — 31 tests fallando por cambios recientes en la estructura del Layout

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
- Recomendaciones relacionadas (similar + recommended), películas → colección (detecta `showId < 0`), temporada 0 filtrada, providers redirigen a TMDB.
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

### DevTools
- Rediseño completo del popup: animaciones, tabs deslizantes, tooltips, entradas escalonadas, scrollbar fina
- Atajo Shift+D, Escape para cerrar, persistencia sessionStorage

### Auditoría / Over-engineering
- Eliminado `papaparse`, `firebase-admin`→devDeps, campos muertos `UserStatsDoc` (`nb_shows_followed`/`score`), duplicación en `useStats`/`useFollowedShows`/`useGroups`, `SunIcon`/`MoonIcon` compartidos, hover dark-mode selectors faltantes.
- Navbar pill mobile reestilizada a brutalismo; overlay de pill eliminado (bloqueaba toques).
- `t: any` tipado en 9 componentes show-detail
- Botón cerrar sesión rediseñado sin flechita, diferenciado de eliminar cuenta
