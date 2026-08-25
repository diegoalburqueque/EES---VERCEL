/**
 * Pruebas de los endpoints del frontend contra la base real.
 *
 *   node scripts/probar-endpoints.mjs [http://localhost:3000]
 *
 * Cubre autenticación, sesión, permisos por rol y las reglas de negocio no negociables
 * (un NO_APTO nunca llega al calificador; nadie califica un caso ajeno; el % de la IA no
 * se pisa). Necesita el servidor levantado y la base con los datos semilla.
 *
 * El caso 33418560 está reservado para las pruebas que escriben: al terminar se revierte
 * a BORRADOR, así que la corrida deja la base como estaba.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const BASE = process.argv[2] ?? "http://localhost:3000";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ADMIN = { correo: "diego.admin@grupoees.cl", password: "Admin2026#1" };
const CALIFICADOR = { correo: "javiera.calificadora@grupoees.cl", password: "Calif2026#1" };
const TRAMITE_DE_PRUEBA = "33418560";

let pasadas = 0;
let falladas = 0;
const fallos = [];

function verificar(descripcion, condicion, detalle = "") {
  if (condicion) {
    pasadas++;
    console.log(`  ✓ ${descripcion}`);
  } else {
    falladas++;
    fallos.push(`${descripcion}${detalle ? ` — ${detalle}` : ""}`);
    console.log(`  ✗ ${descripcion}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function seccion(titulo) {
  console.log(`\n── ${titulo}`);
}

/** fetch que arrastra la cookie de sesión, como haría el navegador. */
async function pedir(ruta, { metodo = "GET", cuerpo, cookie } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    redirect: "manual",
  });

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto.slice(0, 200);
  }

  const setCookie = respuesta.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/compin_token=([^;]*)/)?.[1];

  return { estado: respuesta.status, datos, token, setCookie };
}

async function iniciarSesion(credenciales) {
  const r = await pedir("/api/auth/login", { metodo: "POST", cuerpo: credenciales });
  return { ...r, cookie: r.token ? `compin_token=${r.token}` : "" };
}

function conexion() {
  const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
  const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL"));
  return linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
}

