# CLAUDE.md — Motor de Calificación COMPIN (MVP)

Este archivo se carga automáticamente cada vez que se abre Claude Code en esta carpeta o en cualquier subcarpeta. **Léelo completo antes de tocar código** — evita que se te pida el mismo contexto dos veces y evita romper decisiones ya tomadas.

## Qué es este proyecto, en una frase

Plataforma que reemplaza un sistema legado 100% en Google Sheets/Apps Script ("ATM / Salud 360") para calificar trámites de discapacidad de COMPIN. Un bot (repo separado: `compin-calificacion-motor`) descarga documentos, los sube a Drive, los analiza con IA (Claude) y genera una propuesta en Word. Este MVP es la plataforma web nueva: dos roles (ADMIN, CALIFICADOR), cada uno con su propia interfaz, con una base de datos Postgres real reemplazando el Sheet.

## Estructura de esta carpeta

```
MVP/
├── CLAUDE.md                  ← este archivo
├── bd/                        ← modelo de datos (PostgreSQL, ya corriendo en Supabase)
│   ├── BASE DE DATOS.md       ← notas originales, ideas sueltas (no editar, es historial)
│   ├── BD.md                  ← modelo relacional formal, autoridad de las tablas/columnas
│   ├── schema.dbml            ← diagrama para dbdiagram.io — Revisión 6, con visto bueno
│   │                             de Cristóbal (arquitecto)
│   ├── schema.sql             ← DDL real (enums, tablas, índices, triggers) — YA CORRIDO
│   ├── seed.sql                ← datos semilla obligatorios (roles, estados) — YA CORRIDO
│   └── CONEXION.md             ← credenciales/host de la base ya levantada en Supabase,
│                                  para que el backend/bot se conecte
├── api/                       ← backend (vacío todavía — territorio del compañero de backend)
└── frontend/                  ← Next.js 16, ya andando
    ├── CLAUDE.md              ← contexto propio del frontend (Next.js, App Router)
    ├── ARQUITECTURA-FRONTEND.md ← interfaces, seguridad JWT, matriz de permisos,
    │                              y la tabla clave: qué archivo consume qué endpoint futuro
    └── src/...
```

## Estado actual (quién hizo qué falta)

| Parte | Estado | Dónde está el detalle |
|---|---|---|
| Frontend (Next.js, mockup con datos en memoria) | ✅ funcional — login, 2 roles, CRUD calificadores, flujo completo de calificación | `frontend/ARQUITECTURA-FRONTEND.md` |
| Seguridad (JWT + cookie httpOnly + middleware por rol) | ✅ implementado y probado en el frontend | `frontend/ARQUITECTURA-FRONTEND.md`, sección 3 |
| Modelo de base de datos | ✅ **cerrado y aprobado por Cristóbal** — `bd/BD.md` y `bd/schema.dbml` están sincronizados (Revisión 6) | `bd/BD.md`, `bd/schema.dbml` |
| Base de datos real | ✅ **levantada en Supabase y provisionada** — `schema.sql` + `seed.sql` ya corridos, tablas y datos semilla en producción de prueba | `bd/CONEXION.md` |
| Backend / API real | ⬜ no empezado | carpeta `api/`, vacía — Cristóbal la conecta con los datos de `bd/CONEXION.md` |

## Stack tecnológico

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript estricto, React 19, Tailwind CSS 4.
- **Auth**: JWT (`jose`, HS256) en cookie `httpOnly` — nunca `localStorage`. Middleware de Next.js filtra por rol antes de renderizar cualquier ruta.
- **Base de datos**: PostgreSQL, hospedado en **Supabase** (ver `bd/CONEXION.md` para la connection string). Sin ORM definido todavía del lado del backend — el DDL vive en SQL puro (`bd/schema.sql`), no depende de Prisma para existir.
- **Backend**: por definir — hoy no hay nada en `api/`. El frontend ya está armado esperando endpoints REST (ver la tabla "archivo → endpoint" en `frontend/ARQUITECTURA-FRONTEND.md`, sección 5).
- **IA**: Claude, vía el repo separado `compin-calificacion-motor` (bot que genera la propuesta/Word — ese repo no vive dentro de este MVP).

## Los documentos que importan, y en qué orden leerlos

1. **`frontend/ARQUITECTURA-FRONTEND.md`** — qué interfaces existen, cómo funciona la seguridad, y sobre todo la **tabla de la sección 5**: cada archivo del frontend que hoy usa datos mock, junto al endpoint exacto (método + rol permitido) que se supone que lo va a reemplazar. Es el documento que conecta frontend ↔ backend.
2. **`bd/BD.md`** — el modelo relacional completo: las tablas, sus columnas, las reglas de negocio que la BD debe poder expresar. Nota clave: **un mismo caso puede tener 3 porcentajes IVADEC distintos** (el del documento IVADEC físico, el que propone la IA, y el que decide el calificador humano) — nunca se pisan entre sí. Ver sección 1 de ese archivo.
3. **`bd/schema.dbml`** — versión visual del punto anterior para dbdiagram.io, Revisión 6, aprobada.
4. **`bd/CONEXION.md`** — cómo conectarse a la base ya levantada (host, connection string, qué scripts ya se corrieron). Léelo antes de tocar el backend/bot.

## Reglas de negocio que no son negociables (ya decididas, no las reabras sin preguntar)

- Un calificador **nunca se elimina** de la base de datos — solo se activa/desactiva. No debe existir ningún `DELETE` sobre usuarios.
- Un caso `NO_APTO` **nunca** lo ve el rol CALIFICADOR — ni en el frontend ni en ningún endpoint. Es exclusivo de ADMIN, con un mensaje de la IA + links de evidencia de qué archivo falló.
- El % que propone la IA (documento IVADEC o propuesta Word) es **inmutable** una vez generado. Lo único editable por un humano es el % final del calificador.
- Cada endpoint de la API real **debe volver a validar el JWT y el rol en el servidor** — el frontend ya filtra por UI, pero eso no reemplaza la validación server-side (un calificador no debe poder pegarle a un endpoint de admin ni con curl/Postman).

## Cómo trabajar acá con IA (para el compañero de backend, y para cualquier sesión nueva de Claude)

- Antes de crear un endpoint, revisa la tabla de la sección 5 de `frontend/ARQUITECTURA-FRONTEND.md` — probablemente ya está especificado ahí qué forma de JSON espera el frontend y quién puede llamarlo.
- Antes de tocar una tabla o columna, revisa `bd/BD.md` primero (es la fuente formal) y después `bd/schema.dbml` (para ver si alguien ya lo estaba explorando ahí, sobre todo si el encabezado dice que hay algo "sin decidir" en esa zona).
- Estos tres documentos son **vivos**: si cambias algo en uno, actualiza los otros dos en la misma sesión de trabajo para que no se desincronicen otra vez (ya pasó una vez con el schema del dbml).
- No renombres/borres código del frontend en `frontend/src/data/*.ts` (los mocks) sin revisar primero qué páginas los consumen — están mapeados 1:1 en la tabla de `ARQUITECTURA-FRONTEND.md`.
