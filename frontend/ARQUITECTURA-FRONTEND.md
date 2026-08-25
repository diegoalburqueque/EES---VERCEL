# Arquitectura Frontend — Motor de Calificación COMPIN

Contexto vivo del frontend (Next.js) para coordinar con el backend. Se actualiza cada vez que se agrega una interfaz, se cambia un flujo de seguridad, o se decide un endpoint. No borrar historial — solo agregar/tachar.

Repo: `C:\Users\albur\Desktop\PROYECTOS\WORK\MVP\frontend`

---

## 1. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `src/app/*` |
| Lenguaje | TypeScript | strict |
| UI | React 19 + Tailwind CSS 4 | sin librería de componentes, todo hecho a mano |
| Autenticación | JWT firmado con `jose` (HS256) | cookie `httpOnly`, no `localStorage` |
| Sesión en cookie | `compin_token`, expira 8h | ver sección Seguridad |
| Estado del lado cliente (mock) | React Context (`useState`) | reemplazar por fetch a la API real — hoy es solo en memoria del navegador, se resetea al recargar |
| Base de datos (destino final, aún no conectada) | PostgreSQL + Prisma | ver `MVP/BASE DE DATOS.md` |
| Backend (aún no conectado) | A definir por el compañero de backend | el frontend ya está listo para consumir vía `fetch` |

**Decisión pendiente de confirmar con backend:** ¿el Next.js actúa como BFF (los route handlers de `src/app/api/*` llaman al backend real y reenvían/transforman la respuesta) o el cliente le pega directo a la API del backend? Hoy `src/app/api/auth/login` y `logout` están montados como si Next fuera el que emite el JWT — si el backend va a emitir su propio JWT, este archivo hay que ajustarlo (Next dejaría de firmar, solo reenviaría cookie).

---

## 2. Interfaces (mapa de pantallas)

| Ruta | Rol | Qué muestra | Estado |
|---|---|---|---|
| `/` | Público | Login (correo + contraseña) | ✅ hecho |
| `/admin` | ADMIN | Todos los casos (tabla) | ✅ hecho |
| `/admin` (tab "No aptos") | ADMIN | Solo casos `estadoChecklist = NO_APTO` | ✅ hecho |
| `/admin` (tab "Calificadores") | ADMIN | CRUD calificadores (crear/editar/"eliminar"=desactivar/reactivar) | ✅ hecho |
| `/calificador` | CALIFICADOR | Mis casos pendientes (APTO/REQUIERE_REVISION, sin calificar) | ✅ hecho |
| `/calificador/casos/[id]` | CALIFICADOR | Ficha de propuesta (tipo Word) + botones Confirmar/Modificar si está pendiente, solo lectura si ya se calificó | ✅ hecho |
| `/calificador/historico` | CALIFICADOR | Casos ya calificados por ese usuario | ✅ hecho |
| `/admin` → "Ver caso" (detalle admin, incluye NO_APTO) | ADMIN | Pendiente: ficha de detalle para admin, con motivo de no apto + links de evidencia | ⏳ falta |

---

## 3. Seguridad

- Login: `POST /api/auth/login` valida credenciales (hoy contra mock, mañana contra backend) y firma un JWT con `{ sub, nombreCompleto, correo, rol }`. Se setea como cookie `compin_token` (`httpOnly`, `secure` en prod, `sameSite=lax`, 8h).
- **Nunca se guarda sesión en `localStorage`** — se probó explícitamente que un XSS o la consola del navegador no puede leer ni modificar la cookie.
- `src/middleware.ts` corre en el edge antes de renderizar cualquier ruta `/admin/*` o `/calificador/*`: verifica firma del JWT y que `rol` coincida con el prefijo de ruta. Si no, redirige.
- `src/lib/session-server.ts` (`exigirSesion`) vuelve a validar server-side en los `layout.tsx` de cada sección — defensa en profundidad si el middleware quedara mal configurado.
- Logout: `POST /api/auth/logout` borra la cookie.
- **Importante para el backend:** el frontend hace su parte (UI + primera barrera), pero cada endpoint de API real **debe volver a validar el JWT y el rol en el servidor**, no confiar en que "si llegó hasta acá es porque el frontend ya filtró". Un token de CALIFICADOR nunca debe poder leer/escribir endpoints de ADMIN aunque le pegue directo con curl/Postman.

