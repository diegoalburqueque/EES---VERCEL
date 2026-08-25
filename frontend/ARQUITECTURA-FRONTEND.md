# Arquitectura Frontend — Motor de Calificación COMPIN

Contexto vivo del frontend (Next.js) para coordinar con el backend. Se actualiza cada vez que se agrega una interfaz, se cambia un flujo de seguridad, o se decide un endpoint. No borrar historial — solo agregar/tachar.

Repo: `C:\Users\albur\Desktop\PROYECTOS\WORK\EES---VERCEL\frontend`

---

## 1. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `src/app/*` |
| Lenguaje | TypeScript | strict |
| UI | React 19 + Tailwind CSS 4 | sin librería de componentes, todo hecho a mano |
| Autenticación | JWT firmado con `jose` (HS256) | cookie `httpOnly`, no `localStorage` |
| Sesión en cookie | `compin_token`, expira 8h | ver sección Seguridad |
| Estado del lado cliente | React Context (`CasosProvider`, `SesionProvider`) + `fetch` a las rutas `src/app/api/*` | ya no hay datos mock en memoria — cada provider hace fetch real |
| Base de datos | PostgreSQL en **Supabase**, ya provisionada | conexión directa vía `pg` (ver sección 1.1) |
| Backend dedicado (`api/`, fuera de este repo) | ⬜ no existe todavía | el propio Next.js hace de BFF mientras tanto |
| Almacenamiento de documentos/JSON de análisis | Google Drive (leído read-only vía `googleapis`) | `src/lib/google-drive.ts` |

### 1.1 Cómo se conecta hoy a la base — "PALANTIR"

**Esto es el cambio más importante desde la versión anterior de este documento: el frontend ya NO usa datos mock, pega directo a Postgres.**

En vez de esperar a que exista un backend separado, las rutas de `src/app/api/*` (marcadas con el comentario `// PALANTIR vX.X.X` al inicio del archivo) usan `src/lib/db.ts` — un `Pool` de `pg` que se conecta directo a Supabase con `DATABASE_URL` (env var). Es decir: **Next.js es el BFF** — firma su propio JWT, valida sesión y rol en cada route handler, y corre SQL directo contra las tablas reales (`casos`, `usuarios`, `calificaciones_finales`, `estados_caso`, `historial_estados_caso`, `roles`, `estado_usuario`).

El propio `db.ts` documenta que esto es temporal: *"puente directo a Postgres (Supabase) mientras no existe la API real de Cristóbal. Cuando exista, este archivo se elimina y el frontend le pega a esa API en vez de a la base directamente."* — pero a la fecha de esta revisión, es la única forma en que el frontend obtiene datos reales.

Detalle no trivial: cuando un caso no tiene todavía el `analysis.json` real que genera el bot (`compin-calificacion-motor`), pero sí tiene el link de Drive (`json_resultado_url`), el frontend arma una **ficha sintética** al vuelo a partir de columnas planas de `casos` (ver `construirAnalisisSintetico` en `src/lib/casos-mapper.ts`) — esto cubre los ~500 casos poblados desde el CSV `MAESTRO_RM`, que no traen el detalle IBF/ISRA/IVADEC por documento. Al abrir el detalle de un caso (`GET /api/casos/[id]`), si existe `json_resultado_url` y el JSON real aún no está cacheado, el backend lo va a buscar a Drive una vez y lo guarda en `casos.analysis_json` (cache-on-read).

---

## 2. Interfaces (mapa de pantallas)

| Ruta | Rol | Qué muestra | Estado |
|---|---|---|---|
| `/` | Público | Login (correo + contraseña) | ✅ hecho, contra BD real |
| `/admin` (tab "Dashboard") | ADMIN | Métricas: totales, calificados/pendientes, IA vs. calificador, checklist por estado, ranking de calificadores por carga | ✅ hecho |
| `/admin` (tab "Todos los casos") | ADMIN | Tabla de casos con filtro por estado y paginación (20/50/todos) | ✅ hecho |
| `/admin` (tab "No aptos") | ADMIN | Solo casos `estadoChecklist = NO_APTO` | ✅ hecho |
| `/admin` (tab "Calificadores") | ADMIN | CRUD calificadores (crear/editar/desactivar/reactivar) contra `/api/usuarios` | ✅ hecho, contra BD real |
| `/admin` → "Ver caso" (modal) | ADMIN | Detalle del caso (ficha de solo lectura vía `FichaEditable`), incluye NO_APTO | ✅ hecho |
| `/calificador` | CALIFICADOR | Mis casos pendientes (APTO/REQUIERE_REVISION, sin calificar) | ✅ hecho |
| `/calificador/casos/[id]` | CALIFICADOR | Ficha de propuesta (tipo Word) + botones Confirmar/Modificar si está pendiente, solo lectura si ya se calificó | ✅ hecho |
| `/calificador/historico` | CALIFICADOR | Casos ya calificados por ese usuario | ✅ hecho |

---

## 3. Seguridad

