# API del frontend — rutas, a dónde apuntan y su lógica

Todas las rutas viven en `src/app/api/**/route.ts` y llevan el comentario `// PALANTIR vX` al
inicio. **No hay backend separado**: cada handler valida sesión + rol y corre SQL directo
contra Supabase con el pool de `src/lib/db.ts`.

## Cómo se protege cada ruta (2 capas)

1. **`src/middleware.ts`** (edge) — corre antes de renderizar `/admin/*` y `/calificador/*`:
   sin JWT válido → redirige a `/`; JWT de otro rol → redirige a la interfaz de su rol. No
   toca las rutas `/api/*`.
2. **`src/lib/session-server.ts`** (`obtenerSesionServidor`) — **cada** handler `/api/*` vuelve
   a leer y verificar la cookie `compin_token` server-side, y revalida el rol. Defensa en
   profundidad: aunque el middleware quede mal, un token de CALIFICADOR no entra a un endpoint
   de ADMIN, y un CALIFICADOR nunca recibe un caso ajeno o `NO_APTO` (filtrado en el `WHERE`).

Cookie de sesión: `compin_token`, JWT HS256 (`jose`), `httpOnly` + `secure` en prod + `sameSite=lax`, 8 h. Payload: `{ sub, nombreCompleto, correo, rol }`.

---

## Tabla resumen

| Método · Ruta | Rol | Llamado desde | Tablas que toca |
|---|---|---|---|
| `POST /api/auth/login` | público | `src/app/page.tsx` (login) | `usuarios`, `roles`, `estado_usuario` (lee) |
| `POST /api/auth/logout` | cualquiera | `SesionProvider` (botón cerrar sesión) | — |
| `GET /api/casos` | ADMIN / CALIFICADOR | `CasosProvider` (carga inicial + `recargar`) | `casos`, `calificaciones_finales`, `usuarios`, `profesiones`, `estados_caso`, `documentos_caso` (lee) |
| `GET /api/casos/[id]` | ADMIN / CALIFICADOR | `CasosProvider.cargarDetalleCaso`, modal "Ver caso" del admin | `casos` (lee + update cache), `documentos_caso` (lee), Drive |
| `POST /api/casos/[id]/confirmar` | CALIFICADOR | `CasosProvider.confirmarPropuesta` | `calificaciones_finales`, `casos`, `estados_caso`, `historial_estados_caso`, `sesiones_revision` |
| `POST /api/casos/[id]/modificar` | CALIFICADOR | `CasosProvider.modificarYCalificar` | idem confirmar |
| `POST /api/casos/[id]/no-evaluable` | CALIFICADOR | `CasosProvider.declararNoEvaluable` | idem confirmar |
| `POST /api/casos/[id]/ficha` | CALIFICADOR | `CasosProvider.guardarFicha` (y antes de ratificar) | `casos` (`ficha_editada*`) |
| `POST /api/casos/[id]/marcar-subido-cerofilas` | CALIFICADOR | `CasosProvider.marcarSubidoCerofilas` ("Ya lo subí") | `casos` (`subido_cerofilas*`) |
| `POST /api/casos/[id]/revision/latido` | CALIFICADOR | `useRevisionTracker` (INICIO / LATIDO ~45 s / PAUSA) | `sesiones_revision`, `casos` (rollup `revision_*`) |
| `GET /api/metricas` | ADMIN | `src/app/admin/page.tsx` (tab Métricas) | `calificaciones_finales`, `casos`, `usuarios` (lee) |
| `GET /api/usuarios` | ADMIN | `admin/page.tsx` (tab Calificadores) | `usuarios`, `roles`, `estado_usuario` (lee) |
| `POST /api/usuarios` | ADMIN | `admin/page.tsx` (crear calificador) | `usuarios`, `roles`, `estado_usuario` |
| `PATCH /api/usuarios/[id]` | ADMIN | `admin/page.tsx` (editar / activar / desactivar) | `usuarios`, `estado_usuario` |

**No existe `DELETE` en ninguna ruta** — un usuario nunca se elimina, solo pasa a INACTIVO.

---

## Auth

### `POST /api/auth/login`  ·  público
`src/app/api/auth/login/route.ts` · body `{ correo, password }`.

Busca el usuario por correo (lower-case) con join a `roles` y `estado_usuario`. Rechaza (401,
mensaje genérico) si no existe, si está `INACTIVO`, o si `bcrypt.compare` falla. Si pasa: firma
el JWT (`firmarSesion`), lo deja en la cookie `compin_token` y responde
`{ rol, redirigirA }` (`/admin` o `/calificador` según `rutaPorRol`).

