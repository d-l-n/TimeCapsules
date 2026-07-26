# PROMPT MAESTRO — Proyecto "Time Capsules" (app tracking)

Este documento integra las 9 fases (0-8) del proyecto en un único prompt.
Pensado para pegar completo en Claude Code u otra herramienta agéntica, o
para dividir en sub-prompts por fase si preferís ejecución incremental.

---

## CONTEXTO GENERAL DEL PROYECTO

Sos parte de un equipo de agentes de IA especializados construyendo
"Time Capsules": una webapp personal que reconstruye el historial de
tracking de series/películas de un usuario, construido desde un historial de visualizaci'on importado
desde un archivo CSV de historial, enriquecido con TMDB e IMDb datasets.

**Stack objetivo:** React 18 + Vite + Tailwind + Supabase (Postgres) + PWA
**Deploy objetivo:** Cloudflare Pages
**Auth:** single-user al inicio (no multi-tenant todavía)
**Diseño visual:** opcional reusar sistema "Liquid Glass" (glassmorphism) de
proyectos previos del usuario, para consistencia entre apps.

Los CSVs fuente relevantes y sus columnas confirmadas:

- `user_tv_show_data.csv`: user_id, tv_show_id, is_followed, is_favorited, nb_episodes_seen, tv_show_name
- `followed_tv_show.csv`: user_id, created_at, updated_at, notification_type, tv_show_id, active, diffusion, folder_id, archived, notification_offset, tv_show_name
- `watched_on_episode.csv`: episode_number, user_id, episode_id, watched_on_source_id, created_at, updated_at, tv_show_name, episode_season_number
- `show_addiction_score.csv`: user_id, tv_show_id, last_action_timestamp, daily_score, weekly_score, monthly_score, tv_show_name
- `user_badge.csv`: created_at, updated_at, user_id, badge_id
- `user_statistics.csv`: id, time_spent, nb_episodes_watched, nb_friends, nb_comments, nb_likes, user_id, updated_at, nb_memes, nb_shows_followed, score, created_at, nb_reviews
- `tv_show_rate.csv`: tv_show_id, rating, created_at, updated_at, tv_show_name, user_id
- `episode_emotion.csv`: created_at, updated_at, tv_show_name, episode_season_number, episode_number, user_id, episode_id, emotion_id

**RESTRICCIÓN GLOBAL:** nunca migrar tokens de acceso, IPs, datos de
Facebook/Twitter, device tokens, ni ningún dato de `user.csv` fuera de
`id`/`created_at` para referencia interna. Son datos sensibles sin valor
para la app nueva.

---

## FASE 0-3 — AGENTE: `data-architect`

### Objetivo
Definir el schema, migrar los datos del export, y enriquecerlos con TMDB
e IMDb.

### Tareas

**0. Schema normalizado (Postgres/Supabase)**

Proponer y crear DDL para:
- `shows` (id, internal_id, tmdb_id nullable, imdb_id nullable, name, poster_url, backdrop_url, synopsis, imdb_rating, imdb_votes)
- `episodes` (id, show_id FK, episode_internal_id, season_number, episode_number, title nullable)
- `watched_episodes` (user_id, episode_id FK, watched_at)
- `followed_shows` (user_id, show_id FK, is_favorited, active, followed_at)
- `ratings` (user_id, show_id FK, rating, rated_at)
- `episode_emotions` (user_id, episode_id FK, emotion_id, created_at)
- `badges` (user_id, badge_id, earned_at)
- `show_addiction_scores` (user_id, show_id FK, daily_score, weekly_score, monthly_score, last_action_at)
- `user_stats` (user_id, time_spent, nb_episodes_watched, nb_shows_followed, score, updated_at)

Justificar cualquier cambio respecto a esta propuesta. Agregar índices
sobre FKs y sobre `tmdb_id`/`imdb_id` para lookups rápidos.

**1. Script de importación** (`02-import-csv.ts`, Node/TypeScript, `csv-parse` o `papaparse`)
- Lee cada CSV fuente listado arriba
- Mapea a las tablas normalizadas
- Deduplica por (user_id, tv_show_id) o (user_id, episode_id) según tabla
- Genera reporte de conteos: filas leídas vs insertadas vs descartadas, por archivo
- Idempotente: correrlo dos veces no duplica datos (usar upsert por clave natural)

**2. Enriquecimiento TMDB** (`03-enrich-tmdb.ts`)
- Para cada show único, buscar por nombre en `/search/tv` de TMDB
- Tomar mejor match (considerar año si está disponible en el nombre o metadata)
- Guardar `tmdb_id`, `poster_path`, `overview`, e `imdb_id` vía `/tv/{id}/external_ids`
- Rate limit conservador: cola con ~4 req/s
- Log de shows sin match automático para revisión manual posterior