---

## 4. Matriz de permisos por rol

| Endpoint (futuro) | ADMIN | CALIFICADOR |
|---|---|---|
| `POST /auth/login` | ✅ | ✅ |
| `POST /auth/logout` | ✅ | ✅ |
| `GET /casos` (todos) | ✅ | ❌ |
| `GET /casos?estadoChecklist=NO_APTO` | ✅ | ❌ (nunca debe verlos) |
| `GET /casos/:id` (cualquier caso, incluido NO_APTO) | ✅ | ❌ |
| `GET /casos?calificadorId=me` | ❌ (usa la versión "todos") | ✅ (solo los suyos) |
| `GET /casos/:id` (propio, no NO_APTO) | — | ✅ |
| `POST /casos/:id/confirmar` | ❌ | ✅ (solo si `calificadorAsignadoId === me`) |
| `POST /casos/:id/modificar` | ❌ | ✅ (solo si `calificadorAsignadoId === me`) |
| `GET /calificadores` | ✅ | ❌ |
| `POST /calificadores` (crear) | ✅ | ❌ |
| `PATCH /calificadores/:id` (editar) | ✅ | ❌ |
| `PATCH /calificadores/:id/estado` (activar/desactivar — nunca DELETE real) | ✅ | ❌ |
| `DELETE /calificadores/:id` | 🚫 **no debe existir este endpoint** — un calificador nunca se borra de la base de datos | 🚫 |

---

## 5. Archivos que hoy usan datos mock → API que deben consumir

Esta tabla es la más importante para no perdernos: cada archivo de la izquierda hoy importa arrays hardcodeados; cuando el backend tenga el endpoint, ese `import` se reemplaza por un `fetch`/cliente HTTP a la ruta de la derecha.

| Archivo frontend | Qué hace hoy (mock) | Endpoint API que debería consumir | Método | Quién puede llamarlo |
|---|---|---|---|---|
| `src/app/api/auth/login/route.ts` | Valida contra `src/data/usuarios.ts` y firma JWT local | `POST /auth/login` (backend) | POST | Público |
| `src/app/api/auth/logout/route.ts` | Borra cookie local | `POST /auth/logout` (backend, si maneja sesión/refresh token) | POST | Autenticado |
| `src/app/admin/page.tsx` (tab "Todos los casos") | `import { casos } from "@/data/casos"` | `GET /casos` | GET | ADMIN |
| `src/app/admin/page.tsx` (tab "No aptos") | filtra el mismo array por `estadoChecklist === "NO_APTO"` | `GET /casos?estadoChecklist=NO_APTO` | GET | ADMIN |
| `src/app/admin/page.tsx` (tab "Calificadores") — listar | `import { usuarios } from "@/data/usuarios"` | `GET /calificadores` | GET | ADMIN |
| `src/app/admin/page.tsx` — crear calificador (`crearCalificador`) | `setListaUsuarios([...prev, nuevo])` en memoria | `POST /calificadores` | POST | ADMIN |
| `src/app/admin/page.tsx` — editar calificador (`editarCalificador`) | mutación en memoria | `PATCH /calificadores/:id` | PATCH | ADMIN |
| `src/app/admin/page.tsx` — eliminar/reactivar (`toggleActivo`) | mutación en memoria | `PATCH /calificadores/:id/estado` (`{ activo: boolean }`) | PATCH | ADMIN |
| `src/app/admin/page.tsx` — "Ver caso" (botón, aún sin destino) | — | `GET /casos/:id` (versión admin, incluye motivo NO_APTO + links evidencia) | GET | ADMIN |
| `src/app/calificador/page.tsx` | `useCasos()` filtra por `calificadorAsignadoId === sesion.id` y `estadoCalificacion === "PENDIENTE"` | `GET /casos?calificadorId=me&estado=PENDIENTE` | GET | CALIFICADOR |
| `src/app/calificador/historico/page.tsx` | filtra por `estadoCalificacion === "CALIFICADO"` | `GET /casos?calificadorId=me&estado=CALIFICADO` | GET | CALIFICADOR |
| `src/app/calificador/casos/[id]/page.tsx` (carga de la ficha) | `casos.find(c => c.id === id)` | `GET /casos/:id` | GET | CALIFICADOR (solo si es suyo) |
| `src/app/calificador/casos/[id]/page.tsx` — botón "Confirmar propuesta" (`confirmarPropuesta`) | mutación en memoria (`porcentajeFinal = porcentajeIvadecIA`) | `POST /casos/:id/confirmar` | POST | CALIFICADOR |
| `src/app/calificador/casos/[id]/page.tsx` — botón "Guardar y calificar" tras Modificar (`modificarYCalificar`) | mutación en memoria (`porcentajeFinal`, `modificadoPorCalificador`) | `POST /casos/:id/modificar` (`{ porcentajeFinal: number }`) | POST | CALIFICADOR |