### `POST /api/auth/logout`  ·  cualquiera
`src/app/api/auth/logout/route.ts` · sin body. Borra la cookie `compin_token`. No consulta la base.

---

## Casos — lectura (ADMIN y CALIFICADOR)

### `GET /api/casos`
`src/app/api/casos/route.ts` · sin params.

- **ADMIN**: `SELECT_BASE` de todos los casos, `ORDER BY created_at DESC`.
- **CALIFICADOR**: agrega `WHERE calificador_asignado_id = <sesión> AND estado_checklist <> 'NO_APTO'` — la regla "un calificador nunca ve NO_APTO ni casos ajenos" está en el SQL, no solo en la UI.

Cada fila pasa por `mapearFila()` (`src/lib/casos-mapper.ts`), que arma el campo `analisis` con
prioridad: **JSON real del bot** (si `analysis_json` trae `checklist_admisibilidad_rm`) →
**ficha sintética** desde las columnas planas (`construirAnalisisSintetico`, para casos cargados
desde CSV sin el JSON completo) → **null** (casos con `tiene_error_bot`). Luego
`adjuntarDocumentos()` rellena `propuesta.documentos` desde `documentos_caso` en una sola query
(`WHERE caso_id = ANY(...)`).

### `GET /api/casos/[id]`
`src/app/api/casos/[id]/route.ts`

Igual que la lista pero para un caso, con dos cosas extra:

1. **Cache-on-read del analysis.json**: si el caso no tiene el JSON real pero sí
   `json_resultado_url` (link de Drive), lo baja **una vez** con `leerAnalysisJsonDesdeDrive`,
   lo guarda en `casos.analysis_json` y ya no vuelve a pedirlo.
2. **Permisos**: ADMIN ve cualquiera (incluido `NO_APTO`). CALIFICADOR: 403 si no es el
   `calificador_asignado_id` o si es `NO_APTO`.

Devuelve el `Caso` completo (con `analisis`, `propuesta.documentos`, `resolucion`, comparativa
IVADEC vs. propuesta, etc. — forma documentada en `ARQUITECTURA-FRONTEND.md` §6).

---

## Casos — resolución (solo CALIFICADOR, solo su caso asignado, nunca NO_APTO → 404)

Las tres escriben **una fila en `calificaciones_finales`** (`ON CONFLICT (caso_id) DO UPDATE`,
así se puede re-resolver), mueven `casos.estado_caso_id`, dejan traza en
`historial_estados_caso` y llaman a `cerrarRevision()` para cerrar la sesión de métricas.
`analysis_json` **nunca** se toca. Todo dentro de una transacción con `SELECT ... FOR UPDATE`.

### `POST /api/casos/[id]/confirmar`  — RATIFICAR
`src/app/api/casos/[id]/confirmar/route.ts` · body opcional `{ mr?: boolean, reev? }`.

El calificador acepta la propuesta tal cual (sin editar el %). Escribe:
`decision='ACEPTA'`, `porcentaje_final` = el % de la propuesta, `modificado=false`,
`idis_final`/`grado_final` = los del motor, `direccion` = `calcularDireccion(% motor vs.
porcentaje_ivadec_documento)`, `mr_final`/`reev_final` = lo que eligió el humano.
El % y el IDIS salen de `resolverComparativaIdis(analysis_json, fila)` — el JSON manda sobre
las columnas planas (evita `porcentaje_final = NULL` si el bot no parseó la columna).
Estado → `FINALIZADO`.

### `POST /api/casos/[id]/modificar`  — MODIFICAR
`src/app/api/casos/[id]/modificar/route.ts` · body `{ porcentajeFinal, motivoCodigo, fundamento (≥20), mr?, reev? }`.

Validaciones server-side (nunca confiar en el `<select>`):
- `porcentajeFinal` debe ser uno de los 41 valores oficiales de `TABLA_IDIS` (`buscarValorIdis`); `idis_final`/`grado_final` se derivan de ahí, no a mano.
- `motivoCodigo` ∈ `MOTIVOS_MODIFICACION`.
- `fundamento` ≥ 20 caracteres.

`direccion` = `calcularDireccion(porcentajeFinal vs. porcentaje_ivadec_documento)` — se compara
contra el **IVADEC original del documento**, nunca contra la propuesta del motor.
`modificado` = true si el % final difiere del del motor. `decision='MODIFICA'`, estado →
`FINALIZADO`, motivo al historial.

### `POST /api/casos/[id]/no-evaluable`  — DEVOLVER
`src/app/api/casos/[id]/no-evaluable/route.ts` · body `{ causaCodigo, detalle (≥20) }`.