- Login: `POST /api/auth/login` valida credenciales **contra la tabla `usuarios` real (bcrypt)**, rechaza si el usuario está `INACTIVO`, y firma un JWT con `{ sub, nombreCompleto, correo, rol }`. Se setea como cookie `compin_token` (`httpOnly`, `secure` en prod, `sameSite=lax`, 8h).
- **Nunca se guarda sesión en `localStorage`** — se probó explícitamente que un XSS o la consola del navegador no puede leer ni modificar la cookie.
- `src/middleware.ts` corre en el edge antes de renderizar cualquier ruta `/admin/*` o `/calificador/*`: verifica firma del JWT y que `rol` coincida con el prefijo de ruta. Si no, redirige.
- `src/lib/session-server.ts` (`exigirSesion` / `obtenerSesionServidor`) vuelve a validar server-side en los `layout.tsx` de cada sección y en cada route handler de `/api/*` — defensa en profundidad si el middleware quedara mal configurado.
- Logout: `POST /api/auth/logout` borra la cookie.
- **Cada endpoint de `/api/*` vuelve a validar el JWT y el rol en el servidor** (ya implementado, no es solo un plan): un token de CALIFICADOR nunca puede leer/escribir endpoints de ADMIN, y un CALIFICADOR nunca puede pedir un caso que no sea suyo o que sea NO_APTO — filtrado en el SQL, no solo en la UI.

---

## 4. Matriz de permisos por rol (implementada, no solo diseñada)

| Endpoint real | ADMIN | CALIFICADOR |
|---|---|---|
| `POST /api/auth/login` | ✅ | ✅ |
| `POST /api/auth/logout` | ✅ | ✅ |
| `GET /api/casos` (todos) | ✅ | ❌ (recibe solo los suyos, filtrado en SQL) |
| `GET /api/casos` (propios, sin NO_APTO) | — | ✅ |
| `GET /api/casos/:id` | ✅ (cualquiera, incl. NO_APTO) | ✅ (solo si `calificador_asignado_id = sesion.id` y no NO_APTO; 403 si no) |
| `POST /api/casos/:id/confirmar` | ❌ | ✅ (solo si es su caso asignado y no NO_APTO; 404 si no) |
| `POST /api/casos/:id/modificar` | ❌ | ✅ (idem) |
| `POST /api/casos/:id/ficha` | ❌ | ✅ (idem — guarda snapshot de la ficha editada) |
| `GET /api/usuarios` | ✅ | ❌ (403) |
| `POST /api/usuarios` (crear) | ✅ | ❌ (403) |
| `PATCH /api/usuarios/:id` (editar nombre/correo, o `activo: boolean`) | ✅ | ❌ (403) |
| `DELETE /api/usuarios/:id` | 🚫 **no existe este endpoint** — un usuario nunca se borra de la base de datos | 🚫 |

---

## 5. Rutas API reales (ya no es una tabla de "mock → futuro endpoint", esto ya corre)

| Ruta | Método | Qué hace | Tabla(s) que toca |
|---|---|---|---|
| `src/app/api/auth/login/route.ts` | POST | Valida contra `usuarios` (bcrypt), firma JWT, setea cookie | `usuarios`, `roles`, `estado_usuario` |
| `src/app/api/auth/logout/route.ts` | POST | Borra la cookie de sesión | — |
| `src/app/api/casos/route.ts` | GET | Lista de casos: ADMIN ve todo, CALIFICADOR solo lo suyo y nunca NO_APTO (filtro en el `WHERE`) | `casos`, `calificaciones_finales`, `usuarios`, `estados_caso` |
| `src/app/api/casos/[id]/route.ts` | GET | Detalle de un caso; resuelve `analysis_json` desde Drive on-demand (cache-on-read) si falta | `casos` (+ Drive) |
| `src/app/api/casos/[id]/confirmar/route.ts` | POST | **Ratificar propuesta.** Body opcional `{ mr?, reev? }`. Escribe `calificaciones_finales` con `decision='ACEPTA'`, `idis_final`/`grado_final` = los del motor, `direccion` calculada vs. IVADEC original; mueve `estado_caso` a `FINALIZADO`, deja historial | `calificaciones_finales`, `casos`, `historial_estados_caso`, `estados_caso` |
| `src/app/api/casos/[id]/modificar/route.ts` | POST | **Modificar propuesta.** Body `{ porcentajeFinal, motivoCodigo, fundamento (≥20 chars), mr?, reev? }`. `porcentajeFinal` se revalida server-side contra `TABLA_IDIS` (41 valores oficiales); `direccion` compara contra `porcentaje_ivadec_documento`, nunca contra la propuesta del motor | idem anterior |
| `src/app/api/casos/[id]/no-evaluable/route.ts` (nuevo) | POST | **El caso no se puede evaluar.** Body `{ causaCodigo, detalle (≥20 chars) }`. `decision='NO_EVALUABLE'`, `porcentaje_final=NULL`; no es un rechazo clínico — no mueve a `FINALIZADO`, mueve a `EN_REVISION` (revisión administrativa) | idem anterior |
| `src/app/api/casos/[id]/marcar-subido-cerofilas/route.ts` (nuevo) | POST | Botón **"Ya lo subí"** — independiente de la resolución, se puede marcar en cualquier momento. Sin body | `casos` (`subido_cerofilas`, `subido_cerofilas_en`) |
| `src/app/api/casos/[id]/ficha/route.ts` | POST | Guarda snapshot de la ficha editada en `casos.ficha_editada` (nunca toca `analysis_json`, que sigue siendo la propuesta original de la IA) | `casos` |
| `src/app/api/usuarios/route.ts` | GET / POST | Lista usuarios (solo ADMIN) / crea calificador o admin (bcrypt hash) | `usuarios`, `roles`, `estado_usuario` |
| `src/app/api/usuarios/[id]/route.ts` | PATCH | Edita nombre/apellido/correo y/o activa-desactiva (nunca DELETE) | `usuarios`, `estado_usuario` |

