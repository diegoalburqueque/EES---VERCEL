# CLAUDE.md — Motor de Calificación COMPIN (EES-Vercel)

Este archivo se carga automáticamente cada vez que se abre Claude Code en esta carpeta o en cualquier subcarpeta. **Léelo completo antes de tocar código** — evita que se te pida el mismo contexto dos veces y evita romper decisiones ya tomadas.

## Qué es este proyecto, en una frase

Plataforma que reemplaza un sistema legado 100% en Google Sheets/Apps Script ("ATM / Salud 360") para calificar trámites de discapacidad de COMPIN. Un bot (repo separado: `compin-calificacion-motor`) descarga documentos, los sube a Drive, los analiza con IA (Claude) y genera una propuesta en Word/JSON. Este repo es la plataforma web: dos roles (ADMIN, CALIFICADOR), cada uno con su propia interfaz, con una base de datos Postgres real (Supabase) reemplazando el Sheet.

## Estructura de esta carpeta

```
EES---VERCEL/
├── TAREA_FRONTEND_RESOLUCION_CALIFICADOR_ATM.md  ← tarea puntual en curso (ver más abajo)
└── frontend/                       ← Next.js 16, ya andando, conectado a Supabase
    ├── prompt.md                   ← este archivo (contexto del proyecto)
    ├── ARQUITECTURA-FRONTEND.md    ← interfaces, seguridad JWT, matriz de permisos,
    │                                  rutas API reales y contrato de datos — LEER ANTES
    │                                  de tocar `src/app/api/*`
    ├── BD/bd -- EES SUPABASE-VERCEL/
    │   ├── BD.md                   ← modelo relacional formal, autoridad de las tablas/columnas
    │   ├── schema.dbml             ← diagrama para dbdiagram.io
    │   ├── schema.sql              ← DDL real (enums, tablas, índices, triggers) — YA CORRIDO
    │   ├── seed.sql                ← datos semilla (roles, estados) — YA CORRIDO
    │   ├── CONEXION.md             ← credenciales/host de Supabase
    │   └── VECTORIZACION.md
    ├── rules/manuales/             ← manuales normativos de COMPIN (checklist admisibilidad,
    │                                  formato de propuesta, guía clínica, nomenclatura de
    │                                  diagnósticos, movilidad reducida, glosas) — PDFs originales
    │                                  + versiones .md resumidas (M1-M6). Es la fuente de verdad
    │                                  de las reglas de negocio clínicas, no del código.
    └── src/...
```

**Nota:** no existe una carpeta `api/` separada para un backend dedicado — hoy el propio Next.js hace de BFF y pega directo a Postgres/Supabase vía `pg` (ver `ARQUITECTURA-FRONTEND.md`, sección 1.1, "PALANTIR"). Si en algún momento aparece un backend real en otro repo, este archivo y `ARQUITECTURA-FRONTEND.md` hay que actualizarlos juntos.

## Estado actual

| Parte | Estado | Dónde está el detalle |
|---|---|---|
| Frontend (Next.js) | ✅ funcional y **conectado a datos reales** — login, 2 roles, CRUD calificadores, flujo completo de calificación, todo contra Supabase | `ARQUITECTURA-FRONTEND.md` |
| Seguridad (JWT + cookie httpOnly + middleware por rol + revalidación server-side en cada endpoint) | ✅ implementado y probado | `ARQUITECTURA-FRONTEND.md`, sección 3 |
| Modelo de base de datos | ✅ cerrado — `BD/bd -- EES SUPABASE-VERCEL/BD.md` y `schema.dbml` | carpeta `BD/` |
| Base de datos real | ✅ levantada en Supabase, `schema.sql` + `seed.sql` corridos | `BD/bd -- EES SUPABASE-VERCEL/CONEXION.md` |
| Backend/API dedicado, separado del frontend | ⬜ no existe — el frontend asume ese rol directamente contra Postgres | `ARQUITECTURA-FRONTEND.md`, sección 1.1 |
| Tarea activa: vista de resolución del calificador al nivel del ATM de referencia | 🔧 en curso | `../TAREA_FRONTEND_RESOLUCION_CALIFICADOR_ATM.md` |

## Stack tecnológico

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript estricto, React 19, Tailwind CSS 4.
- **Auth**: JWT (`jose`, HS256) en cookie `httpOnly` — nunca `localStorage`. Middleware de Next.js filtra por rol antes de renderizar cualquier ruta, y cada route handler de `/api/*` vuelve a validar sesión y rol server-side.
- **Base de datos**: PostgreSQL en **Supabase**, conexión directa desde `src/lib/db.ts` (`pg.Pool`, env var `DATABASE_URL`). Sin ORM — SQL puro en cada route handler.
- **Documentos**: Google Drive, leído read-only (`googleapis`) desde `src/lib/google-drive.ts`, con credencial de service account (`GOOGLE_SERVICE_ACCOUNT_JSON` en prod, `service-account.json` en local).
- **IA**: Claude, vía el repo separado `compin-calificacion-motor` (bot que genera `analysis.json`/Word — ese repo no vive dentro de este).

## Los documentos que importan, y en qué orden leerlos

1. **`ARQUITECTURA-FRONTEND.md`** — qué interfaces existen, cómo funciona la seguridad, y sobre todo las secciones 4-6: matriz de permisos ya implementada, tabla de rutas API reales (qué tabla toca cada una) y el contrato de datos que hoy efectivamente devuelve la API. Es el documento que conecta frontend ↔ base de datos.
2. **`BD/bd -- EES SUPABASE-VERCEL/BD.md`** — el modelo relacional completo: las tablas, sus columnas, las reglas de negocio que la BD debe poder expresar. Nota clave: **un mismo caso puede tener varios porcentajes IVADEC distintos** (el del documento IVADEC físico, el que propone la IA, y el que decide el calificador humano) — nunca se pisan entre sí.
3. **`BD/bd -- EES SUPABASE-VERCEL/schema.dbml`** — versión visual del punto anterior.
4. **`BD/bd -- EES SUPABASE-VERCEL/CONEXION.md`** — cómo conectarse a la base ya levantada (host, connection string).
5. **`rules/manuales/`** — antes de tocar cualquier lógica de checklist de admisibilidad, formato de propuesta, diagnósticos o movilidad reducida, revisar el manual `M*` correspondiente: son la fuente normativa, no el código.

## Reglas de negocio que no son negociables (ya decididas, no las reabras sin preguntar)

- Un usuario (ADMIN o CALIFICADOR) **nunca se elimina** de la base de datos — solo se activa/desactiva. No debe existir ningún `DELETE` sobre `usuarios`. (Confirmado: no existe ese endpoint hoy.)
- Un caso `NO_APTO` **nunca** lo ve el rol CALIFICADOR — ni en el frontend ni en ningún endpoint. Es exclusivo de ADMIN, con `casos.no_apto_mensaje` + links de evidencia de qué archivo falló.
- El % que propone la IA (`porcentaje_propuesto_ia`) es **inmutable** una vez generado. Lo único editable por un humano es `calificaciones_finales.porcentaje_final`.
- Cada endpoint real ya valida el JWT y el rol en el servidor (no es un pendiente, ya está hecho) — pero al agregar un endpoint nuevo, seguir el mismo patrón: nunca confiar en que "si llegó hasta acá es porque el frontend ya filtró".

## Cómo trabajar acá con IA

- Antes de crear o modificar un endpoint, revisa `ARQUITECTURA-FRONTEND.md` sección 5 — probablemente ya está documentado ahí qué SQL/tablas toca y quién puede llamarlo.
- Antes de tocar una tabla o columna, revisa `BD/bd -- EES SUPABASE-VERCEL/BD.md` primero (es la fuente formal) y después `schema.dbml`.
- Estos documentos son **vivos**: si cambias algo en el código de `src/app/api/*` o `src/lib/casos-mapper.ts`, actualiza `ARQUITECTURA-FRONTEND.md` en la misma sesión de trabajo para que no se desincronice otra vez (ya pasó antes: este archivo y `ARQUITECTURA-FRONTEND.md` describían todavía datos mock cuando el código ya pegaba a Supabase).
- `src/data/casos.ts` y `src/data/usuarios.ts` hoy solo exportan **tipos** (`Caso`, `Usuario`, etc.), no datos — `usuarios.ts` ya lo dice en su propio comentario. `casos.ts` todavía arrastra un array `export const casos` de ejemplo que nadie importa (código muerto, no fuente de datos). No lo confundas con datos reales ni lo reactives sin revisar antes.