### Archivos de datos mock (a eliminar cuando haya API real)
- `src/data/usuarios.ts` — reemplaza por respuestas de `/calificadores` y `/auth/login`.
- `src/data/casos.ts` — reemplaza por respuestas de `/casos`.
- `src/components/CasosProvider.tsx` y el `useState` de calificadores en `admin/page.tsx` — hoy son el "store" en memoria; al conectar la API pasan a ser capas de fetching (`SWR`/`React Query` o simplemente `fetch` + `useEffect`, a decidir).

---

## 6. Estructura de datos esperada por el frontend (contrato mínimo)

### Usuario / Calificador
```ts
{
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: "ADMIN" | "CALIFICADOR";
  activo: boolean; // nunca se borra, solo activo/inactivo
}
```

### Caso
```ts
{
  id: string;
  idTramite: string;
  region: "RM" | "OHIGGINS" | "BIOBIO" | "ANTOFAGASTA";
  rut: string;
  nombreCompleto: string;
  estadoChecklist: "APTO" | "REQUIERE_REVISION" | "NO_APTO";
  estadoCalificacion: "PENDIENTE" | "CALIFICADO";
  calificadorAsignadoId: string | null;
  fechaAsignacion: string;   // ISO date
  fechaCalificacion: string | null;
  propuesta: {
    diagnosticoPrincipal: string;
    diagnosticoSecundario: string | null;
    porcentajeIvadecIA: number;
    porcentajeFinal: number | null;
    fundamento: string;
    modificadoPorCalificador: boolean;
    checklist: { item: string; cumple: boolean; evidencia: string }[];
    documentos: { tipo: string; link: string }[];
  };
}
```

Para el caso **NO_APTO** falta definir con backend un campo adicional visible solo para ADMIN: motivo/mensaje de por qué la IA lo marcó no apto + links de evidencia de los archivos problemáticos (pedido explícito: "la IA que revisa los casos tiene que dejar como una constancia de que archivos son los no aptos, solo un mensaje para el admin y los links de acceso a esos archivos").

---

## 7. Pendientes / decisiones abiertas

- [ ] Definir si Next.js es BFF (firma su propio JWT) o el backend emite el JWT y Next solo lo guarda en cookie.
- [ ] Endpoint y campo de motivo/evidencia para casos NO_APTO (solo ADMIN).
- [ ] Interfaz de detalle de caso para ADMIN (hoy el botón "Ver caso" en `/admin` no tiene destino).
- [ ] Definir librería de fetching cuando se conecte la API real (fetch nativo vs SWR/React Query) para manejo de loading/error states.
- [ ] Definir paginación de `/casos` y `/calificadores` cuando haya volumen real (hoy todo es lista completa en memoria).
