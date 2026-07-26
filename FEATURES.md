# Features — Time Capsules

Features priorizadas para implementar, ordenadas por criticidad.

---

## P0 — Imprescindible

### 1. Resume Position (Marca de Tiempo)

Permitir al usuario guardar en qué minuto/segundo quedó de un episodio o película.

**Data:** Nueva colección Firestore `resume_positions` con campos `user_id`, `content_id`, `content_type` ('episode'|'movie'), `show_id`, `position_seconds`, `updated_at`.

**Nuevas funciones en `showService.ts`:**
- `getResumePositions(uid, showId) → Map<contentId, seconds>`
- `setResumePosition(uid, contentId, showId, contentType, seconds | null)` (upsert, null = delete)

**UI ShowDetail.tsx:**
- Cada fila de episodio: botón ⏱ al lado del watch toggle. Muestra "MM:SS" o "H:MM:SS". Click → input inline. Enter/blur → guarda.
- Películas: mismo botón en header junto a "MARK AS WATCHED".
- Input parsea "90" → 90s, "1:30" → 90s, "1:30:00" → 5400s.
- Estilo: botón `border-2 border-border px-1.5 py-1 text-[10px] font-bold`, input `w-16 border-2 text-xs font-bold px-1`.

**i18n:** `showDetail.resumePosition`, `showDetail.setPosition`, `showDetail.noPosition`.

---

### 2. E2E Test Suite con Playwright

Suite de tests automatizados para verificar paths críticos antes de deploy.

**Setup:**
- `npm i -D @playwright/test && npx playwright install chromium`
- `playwright.config.ts` con proyectos `chromium-desktop` y `chromium-mobile`, webServer, auth-setup.
- `e2e/auth.setup.ts`: guest login → guarda storage state en `e2e/.auth/user.json`.
- Scripts en package.json: `test:e2e`, `test:e2e:ui`, `test:e2e:debug`.

**Tests:**
| Archivo | Qué prueba |
|---|---|
| `e2e/navigation.spec.ts` | Dashboard carga, navegación entre tabs |
| `e2e/movie-detail.spec.ts` | Click tarjeta → /show/:id, backdrop, título, NO poster, MARK AS WATCHED, stream selector. Desktop + mobile |
| `e2e/tv-show-detail.spec.ts` | Click tarjeta → /show/:id, episodios renderizados, toggle watched, catch-up modal. Desktop + mobile |
| `e2e/mobile-layout.spec.ts` | Bottom nav 5 items, header con logo+theme+settings, InstallBanner oculto inicialmente |

**Helpers:** `e2e/helpers.ts` con `waitForLoadComplete()` y `getShowCards()`.

---

## P1 — Alta prioridad

### 3. Rediseño de Navbar Tabs

Alinearlos al estilo brutalist de la app.

**Mobile (bottom nav):**
- De `border-2 rounded-full` a `border-4 border-border` con bordes rectos
- Activo: `bg-text text-bg border-text`
- Inactivo: `bg-surface text-text border-border hover:bg-accent`
- Iconos más grandes (`w-5 h-5`), texto `text-[10px]` uppercase

**Desktop (header nav):**
- Agregar iconos junto al label
- Active state: `bg-text text-bg border-4`
- Separador `border-l-4 border-border` entre nav links y theme/settings

### 4. Feedback Visual al Marcar Episodios

Animación brutalist cuando se marca/desmarca un episodio.

**CSS en `index.css`:**
```css
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-60px) scale(1.3); }
}
.animate-float-up { animation: float-up 0.8s ease-out forwards; }
```

**ShowDetail.tsx:**
- Estado `feedbackEp: { id: number, watched: boolean } | null`
- En `handleToggle` exitoso: setFeedbackEp → timeout 800ms → null
- Renderizar div fixed con "✓" (text-accent text-3xl) o "✕" (text-highlight) que sube flotando
- Posicionado sobre el episodio toggleado

---

## P2 — Prioridad media

### 5. OfflineBanner + useOnlineStatus

Indicar al usuario cuando no hay conexión.

**`src/hooks/useOnlineStatus.ts`:**
- Escucha `online`, `offline`, `focus`, `visibilitychange`
- Retorna `navigator.onLine`

**`src/components/OfflineBanner.tsx`:**
- Banner fijo arriba: `fixed top-0 z-50 bg-highlight text-text border-b-4 border-border px-4 py-2`
- Texto: "SIN CONEXIÓN — Los datos pueden no sincronizarse"
- Solo visible si `!isOnline`
- Agregar en Layout.tsx dentro del root div

**i18n:** `offline.title`, `offline.desc`.

### 6. ScrollToTop

Botón flotante para volver arriba en páginas largas.

**`src/components/ScrollToTop.tsx`:**
- Escucha scroll, visible si > 300px
- `fixed bottom-20 right-4 z-40`, `border-4 border-border`, `bg-surface hover:bg-accent`
- w-10 h-10, icono "↑"
- smooth scroll al top
- Agregar en Layout.tsx

---

## P3 — Baja prioridad / Nice to have

### 7. ReloadButton + SW Update

Notificar al usuario cuando hay una nueva versión de la app.

**`src/main.tsx`:**
- Registrar SW + escuchar `updatefound`
- Disparar evento custom `sw-update-available`
- Escuchar `controllerchange` + `window.__swPendingReload`

**`src/components/ReloadButton.tsx`:**
- Escucha `sw-update-available`
- Botón fixed bottom-4 right-4 z-40 con border-4 border-accent
- Animación pulse-green (box-shadow)
- Click: postMessage SKIP_WAITING → reload

### 8. Confetti para Badges

Animación al entrar a Stats si hay badges.

**`src/lib/confetti.ts`:**
- Canvas fixed, 110 partículas, gravedad, fade-out
- Colores: #ccff00, #ff2d78, #ffd700, #fff
- Respeta prefers-reduced-motion

**StatsPage.tsx:**
- Importar `triggerConfetti()`
- `useEffect` al montar si `badges.length > 0`, delay 500ms
