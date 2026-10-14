// POST /api/usuarios/[id]/credencial — recupera la contraseña de un CALIFICADOR.
// body: { motivo } (obligatorio, mín. 10 caracteres). Solo ADMIN ACTIVO: además del JWT se
// revalida en la base, porque el token dura 8 h y el admin pudo ser desactivado entretanto.
// Cada intento queda en `auditoria_recuperacion_credencial` (quién, a quién, cuándo, motivo,
// IP), sin la contraseña. Si la auditoría no se puede escribir, la contraseña no se entrega.
// Se descifra (AES-256-GCM, clave en CREDENCIALES_CLAVE) solo aquí y viaja por HTTPS con `Cache-Control: no-store`.
// Es POST y no GET para que nunca quede en caché, historial ni logs de URL.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { descifrarCopia, cifradoConfigurado } from "@/lib/credenciales";

const SIN_CACHE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

function respuesta(cuerpo: unknown, status: number) {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "ADMIN") {
    return respuesta({ error: "No autorizado." }, 403);
  }

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const motivo = typeof cuerpo?.motivo === "string" ? cuerpo.motivo.trim() : "";
  if (motivo.length < 10) {
    return respuesta({ error: "Indica el motivo de la recuperación (mínimo 10 caracteres)." }, 400);
  }
  if (!cifradoConfigurado()) {
    return respuesta({ error: "Falta configurar el cifrado de credenciales (CREDENCIALES_CLAVE)." }, 503);
  }

  const pool = getPool();

  const { rows: admins } = await pool.query(
    `SELECT 1 FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
      WHERE u.id = $1 AND r.nombre = 'ADMIN' AND eu.estado = 'ACTIVO'`,
    [sesion.id]
  );
  if (!admins.length) {
    return respuesta({ error: "No autorizado." }, 403);
  }

  const { rows } = await pool.query<{ password_cifrada: string | null }>(
    `SELECT c.password_cifrada
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN credenciales_calificador c ON c.usuario_id = u.id
      WHERE u.id = $1 AND r.nombre = 'CALIFICADOR'`,
    [id]
  );
  if (!rows.length) {
    return respuesta({ error: "Calificador no encontrado." }, 404);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const auditar = (resultado: "ENTREGADA" | "SIN_COPIA" | "ERROR_DESCIFRADO") =>
    pool.query(
      `INSERT INTO auditoria_recuperacion_credencial (admin_id, calificador_id, motivo, resultado, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sesion.id, id, motivo, resultado, ip, userAgent]
    );

  const cifrada = rows[0].password_cifrada;
  if (!cifrada) {
    await auditar("SIN_COPIA");
    return respuesta({ error: "Este calificador no tiene una copia recuperable (aún no crea su contraseña)." }, 404);
  }

  let password: string;
  try {
    password = await descifrarCopia(cifrada);
  } catch (error) {
    // Solo el mensaje: nunca el ciphertext ni el texto descifrado.
    console.error("Recuperación de credencial: fallo al descifrar:", error instanceof Error ? error.message : "desconocido");
    await auditar("ERROR_DESCIFRADO");
    return respuesta({ error: "No se pudo descifrar la credencial." }, 502);
  }

  await auditar("ENTREGADA");
  return respuesta({ password }, 200);
}