**3. Merge con IMDb datasets** (`04-merge-imdb.ts`)
- Descargar `title.basics.tsv.gz` y `title.ratings.tsv.gz` de https://datasets.imdbws.com/
- Cruzar por `imdb_id` (columna `tconst`)
- Agregar `imdb_rating`, `imdb_votes` a `shows`

### Entregables
- `01-schema.sql`, `02-import-csv.ts`, `03-enrich-tmdb.ts`, `04-merge-imdb.ts`
- Variables de entorno para credenciales (`TMDB_API_KEY`, `DATABASE_URL`), nunca hardcodeadas
- `README.md` con orden de ejecución y explicación de cada paso

---

## FASE 4-6 — AGENTE: `dev-architect`

### Prerrequisito
El pipeline de datos de la fase anterior debe estar corriendo y haber
poblado la base de datos antes de empezar esta fase.

### Objetivo
Construir el frontend que consume la base de datos ya migrada y enriquecida.

### Tareas

**4. Scaffolding**
- Proyecto Vite + React 18 + TypeScript + Tailwind
- Cliente de Supabase configurado (`lib/supabase.ts`)
- Configuración PWA (manifest, service worker, ícono) desde el inicio
- Ruteo básico (React Router): `/dashboard`, `/history`, `/show/:id`, `/stats`
- Auth simple (Supabase Auth, single-user, email/password o magic link)

**5. Componentes core**
- `Dashboard`: shows en seguimiento activo, próximos episodios (si hay datos de diffusion), racha actual (de `show_addiction_scores`)
- `HistoryTimeline`: línea de tiempo de episodios vistos (de `watched_episodes`), agrupable por mes/año
- `ShowDetail`: póster, sinopsis, rating propio, rating IMDb, lista de episodios vistos de ese show
- Cliente de TMDB reutilizable para imágenes que no estén cacheadas localmente (`services/tmdb.ts`)

**6. Stats y badges**
- `StatsPage`: tiempo total visto, episodios totales, shows completados vs en progreso, distribución de ratings dados
- `BadgesGrid`: visualización de badges migrados desde `user_badge`, con fecha obtenida

### Entregables
- Repo funcional corriendo local (`npm run dev`)
- Componentes tipados, sin lógica de negocio embebida en JSX (separar en hooks/services)

---

## FASE 5 (paralelo) — AGENTE: `uxui`

### Objetivo
Diseño visual de Dashboard, timeline de historial y cards de shows.

### Tareas
- Definir paleta y tipografía (o adaptar "Liquid Glass" existente)
- Mockups/lineamientos de: Dashboard, ShowCard, HistoryTimeline, ShowDetail, StatsPage
- Estados vacíos (ej. "todavía no importaste tu historial") y estados de carga
- Responsive: mobile-first, ya que el uso real va a ser mayormente en celular

### Entregables
- Guía de estilos (colores, spacing, componentes base) documentada
- Feedback directo sobre los componentes que entregue `dev-architect`

---

## FASE 7 — AGENTE: `testing-analyst`

### Objetivo
Validar integridad de datos y QA de la app funcionando.

### Tareas
- Validar conteos: total de filas en CSVs originales vs total migrado a DB, por tabla
- Detectar duplicados o pérdidas de datos en la migración
- Listar shows sin match en TMDB (de los logs de fase 2) para revisión manual
- QA funcional end-to-end: login, carga de dashboard, navegación a detalle de show, visualización de stats
- Verificar comportamiento offline (PWA) y responsive en mobile

### Entregables
- Reporte de validación de datos (conteos esperados vs reales)
- Checklist de bugs encontrados con pasos de reproducción

---

## FASE 8 — AGENTE: `dev-architect`

### Objetivo
Deploy a producción.

### Tareas
- Build de producción (`npm run build`)
- Deploy a Cloudflare Pages
- Variables de entorno configuradas en el entorno de deploy (no en el repo)
- Verificar que el service worker y manifest PWA funcionen en producción (instalable)

---

## ORDEN DE EJECUCIÓN RECOMENDADO

1. `data-architect` — fases 0 a 3 (bloqueante, todo depende de esto)
2. `dev-architect` — fase 4 (scaffolding, puede arrancar en paralelo a fase 3 si el schema ya está definido)
3. `dev-architect` + `uxui` — fases 5 y 6 en paralelo
4. `testing-analyst` — fase 7
5. `dev-architect` — fase 8

## COBERTURA VERIFICADA
✅ Definición de schema y decisión de DB (Supabase)
✅ Importación completa de los 8 CSVs relevantes con exclusión explícita de datos sensibles
✅ Enriquecimiento TMDB (imágenes, sinopsis, imdb_id)
✅ Merge con IMDb datasets (ratings oficiales)
✅ Scaffolding del proyecto con PWA desde el inicio
✅ Componentes core: dashboard, historial, detalle de show
✅ Stats y badges migrados
✅ Diseño UX/UI dedicado
✅ QA de integridad de datos y funcional
✅ Deploy a producción

