// PALANTIR v1.0.0 — GET /api/metricas
// Métricas de productividad de la revisión humana (Revisión 13), solo ADMIN (403 si no).
// Query params (todos opcionales):
//   desde, hasta   — rango de fecha_calificacion (ISO yyyy-mm-dd). Default: últimos 90 días.
//   calificador    — uuid; filtra a un solo profesional.
//   corte          — fecha ISO; parte los casos en cohortes "antes" / "desde" esa fecha
//                    (para comparar rendimiento pre/post una mejora del sistema).
// Devuelve: { rango, global, porCalificador[], porVersionMotor[], cohortes? }.
// La base de "tiempo activo" es casos.revision_segundos_activos (rollup de sesiones_revision).

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { resumir, agruparPor, type FilaCasoResuelto } from "@/lib/metricas/agregar";

interface FilaRaw {
  caso_id: string;
  calificador_id: string | null;
  calificador_nombre: string | null;
  fecha_calificacion: string;
  revision_segundos_activos: number;
  revision_num_sesiones: number;
  segundos_apertura_cierre: string | null;
  modificado: boolean;
  bloqueado_qa: boolean;
  version_motor: string;
}

function isoFecha(valor: string | null): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const sesion = await obtenerSesionServidor();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (sesion.rol !== "ADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const url = new URL(request.url);
  const hoy = new Date();
  const hace90 = new Date(hoy.getTime() - 90 * 24 * 3600 * 1000);
  const desde = isoFecha(url.searchParams.get("desde")) ?? hace90.toISOString().slice(0, 10);
  const hasta = isoFecha(url.searchParams.get("hasta")) ?? hoy.toISOString().slice(0, 10);
  const calificador = url.searchParams.get("calificador");
  const corte = isoFecha(url.searchParams.get("corte"));

  const pool = getPool();
  const { rows } = await pool.query<FilaRaw>(
    `SELECT
        cf.caso_id,
        cf.calificador_id,
        (u.nombre || ' ' || u.apellido)                              AS calificador_nombre,
        cf.fecha_calificacion,
        COALESCE(c.revision_segundos_activos, 0)                     AS revision_segundos_activos,
        COALESCE(c.revision_num_sesiones, 0)                         AS revision_num_sesiones,
        EXTRACT(EPOCH FROM (cf.fecha_calificacion - c.fecha_asignacion)) AS segundos_apertura_cierre,
        cf.modificado_por_calificador                               AS modificado,
        (c.estado_checklist = 'REQUIERE_REVISION' OR c.meta_estado_analisis = 'OBSERVADO') AS bloqueado_qa,
        COALESCE(c.version_motor, 'sin_version')                     AS version_motor
       FROM calificaciones_finales cf
       JOIN casos c    ON c.id = cf.caso_id
       LEFT JOIN usuarios u ON u.id = cf.calificador_id
      WHERE cf.fecha_calificacion >= $1::date
        AND cf.fecha_calificacion < ($2::date + 1)
        AND ($3::uuid IS NULL OR cf.calificador_id = $3::uuid)
      ORDER BY cf.fecha_calificacion`,
    [desde, hasta, calificador],
  );

  const filas: FilaCasoResuelto[] = rows.map((r) => ({
    casoId: r.caso_id,
    calificadorId: r.calificador_id,
    calificadorNombre: r.calificador_nombre,
    fechaCalificacion: new Date(r.fecha_calificacion).toISOString(),
    revisionSegundosActivos: Number(r.revision_segundos_activos) || 0,
    revisionNumSesiones: Number(r.revision_num_sesiones) || 0,
    segundosAperturaCierre: r.segundos_apertura_cierre === null ? null : Number(r.segundos_apertura_cierre),
    modificado: Boolean(r.modificado),
    bloqueadoQa: Boolean(r.bloqueado_qa),
    versionMotor: r.version_motor,
  }));

  const cohortes = corte
    ? {
        corte,
        antes: resumir(filas.filter((f) => f.fechaCalificacion.slice(0, 10) < corte)),
        desde: resumir(filas.filter((f) => f.fechaCalificacion.slice(0, 10) >= corte)),
      }
    : null;

  return NextResponse.json({
    rango: { desde, hasta },
    global: resumir(filas),
    porCalificador: agruparPor(filas, (f) =>
      f.calificadorId ? { id: f.calificadorId, etiqueta: f.calificadorNombre ?? "Sin nombre" } : null,
    ),
    porVersionMotor: agruparPor(filas, (f) => ({ id: f.versionMotor, etiqueta: f.versionMotor })),
    cohortes,
  });
}