No es un rechazo clínico: "no hay antecedentes suficientes para pronunciarse".
`causaCodigo` ∈ `CAUSAS_NO_EVALUABLE`. Escribe `decision='NO_EVALUABLE'`,
`porcentaje_final=NULL`, `idis/grado/direccion/motivo` = NULL. Estado →
`RECHAZADO_CALIFICADOR` (el admin lo ve como "DEVUELTO", va a bandeja de administración, no a
CeroFilas).

---

## Casos — auxiliares (solo CALIFICADOR, solo su caso)

### `POST /api/casos/[id]/ficha`
`src/app/api/casos/[id]/ficha/route.ts` · body `{ valores: Record<string,string> }`.

Guarda el snapshot completo de la ficha editada en `casos.ficha_editada` /
`ficha_editada_en` / `ficha_editada_por`. Reemplaza a `localStorage` como fuente de verdad
(así el histórico y abrir el caso en otro equipo muestran lo que el calificador dejó).
`analysis_json` intacto — tener las dos por separado es lo que permite medir "qué corrigió el
humano". `PanelResolucion` la llama antes de ratificar/modificar.

### `POST /api/casos/[id]/marcar-subido-cerofilas`
`src/app/api/casos/[id]/marcar-subido-cerofilas/route.ts` · sin body.

Botón "Ya lo subí". Set `subido_cerofilas = true`, `subido_cerofilas_en = now()`.
Independiente de la resolución (se puede marcar en cualquier momento), puramente informativo
para el admin — no cambia `estado_caso` ni bloquea nada. (Único auxiliar que **no** exige que
el caso no sea NO_APTO — solo que sea del calificador.)

### `POST /api/casos/[id]/revision/latido`
`src/app/api/casos/[id]/revision/latido/route.ts` · body `{ evento: 'INICIO' | 'LATIDO' | 'PAUSA' }`.

Métricas de productividad (Rev. 13). El front (`useRevisionTracker`) manda `INICIO` al abrir
un caso propio sin resolver, `LATIDO` cada ~45 s mientras la pestaña está visible, y `PAUSA`
al ocultar/cerrar (acepta `navigator.sendBeacon`, body text/plain). El **servidor** pone todas
las marcas de tiempo; el cliente solo declara el evento. `registrarEventoRevision()` acumula
`sesiones_revision.segundos_activos` sumando el intervalo entre latidos consecutivos **solo si
es ≤ umbral de idle** (gaps largos = se fue a otra cosa, no cuentan). Al resolver el caso,
`cerrarRevision()` cierra la sesión abierta y vuelca el rollup a `casos.revision_*`.

---

## Métricas (solo ADMIN)

### `GET /api/metricas`
`src/app/api/metricas/route.ts` · query opcional `desde`, `hasta` (ISO, default últimos 90 d),
`calificador` (uuid), `corte` (ISO — parte los casos en cohortes antes/desde esa fecha para
comparar rendimiento pre/post una mejora).

Consulta `calificaciones_finales` ⨝ `casos` ⨝ `usuarios` en el rango; por caso saca tiempo
activo (`casos.revision_segundos_activos`), nº de sesiones, tiempo total apertura→cierre,
si fue modificado, si estaba bloqueado por QA (`REQUIERE_REVISION` u `OBSERVADO`) y la
`version_motor`. Agrega con `resumir()` / `agruparPor()` (`src/lib/metricas/agregar.ts`).
Devuelve `{ rango, global, porCalificador[], porVersionMotor[], cohortes? }`.

---

## Usuarios (solo ADMIN)

### `GET /api/usuarios`
`src/app/api/usuarios/route.ts` · sin params. Lista todos (activos e inactivos) con rol y
estado, `ORDER BY rol, nombre`. **Nunca** devuelve `password_hash`.

### `POST /api/usuarios`
Mismo archivo · body `{ nombre, apellido, correo, password, rol? }`.
Valida: nombre/apellido no vacíos, correo `@grupoees.cl`, password ≥ 8. `rol` = `"ADMIN"` solo
si se pide explícito, si no `CALIFICADOR`. Hashea con `bcrypt.hash(password, 10)`, inserta
resolviendo `rol_id` y `estado_usuario_id` (`ACTIVO`) por subquery. 409 si el correo ya existe
(código PG `23505`). Responde 201 con el `Usuario`.

### `PATCH /api/usuarios/[id]`
`src/app/api/usuarios/[id]/route.ts` · body = cualquier subconjunto de
`{ nombre, apellido, correo, activo }` — solo se actualiza lo presente.
`activo: false` → set `estado_usuario_id` a `INACTIVO` (lo más destructivo que existe: **no hay
DELETE**). Correo nuevo debe ser `@grupoees.cl`; 409 si ya existe. Devuelve el `Usuario`
actualizado.
