# EES — Plataforma de Calificación COMPIN

Frontend web para que el equipo calificador (ECED) revise los casos de discapacidad que
pre-procesa el bot `compin-calificacion-motor`, ajuste la propuesta y la deje lista para
cargar en CeroFilas.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · TypeScript strict |
| UI | React 19 + Tailwind CSS 4, sin librería de componentes |
| Auth | JWT (`jose`, HS256) en cookie `httpOnly` — nunca `localStorage`. Cookie `compin_token`, 8 h |
| Datos | PostgreSQL en Supabase, acceso directo con `pg` (`src/lib/db.ts`) — Next.js hace de BFF |
| Documentos | Google Drive read-only (`googleapis`) para leer los `analysis.json` de los casos |
| Deploy | Vercel |

No hay API separada: cada route handler de `src/app/api/*` valida el JWT + rol y corre SQL
directo contra Supabase.

## Estructura

```
EES---VERCEL/
├── README.md              ← este archivo
└── frontend/
    ├── src/app/           páginas (App Router) + rutas API
    │   ├── page.tsx           login
    │   ├── admin/             dashboard, casos, no-aptos, CRUD calificadores
    │   ├── calificador/       "mis casos" + detalle + histórico
    │   └── api/               auth, casos, usuarios, métricas
    ├── src/components/    UI (FichaEditable, ResolucionCalificador, ObservacionesAnalisis, …)
    ├── src/lib/           db, jwt, auth, casos-mapper, google-drive, métricas
    ├── src/data/          tipos (analisis, casos, usuarios) + catálogos de resolución
    ├── scripts/           carga de casos e introspección (Node, contra Supabase)
    └── BD/bd -- EES SUPABASE-VERCEL/
        ├── schema.sql · seed.sql   despliegue de la base
        └── README.md               doc de la BD
```

## Correr local

```bash
cd frontend
npm install
cp .env.example .env.local   # completar JWT_SECRET y DATABASE_URL
npm run dev                  # http://localhost:3000
```

`service-account.json` (credencial de Drive, gitignored) va en `frontend/`.

## Roles y flujo

- **CALIFICADOR** — ve solo sus casos asignados (nunca `NO_APTO`). Revisa la ficha, ratifica o
  modifica la propuesta, o la declara no evaluable; luego copia el texto a CeroFilas.
- **ADMIN** — ve todo, métricas de productividad y carga, y administra calificadores
  (crear / editar / activar-desactivar — nunca borrar).

La decisión del calificador se guarda en `calificaciones_finales`; el `analysis.json` original
nunca se toca (así se puede medir después qué corrigió el humano).

## Base de datos

Ver [`frontend/BD/bd -- EES SUPABASE-VERCEL/README.md`](frontend/BD/bd%20--%20EES%20SUPABASE-VERCEL/README.md).
Despliegue: `psql "$DATABASE_URL" -f schema.sql` y luego `-f seed.sql`.

## Contexto de arquitectura

- [`frontend/ARQUITECTURA-FRONTEND.md`](frontend/ARQUITECTURA-FRONTEND.md) — mapa de pantallas,
  matriz de permisos y forma del JSON que devuelve cada ruta.
- [`frontend/API.md`](frontend/API.md) — todas las rutas `/api/*`: a dónde apuntan, qué tablas
  tocan y su lógica.