### Archivos de datos que quedaron solo como tipos (ya no son mock)
- `src/data/usuarios.ts` — **ya no exporta datos**, el comentario del propio archivo dice que el dataset mock con contraseñas en texto plano se eliminó porque quedó desincronizado con la base; hoy solo exporta los tipos `Usuario` y `Rol`.
- `src/data/casos.ts` — exporta los tipos (`Caso`, `PropuestaCalificacion`, etc.) **pero todavía tiene un array `export const casos: Caso[] = [...]` con datos de ejemplo que nadie importa** (verificado por grep: ningún archivo hace `import { casos } from "@/data/casos"`). Es código muerto pendiente de limpieza, no una fuente de datos activa.
- `src/components/CasosProvider.tsx` — ya no es un store en memoria: hace `fetch("/api/casos")` en el `useEffect` inicial y expone `confirmarPropuesta`, `modificarYCalificar`, `guardarFicha`, `cargarDetalleCaso`, todos pegándole a la API real.

---

## 6. Estructura de datos que devuelve la API (ya no es un "contrato esperado", es lo que hoy se serializa)

### Usuario / Calificador (`GET /api/usuarios`)
```ts
{
  id: string;
  nombreCompleto: string; // `${nombre} ${apellido}` armado en el mapeo
  correo: string;
  rol: "ADMIN" | "CALIFICADOR";
  activo: boolean; // nunca se borra, solo activo/inactivo
}
```

### Caso (`GET /api/casos`, `GET /api/casos/:id`)
Mapeado en `src/lib/casos-mapper.ts` (`mapearFila`) desde las columnas reales de `casos` + `calificaciones_finales` + `estados_caso`:
```ts
{
  id: string;
  idTramite: string;
  region: "RM" | "OHIGGINS" | "BIOBIO" | "ANTOFAGASTA";
  rut: string;
  nombreCompleto: string;
  estadoChecklist: "APTO" | "REQUIERE_REVISION" | "NO_APTO";
  estadoCaso: string;               // nombre de `estados_caso` (BORRADOR, EN_REVISION, FINALIZADO, etc.)
  estadoCalificacion: "PENDIENTE" | "CALIFICADO"; // derivado: CALIFICADO si hay fila en calificaciones_finales
  calificadorAsignadoId: string | null;
  calificadorNombre?: string | null;
  fechaAsignacion: string;   // ISO date
  fechaCalificacion: string | null;
  analisis: AnalisisQA | null; // JSON real del bot, o ficha sintética, o null
  propuesta: {
    diagnosticoPrincipal: string;
    diagnosticoSecundario: string | null;
    porcentajeIvadecIA: number;
    porcentajeFinal: number | null;
    fundamento: string;
    modificadoPorCalificador: boolean;
    checklist: { item: string; cumple: boolean; evidencia: string }[];
    documentos: { tipo: string; link: string }[]; // hoy siempre [] — documentos_caso todavía no se llena
  };
}
```

Para el caso **NO_APTO**, la columna `casos.no_apto_mensaje` ya existe en el schema (visible solo para ADMIN) — el frontend la trae en el `SELECT_CASO` pero conviene confirmar si ya se está mostrando en el modal "Ver caso" del admin o si sigue pendiente de UI.

---

## 7. Pendientes / decisiones abiertas

- [ ] Decidir si `src/lib/db.ts` (conexión directa a Postgres) se reemplaza por un cliente HTTP a una API real de Cristóbal, o si el modelo "Next.js como BFF contra Supabase" queda como definitivo.
- [ ] Confirmar si `casos.no_apto_mensaje` (y los links de evidencia de archivos NO_APTO) ya se muestran en el modal de admin o falta cablear esa parte de la UI.
- [ ] `documentos_caso` sigue sin llenarse — `propuesta.documentos` siempre devuelve `[]`.
- [ ] Limpiar el array mock muerto en `src/data/casos.ts` (`export const casos`), ya que nada lo importa.
- [ ] Definir paginación real en `GET /api/casos` cuando haya volumen — hoy trae todo y la paginación es solo client-side (`admin/page.tsx`).
- [ ] Confirmar credencial de Drive (`GOOGLE_SERVICE_ACCOUNT_JSON`) configurada en Vercel — el propio `google-drive.ts` documenta que en producción esto falló en silencio una vez y cayó siempre a la ficha sintética.