const db = new pg.Client({ connectionString: conexion(), ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  console.log(`Probando ${BASE}\n${"=".repeat(60)}`);

  /* ── 1. Login ──────────────────────────────────────────────────────────── */
  seccion("POST /api/auth/login");

  const malPass = await pedir("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: ADMIN.correo, password: "incorrecta" },
  });
  verificar("Rechaza contraseña incorrecta con 401", malPass.estado === 401, `dio ${malPass.estado}`);
  verificar(
    "El error no revela si el correo existe",
    typeof malPass.datos?.error === "string" && !malPass.datos.error.toLowerCase().includes("no existe"),
    JSON.stringify(malPass.datos)
  );

  const sinUsuario = await pedir("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "nadie@grupoees.cl", password: "x" },
  });
  verificar("Rechaza usuario inexistente con 401", sinUsuario.estado === 401, `dio ${sinUsuario.estado}`);

  const sinCampos = await pedir("/api/auth/login", { metodo: "POST", cuerpo: { correo: 123 } });
  verificar("Valida el cuerpo con 400", sinCampos.estado === 400, `dio ${sinCampos.estado}`);

  const admin = await iniciarSesion(ADMIN);
  verificar("Login de ADMIN responde 200", admin.estado === 200, `dio ${admin.estado}`);
  verificar("Login de ADMIN devuelve rol y destino", admin.datos?.rol === "ADMIN" && admin.datos?.redirigirA === "/admin");
  verificar("Emite cookie de sesión", Boolean(admin.token));
  verificar("La cookie es httpOnly", admin.setCookie.toLowerCase().includes("httponly"));
  verificar("La cookie usa SameSite", admin.setCookie.toLowerCase().includes("samesite"));
  verificar("La respuesta no expone el hash de la contraseña", !JSON.stringify(admin.datos).includes("$2"));

  const calificador = await iniciarSesion(CALIFICADOR);
  verificar("Login de CALIFICADOR responde 200", calificador.estado === 200, `dio ${calificador.estado}`);
  verificar("Login de CALIFICADOR redirige a su panel", calificador.datos?.redirigirA === "/calificador");

  /* ── 2. Lectura de casos ───────────────────────────────────────────────── */
  seccion("GET /api/casos");

  const sinSesion = await pedir("/api/casos");
  verificar("Sin sesión responde 401", sinSesion.estado === 401, `dio ${sinSesion.estado}`);

  const tokenFalso = await pedir("/api/casos", { cookie: "compin_token=esto.no.es.un.jwt" });
  verificar("Token inválido responde 401", tokenFalso.estado === 401, `dio ${tokenFalso.estado}`);

  const comoAdmin = await pedir("/api/casos", { cookie: admin.cookie });
  verificar("ADMIN obtiene 200", comoAdmin.estado === 200, `dio ${comoAdmin.estado}`);
  verificar("ADMIN recibe una lista", Array.isArray(comoAdmin.datos));

  const { rows: totales } = await db.query("SELECT count(*)::int AS n FROM casos");
  verificar(
    `ADMIN ve todos los casos de la base (${totales[0].n})`,
    comoAdmin.datos?.length === totales[0].n,
    `endpoint ${comoAdmin.datos?.length} vs base ${totales[0].n}`
  );
  verificar(
    "ADMIN sí ve los NO_APTO",
    comoAdmin.datos?.some((c) => c.estadoChecklist === "NO_APTO")
  );

  const comoCalificador = await pedir("/api/casos", { cookie: calificador.cookie });
  verificar("CALIFICADOR obtiene 200", comoCalificador.estado === 200, `dio ${comoCalificador.estado}`);
  verificar(
    "REGLA: el CALIFICADOR nunca ve un NO_APTO",
    comoCalificador.datos?.every((c) => c.estadoChecklist !== "NO_APTO")
  );

  const { rows: sesionCalif } = await db.query("SELECT id FROM usuarios WHERE correo = $1", [
    CALIFICADOR.correo,
  ]);
  const idCalificador = sesionCalif[0].id;
  verificar(
    "REGLA: el CALIFICADOR sólo ve casos asignados a él",
    comoCalificador.datos?.every((c) => c.calificadorAsignadoId === idCalificador)
  );

  const { rows: suyos } = await db.query(
    "SELECT count(*)::int AS n FROM casos WHERE calificador_asignado_id = $1 AND estado_checklist <> 'NO_APTO'",
    [idCalificador]
  );
  verificar(
    `El total coincide con la base (${suyos[0].n})`,
    comoCalificador.datos?.length === suyos[0].n,
    `endpoint ${comoCalificador.datos?.length} vs base ${suyos[0].n}`
  );

  /* ── 3. Forma de los datos ─────────────────────────────────────────────── */
  seccion("Contrato de datos");

  const muestra = comoCalificador.datos?.[0];
  verificar("Cada caso trae id, idTramite, rut y nombre", Boolean(muestra?.id && muestra?.idTramite && muestra?.rut && muestra?.nombreCompleto));
  verificar("Trae el estado del flujo", typeof muestra?.estadoCaso === "string");
  verificar("Trae la propuesta con el % del motor", typeof muestra?.propuesta?.porcentajeIvadecIA === "number");
  verificar("Trae el checklist armado", Array.isArray(muestra?.propuesta?.checklist) && muestra.propuesta.checklist.length > 0);
  verificar("Adjunta el análisis QA completo", Boolean(muestra?.analisis?.metadata_informe?.id_tramite));
  verificar(
    "Las fechas salen en ISO, no en formato inglés",
    !muestra?.fechaAsignacion || /^\d{4}-\d{2}-\d{2}$/.test(muestra.fechaAsignacion),
    `fechaAsignacion = ${muestra?.fechaAsignacion}`
  );

  /* ── 4. Permisos de escritura ──────────────────────────────────────────── */
  seccion("Permisos de escritura");

  const casoPrueba = comoCalificador.datos?.find((c) => c.idTramite === TRAMITE_DE_PRUEBA);
  if (!casoPrueba) throw new Error(`Falta el caso de prueba ${TRAMITE_DE_PRUEBA}.`);

  const confirmarSinSesion = await pedir(`/api/casos/${casoPrueba.id}/confirmar`, { metodo: "POST" });
  verificar("Confirmar sin sesión responde 403", confirmarSinSesion.estado === 403, `dio ${confirmarSinSesion.estado}`);

  const confirmarComoAdmin = await pedir(`/api/casos/${casoPrueba.id}/confirmar`, {
    metodo: "POST",
    cookie: admin.cookie,
  });
  verificar("REGLA: el ADMIN no puede calificar (403)", confirmarComoAdmin.estado === 403, `dio ${confirmarComoAdmin.estado}`);

  const { rows: ajeno } = await db.query(
    "SELECT id FROM casos WHERE estado_checklist = 'NO_APTO' LIMIT 1"
  );
  if (ajeno.length) {
    const contraNoApto = await pedir(`/api/casos/${ajeno[0].id}/confirmar`, {
      metodo: "POST",
      cookie: calificador.cookie,
    });
    verificar(
      "REGLA: no se puede calificar un NO_APTO (404)",
      contraNoApto.estado === 404,
      `dio ${contraNoApto.estado}`
    );
  }

  const inexistente = await pedir("/api/casos/00000000-0000-0000-0000-000000000000/confirmar", {
    metodo: "POST",
    cookie: calificador.cookie,
  });
  verificar("Caso inexistente responde 404", inexistente.estado === 404, `dio ${inexistente.estado}`);

  /* ── 5. Validación del porcentaje ──────────────────────────────────────── */
  seccion("POST /api/casos/[id]/modificar — validación");

  for (const [etiqueta, valor] of [
    ["negativo", -5],
    ["mayor a 100", 150],
    ["texto", "cincuenta"],
    ["nulo", null],
  ]) {
    const r = await pedir(`/api/casos/${casoPrueba.id}/modificar`, {
      metodo: "POST",
      cookie: calificador.cookie,
      cuerpo: { porcentajeFinal: valor },
    });
    verificar(`Rechaza porcentaje ${etiqueta} con 400`, r.estado === 400, `dio ${r.estado}`);
  }

  /* ── 6. Calificar de verdad ────────────────────────────────────────────── */
  seccion("Flujo completo de calificación");

  const pctMotor = casoPrueba.propuesta.porcentajeIvadecIA;
  const pctNuevo = pctMotor === 40 ? 45 : 40;

  const modificar = await pedir(`/api/casos/${casoPrueba.id}/modificar`, {
    metodo: "POST",
    cookie: calificador.cookie,
    cuerpo: { porcentajeFinal: pctNuevo },
  });
  verificar("Modificar y calificar responde 200", modificar.estado === 200, `dio ${modificar.estado}`);

  const { rows: guardado } = await db.query(
    `SELECT cf.porcentaje_final, cf.modificado_por_calificador, cf.calificador_id,
            c.porcentaje_propuesto_ia, ec.nombre AS estado
       FROM casos c
       JOIN estados_caso ec ON ec.id = c.estado_caso_id
       LEFT JOIN calificaciones_finales cf ON cf.caso_id = c.id
      WHERE c.id = $1`,
    [casoPrueba.id]
  );
  const fila = guardado[0];
  verificar("Guarda el % final en la base", Number(fila.porcentaje_final) === pctNuevo, `guardó ${fila.porcentaje_final}`);
  verificar("Marca modificado_por_calificador", fila.modificado_por_calificador === true);
  verificar("Registra qué calificador lo hizo", fila.calificador_id === idCalificador);
  verificar(
    "REGLA: el % del motor queda intacto",
    Number(fila.porcentaje_propuesto_ia) === pctMotor,
    `motor ${fila.porcentaje_propuesto_ia} vs original ${pctMotor}`
  );
  verificar("El caso pasa a FINALIZADO", fila.estado === "FINALIZADO", `quedó ${fila.estado}`);

  const { rows: historial } = await db.query(
    `SELECT h.motivo, ea.nombre AS anterior, en.nombre AS nuevo, h.usuario_id
       FROM historial_estados_caso h
       JOIN estados_caso en ON en.id = h.estado_nuevo_id
       LEFT JOIN estados_caso ea ON ea.id = h.estado_anterior_id
      WHERE h.caso_id = $1 ORDER BY h.fecha DESC LIMIT 1`,
    [casoPrueba.id]
  );
  verificar("Deja rastro en historial_estados_caso", historial.length > 0);
  verificar(
    "El historial guarda el salto de estado y el usuario",
    historial[0]?.nuevo === "FINALIZADO" && historial[0]?.usuario_id === idCalificador
  );

  const confirmarYaCalificado = await pedir(`/api/casos/${casoPrueba.id}/confirmar`, {
    metodo: "POST",
    cookie: calificador.cookie,
  });
  verificar(
    "Reconfirmar un caso ya calificado no rompe (upsert)",
    confirmarYaCalificado.estado === 200,
    `dio ${confirmarYaCalificado.estado}`
  );

  const { rows: trasConfirmar } = await db.query(
    "SELECT porcentaje_final, modificado_por_calificador FROM calificaciones_finales WHERE caso_id = $1",
    [casoPrueba.id]
  );
  verificar(
    "Confirmar vuelve al % del motor y desmarca modificado",
    Number(trasConfirmar[0].porcentaje_final) === pctMotor && trasConfirmar[0].modificado_por_calificador === false,
    JSON.stringify(trasConfirmar[0])
  );

  const { rows: unaSola } = await db.query(
    "SELECT count(*)::int AS n FROM calificaciones_finales WHERE caso_id = $1",
    [casoPrueba.id]
  );
  verificar("No duplica la calificación final", unaSola[0].n === 1, `hay ${unaSola[0].n} filas`);

  /* ── 7. Logout ─────────────────────────────────────────────────────────── */
  seccion("POST /api/auth/logout");

  const salir = await pedir("/api/auth/logout", { metodo: "POST", cookie: calificador.cookie });
  verificar("Logout responde OK", salir.estado === 200 || salir.estado === 204, `dio ${salir.estado}`);
  verificar(
    "Limpia la cookie de sesión",
    salir.setCookie.includes("compin_token=;") || salir.setCookie.toLowerCase().includes("max-age=0")
  );

  /* ── 8. Middleware por rol ─────────────────────────────────────────────── */
  seccion("Middleware de rutas");

  const adminSinSesion = await pedir("/admin");
  verificar("/admin sin sesión redirige", [302, 307].includes(adminSinSesion.estado), `dio ${adminSinSesion.estado}`);

  const adminComoCalificador = await pedir("/admin", { cookie: calificador.cookie });
  verificar(
    "REGLA: un CALIFICADOR no entra a /admin",
    [302, 307].includes(adminComoCalificador.estado),
    `dio ${adminComoCalificador.estado}`
  );

  const calificadorComoAdmin = await pedir("/calificador", { cookie: admin.cookie });
  verificar(
    "Un ADMIN no entra a /calificador",
    [302, 307].includes(calificadorComoAdmin.estado),
    `dio ${calificadorComoAdmin.estado}`
  );
} finally {
  /* ── Deja la base como estaba ────────────────────────────────────────────── */
  seccion("Limpieza");
  const { rows } = await db.query("SELECT id FROM casos WHERE id_tramite = $1", [TRAMITE_DE_PRUEBA]);
  if (rows.length) {
    const idCaso = rows[0].id;
    await db.query("DELETE FROM calificaciones_finales WHERE caso_id = $1", [idCaso]);
    await db.query("DELETE FROM historial_estados_caso WHERE caso_id = $1", [idCaso]);
    await db.query(
      "UPDATE casos SET estado_caso_id = (SELECT id FROM estados_caso WHERE nombre = 'BORRADOR') WHERE id = $1",
      [idCaso]
    );
    console.log(`  Caso ${TRAMITE_DE_PRUEBA} devuelto a BORRADOR.`);
  }
  await db.end();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${pasadas} pruebas pasadas · ${falladas} fallidas`);
  if (fallos.length) {
    console.log("\nFallos:");
    fallos.forEach((f) => console.log(`  · ${f}`));
  }
  process.exitCode = falladas > 0 ? 1 : 0;
}
