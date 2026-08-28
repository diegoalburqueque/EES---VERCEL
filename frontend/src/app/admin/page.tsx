"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/components/SesionProvider";
import { type Caso, type EstadoChecklist } from "@/data/casos";
import { type Usuario } from "@/data/usuarios";
import { Modal } from "@/components/Modal";
import { FichaEditable } from "@/components/FichaEditable";
import { DocumentosExpediente } from "@/components/DocumentosExpediente";
import { TablaComparativaIdis, ResolucionRegistrada } from "@/components/ResolucionCalificador";

const badgeEstado: Record<EstadoChecklist, string> = {
  APTO: "bg-emerald-50 text-emerald-700",
  REQUIERE_REVISION: "bg-amber-50 text-amber-700",
  NO_APTO: "bg-red-50 text-red-700",
};

const labelEstado: Record<EstadoChecklist, string> = {
  APTO: "Apto",
  REQUIERE_REVISION: "Requiere revisión",
  NO_APTO: "No apto",
};

/** `RECHAZADO_CALIFICADOR` es el estado que reutilizamos para "el calificador declaró el caso
 *  no evaluable" (ver Revisión 10) — el admin lo ve como "DEVUELTO", mismo texto que ya usa el
 *  calificador en su histórico, en vez del nombre técnico crudo de la fila de `estados_caso`. */
function etiquetaFlujo(estadoCaso: string): string {
  if (estadoCaso === "RECHAZADO_CALIFICADOR") return "DEVUELTO";
  return estadoCaso.replace(/_/g, " ");
}

type Vista = "dashboard" | "todos" | "no-aptos" | "devueltos" | "calificadores" | "metricas";
type FiltroEstadoAdmin = "TODOS" | EstadoChecklist | "DEVUELTO";
type TamanoPagina = 20 | 50 | "TODOS";

const OPCIONES_PAGINA: TamanoPagina[] = [20, 50, "TODOS"];

/** Tarjeta compacta de una métrica: número grande + etiqueta, mismo patrón en todo el dashboard. */
function Tarjeta({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-[var(--atm-linea)] bg-zinc-50 px-4 py-3">
      <p className="text-2xl font-semibold text-zinc-900">{valor}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{etiqueta}</p>
    </div>
  );
}

/** Formulario de creación/edición de calificador, dentro del Modal. */
function FormularioUsuario({
  modo,
  usuario,
  guardando,
  error,
  onCrear,
  onEditar,
}: {
  modo: "crear" | "editar";
  usuario?: Usuario;
  guardando: boolean;
  error: string | null;
  onCrear: (datos: { nombre: string; apellido: string; correo: string; password: string }) => void;
  onEditar: (id: string, datos: { nombre: string; apellido: string; correo: string }) => void;
}) {
  // El API solo devuelve nombreCompleto — se separa por el primer espacio como punto de
  // partida para editar; si el nombre real tiene más de una palabra, el admin lo corrige acá.
  const [primerNombre, ...resto] = (usuario?.nombreCompleto ?? "").split(" ");
  const [nombre, setNombre] = useState(primerNombre ?? "");
  const [apellido, setApellido] = useState(resto.join(" "));
  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [password, setPassword] = useState("");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "crear") {
      onCrear({ nombre, apellido, correo, password });
    } else if (usuario) {
      onEditar(usuario.id, { nombre, apellido, correo });
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Apellido</span>
          <input
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">Correo (@grupoees.cl)</span>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          placeholder="nombre.apellido@grupoees.cl"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
        />
      </label>
      {modo === "crear" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Contraseña inicial (mín. 8 caracteres)</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="mt-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : modo === "crear" ? "Crear calificador" : "Guardar cambios"}
      </button>
    </form>
  );
}

interface ResumenMetricas {
  casosCerrados: number;
  tiempoActivoMedioMin: number;
  tiempoActivoMedianaMin: number;
  casosPorHora: number;
  aperturaCierreMedioHoras: number | null;
  numSesionesMedio: number;
  casosModificados: number;
  pctModificados: number;
  casosBloqueadosQa: number;
  pctBloqueadosQa: number;
}
interface GrupoMetricas extends ResumenMetricas {
  clave: string;
  etiqueta: string;
}
interface RespuestaMetricas {
  rango: { desde: string; hasta: string };
  global: ResumenMetricas;
  porCalificador: GrupoMetricas[];
  porVersionMotor: GrupoMetricas[];
  cohortes: { corte: string; antes: ResumenMetricas; desde: ResumenMetricas } | null;
}

const HOY_ISO = new Date().toISOString().slice(0, 10);
const HACE_90_ISO = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

/** Tabla de métricas por grupo (calificador o versión del motor). */
function TablaGrupos({ titulo, filas }: { titulo: string; filas: GrupoMetricas[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-zinc-500">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin datos en el rango seleccionado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--atm-linea)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--atm-th)] text-white">
              <tr>
                <th className="px-4 py-2 font-medium">{titulo.includes("motor") ? "Versión" : "Calificador"}</th>
                <th className="px-4 py-2 font-medium">Casos</th>
                <th className="px-4 py-2 font-medium">Min/caso (mediana)</th>
                <th className="px-4 py-2 font-medium">Casos/hora</th>
                <th className="px-4 py-2 font-medium">% modificados</th>
                <th className="px-4 py-2 font-medium">% bloq. QA</th>
                <th className="px-4 py-2 font-medium">Sesiones/caso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filas.map((f) => (
                <tr key={f.clave}>
                  <td className="px-4 py-3 text-zinc-700">{f.etiqueta}</td>
                  <td className="px-4 py-3 text-zinc-700">{f.casosCerrados}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {f.tiempoActivoMedioMin} <span className="text-zinc-400">({f.tiempoActivoMedianaMin})</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{f.casosPorHora}</td>
                  <td className="px-4 py-3 text-zinc-700">{f.pctModificados}%</td>
                  <td className="px-4 py-3 text-zinc-700">{f.pctBloqueadosQa}%</td>
                  <td className="px-4 py-3 text-zinc-500">{f.numSesionesMedio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Vista de métricas de productividad (Revisión 13). Todo sale de GET /api/metricas. */
function PanelMetricas({ calificadores }: { calificadores: Usuario[] }) {
  const [desde, setDesde] = useState(HACE_90_ISO);
  const [hasta, setHasta] = useState(HOY_ISO);
  const [calificador, setCalificador] = useState("");
  const [corte, setCorte] = useState("");
  const [datos, setDatos] = useState<RespuestaMetricas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const params = new URLSearchParams({ desde, hasta });
    if (calificador) params.set("calificador", calificador);
    if (corte) params.set("corte", corte);
    fetch(`/api/metricas?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json: RespuestaMetricas) => {
        if (!vivo) return;
        setDatos(json);
        setError(null);
      })
      .catch(() => {
        if (vivo) setError("No se pudieron cargar las métricas.");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [desde, hasta, calificador, corte]);

  const g = datos?.global;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--atm-linea)] bg-zinc-50 px-4 py-3 text-sm">
        <label className="flex flex-col gap-1 text-zinc-500">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700" />
        </label>
        <label className="flex flex-col gap-1 text-zinc-500">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700" />
        </label>
        <label className="flex flex-col gap-1 text-zinc-500">
          Calificador
          <select value={calificador} onChange={(e) => setCalificador(e.target.value)}
            className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700">
            <option value="">Todos</option>
            {calificadores.map((u) => (
              <option key={u.id} value={u.id}>{u.nombreCompleto}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-zinc-500">
          Cohorte (corte)
          <input type="date" value={corte} onChange={(e) => setCorte(e.target.value)}
            className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700" />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-zinc-500">Cargando métricas...</p>}

      {!cargando && g && (
        <>
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-500">
              Global · {datos!.rango.desde} a {datos!.rango.hasta}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tarjeta valor={g.casosCerrados} etiqueta="Casos resueltos" />
              <Tarjeta valor={g.casosPorHora} etiqueta="Casos por hora (tiempo activo)" />
              <Tarjeta valor={`${g.tiempoActivoMedioMin} min`} etiqueta="Tiempo medio por caso" />
              <Tarjeta valor={`${g.tiempoActivoMedianaMin} min`} etiqueta="Mediana por caso" />
              <Tarjeta
                valor={g.aperturaCierreMedioHoras !== null ? `${g.aperturaCierreMedioHoras} h` : "—"}
                etiqueta="Apertura → cierre (promedio)"
              />
              <Tarjeta valor={g.numSesionesMedio} etiqueta="Sesiones por caso" />
              <Tarjeta valor={`${g.pctModificados}%`} etiqueta={`Modificados (${g.casosModificados})`} />
              <Tarjeta valor={`${g.pctBloqueadosQa}%`} etiqueta={`Bloqueados por QA (${g.casosBloqueadosQa})`} />
            </div>
          </div>

          {datos!.cohortes && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-zinc-500">
                Comparación de cohortes · corte {datos!.cohortes.corte}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--atm-linea)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--atm-th)] text-white">
                    <tr>
                      <th className="px-4 py-2 font-medium">Cohorte</th>
                      <th className="px-4 py-2 font-medium">Casos</th>
                      <th className="px-4 py-2 font-medium">Casos/hora</th>
                      <th className="px-4 py-2 font-medium">Min/caso</th>
                      <th className="px-4 py-2 font-medium">% modificados</th>
                      <th className="px-4 py-2 font-medium">% bloq. QA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {([["Antes del corte", datos!.cohortes.antes], ["Desde el corte", datos!.cohortes.desde]] as const).map(
                      ([nombre, c]) => (
                        <tr key={nombre}>
                          <td className="px-4 py-3 text-zinc-700">{nombre}</td>
                          <td className="px-4 py-3 text-zinc-700">{c.casosCerrados}</td>
                          <td className="px-4 py-3 text-zinc-700">{c.casosPorHora}</td>
                          <td className="px-4 py-3 text-zinc-700">{c.tiempoActivoMedioMin}</td>
                          <td className="px-4 py-3 text-zinc-700">{c.pctModificados}%</td>
                          <td className="px-4 py-3 text-zinc-700">{c.pctBloqueadosQa}%</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <TablaGrupos titulo="Por calificador" filas={datos!.porCalificador} />
          <TablaGrupos titulo="Por versión del motor" filas={datos!.porVersionMotor} />

          <p className="text-xs text-zinc-400">
            El &quot;tiempo activo&quot; descarta los períodos de inactividad &gt; 3 min. Los casos anteriores
            a la Revisión 13 no tienen tiempo registrado y no aportan a los promedios.
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { sesion, cerrarSesion } = useSesion();
  const [vista, setVista] = useState<Vista>("dashboard");
  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [casoAVer, setCasoAVer] = useState<Caso | null>(null);

  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargandoCasos, setCargandoCasos] = useState(true);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);

  // Abre el modal con lo que ya hay en memoria (sin esperar), y en paralelo pide el detalle
  // real a /api/casos/[id] — ese endpoint es el que busca el analysis.json en Drive si todavía
  // no está cacheado. Sin esto, el admin viendo un caso por primera vez siempre se quedaba con
  // la ficha sintética, aunque el JSON real ya existiera en Drive.
  async function abrirCaso(c: Caso) {
    setCasoAVer(c);
    const respuesta = await fetch(`/api/casos/${c.id}`);
    if (!respuesta.ok) return;
    const casoActualizado: Caso = await respuesta.json();
    setCasoAVer(casoActualizado);
    setCasos((previos) => previos.map((p) => (p.id === c.id ? casoActualizado : p)));
  }

  useEffect(() => {
    fetch("/api/casos")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setCasos)
      .catch(() => setErrorCasos("No se pudieron cargar los casos."))
      .finally(() => setCargandoCasos(false));
  }, []);

  // Los calificadores salen de la tabla `usuarios` de Supabase, no de datos en memoria.
  function cargarUsuarios() {
    return fetch("/api/usuarios")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((datos) => {
        setListaUsuarios(datos);
        setErrorUsuarios(null);
      })
      .catch(() => setErrorUsuarios("No se pudieron cargar los calificadores."));
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const [modalUsuario, setModalUsuario] = useState<{ modo: "crear" | "editar"; usuario?: Usuario } | null>(
    null
  );
  const [errorFormUsuario, setErrorFormUsuario] = useState<string | null>(null);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

  async function crearUsuario(datos: { nombre: string; apellido: string; correo: string; password: string }) {
    setGuardandoUsuario(true);
    setErrorFormUsuario(null);
    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo crear el calificador.");
      await cargarUsuarios();
      setModalUsuario(null);
    } catch (error) {
      setErrorFormUsuario(error instanceof Error ? error.message : "No se pudo crear el calificador.");
    } finally {
      setGuardandoUsuario(false);
    }
  }

  async function editarUsuario(id: string, datos: { nombre: string; apellido: string; correo: string }) {
    setGuardandoUsuario(true);
    setErrorFormUsuario(null);
    try {
      const respuesta = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo editar el calificador.");
      await cargarUsuarios();
      setModalUsuario(null);
    } catch (error) {
      setErrorFormUsuario(error instanceof Error ? error.message : "No se pudo editar el calificador.");
    } finally {
      setGuardandoUsuario(false);
    }
  }

  async function cambiarActivoUsuario(id: string, activo: boolean) {
    try {
      const respuesta = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (!respuesta.ok) throw new Error();
      await cargarUsuarios();
    } catch {
      setErrorUsuarios(`No se pudo ${activo ? "reactivar" : "desactivar"} el usuario.`);
    }
  }

  const [filtroEstadoAdmin, setFiltroEstadoAdmin] = useState<FiltroEstadoAdmin>("TODOS");
  const [busquedaIdAdmin, setBusquedaIdAdmin] = useState("");
  const [tamanoPaginaAdmin, setTamanoPaginaAdmin] = useState<TamanoPagina>(20);
  const [paginaAdmin, setPaginaAdmin] = useState(1);

  const casosVisibles = useMemo(() => {
    const base =
      vista === "no-aptos"
        ? casos.filter((c) => c.estadoChecklist === "NO_APTO")
        : vista === "devueltos"
          ? casos.filter((c) => c.estadoCaso === "RECHAZADO_CALIFICADOR")
          : casos;
    const porEstado =
      filtroEstadoAdmin === "TODOS"
        ? base
        : filtroEstadoAdmin === "DEVUELTO"
          ? base.filter((c) => c.estadoCaso === "RECHAZADO_CALIFICADOR")
          : base.filter((c) => c.estadoChecklist === filtroEstadoAdmin);
    return busquedaIdAdmin.trim()
      ? porEstado.filter((c) => c.idTramite.includes(busquedaIdAdmin.trim()))
      : porEstado;
  }, [casos, vista, filtroEstadoAdmin, busquedaIdAdmin]);

  const totalPaginasAdmin =
    tamanoPaginaAdmin === "TODOS" ? 1 : Math.max(1, Math.ceil(casosVisibles.length / tamanoPaginaAdmin));
  const paginaActualAdmin = Math.min(paginaAdmin, totalPaginasAdmin);
  const casosVisiblesPagina = useMemo(() => {
    if (tamanoPaginaAdmin === "TODOS") return casosVisibles;
    const inicio = (paginaActualAdmin - 1) * tamanoPaginaAdmin;
    return casosVisibles.slice(inicio, inicio + tamanoPaginaAdmin);
  }, [casosVisibles, tamanoPaginaAdmin, paginaActualAdmin]);

  function cambiarVista(nueva: Vista) {
    setVista(nueva);
    setFiltroEstadoAdmin("TODOS");
    setPaginaAdmin(1);
  }

  function cambiarFiltroEstadoAdmin(nuevo: FiltroEstadoAdmin) {
    setFiltroEstadoAdmin(nuevo);
    setPaginaAdmin(1);
  }

  function cambiarBusquedaIdAdmin(nuevo: string) {
    setBusquedaIdAdmin(nuevo);
    setPaginaAdmin(1);
  }

  function cambiarTamanoPaginaAdmin(nuevo: TamanoPagina) {
    setTamanoPaginaAdmin(nuevo);
    setPaginaAdmin(1);
  }

  const calificadores = listaUsuarios.filter((u) => u.rol === "CALIFICADOR");

  // Todo el dashboard sale de lo que ya trae /api/casos — nada de endpoints nuevos.
  const metricas = useMemo(() => {
    const calificados = casos.filter((c) => c.estadoCalificacion === "CALIFICADO");
    const modificados = calificados.filter((c) => c.propuesta.modificadoPorCalificador);
    const confirmados = calificados.length - modificados.length;

    const diferencias = modificados
      .filter((c) => c.propuesta.porcentajeIvadecIA !== null)
      .map((c) => (c.propuesta.porcentajeFinal ?? 0) - (c.propuesta.porcentajeIvadecIA as number))
      .filter((d) => Number.isFinite(d));
    const diferenciaPromedio =
      diferencias.length > 0 ? diferencias.reduce((a, b) => a + b, 0) / diferencias.length : 0;

    const porEstado = {
      APTO: casos.filter((c) => c.estadoChecklist === "APTO").length,
      REQUIERE_REVISION: casos.filter((c) => c.estadoChecklist === "REQUIERE_REVISION").length,
      NO_APTO: casos.filter((c) => c.estadoChecklist === "NO_APTO").length,
    };

    // "Bandeja" = lo que el calificador realmente ve y tiene que trabajar: casos asignados
    // que no son NO_APTO (esos van solo a admin). "Resueltos" = calificados o devueltos como
    // no evaluables. "Pendientes" = lo que le falta hacer AHORA.
    const porCalificador = new Map<
      string,
      { nombre: string; bandeja: number; resueltos: number; pendientes: number }
    >();
    for (const c of casos) {
      if (!c.calificadorAsignadoId || !c.calificadorNombre) continue;
      if (c.estadoChecklist === "NO_APTO") continue;
      const fila = porCalificador.get(c.calificadorAsignadoId) ?? {
        nombre: c.calificadorNombre,
        bandeja: 0,
        resueltos: 0,
        pendientes: 0,
      };
      fila.bandeja += 1;
      const resuelto = c.estadoCalificacion === "CALIFICADO" || c.estadoCaso === "RECHAZADO_CALIFICADOR";
      if (resuelto) fila.resueltos += 1;
      else fila.pendientes += 1;
      porCalificador.set(c.calificadorAsignadoId, fila);
    }
    const rankingCalificadores = [...porCalificador.values()].sort((a, b) => b.pendientes - a.pendientes);

    return {
      total: casos.length,
      calificados: calificados.length,
      pendientes: casos.length - calificados.length,
      confirmados,
      modificados: modificados.length,
      diferenciaPromedio,
      porEstado,
      rankingCalificadores,
    };
  }, [casos]);

  // Crear, editar y desactivar calificadores necesitan endpoints que todavía no existen
  // (POST/PATCH /api/usuarios). Hasta entonces la pestaña es de sólo lectura: escribir en
  // memoria daría la impresión de haber guardado algo que la base nunca recibió.
  return (
    <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
      <header className="flex items-center justify-between border-b border-[var(--atm-linea)] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Panel administrador</h1>
          <p className="text-sm text-zinc-500">{sesion.nombreCompleto} · Admin</p>
        </div>
        <button
          onClick={() => cerrarSesion()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex gap-1 border-b border-[var(--atm-linea)] px-6 pt-3">
        {(
          [
            ["dashboard", "Dashboard"],
            ["todos", "Todos los casos"],
            ["no-aptos", "No aptos"],
            ["devueltos", "Devueltos"],
            ["metricas", "Métricas"],
            ["calificadores", "Calificadores"],
          ] as [Vista, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => cambiarVista(valor)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              vista === valor
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-6 py-6">
        {vista === "dashboard" ? (
          cargandoCasos ? (
            <p className="text-sm text-zinc-500">Cargando métricas...</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="mb-3 text-sm font-medium text-zinc-500">General</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Tarjeta valor={metricas.total} etiqueta="Casos en la base" />
                  <Tarjeta valor={metricas.calificados} etiqueta="Calificados" />
                  <Tarjeta valor={metricas.pendientes} etiqueta="Pendientes" />
                  <Tarjeta valor={metricas.porEstado.NO_APTO} etiqueta="No aptos" />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-zinc-500">
                  Propuesta sugerida vs. decisión del calificador
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Tarjeta valor={metricas.confirmados} etiqueta="Confirmados tal cual" />
                  <Tarjeta valor={metricas.modificados} etiqueta="Modificados por calificador" />
                  <Tarjeta
                    valor={
                      metricas.calificados > 0
                        ? `${Math.round((metricas.modificados / metricas.calificados) * 100)}%`
                        : "—"
                    }
                    etiqueta="% de casos modificados"
                  />
                  <Tarjeta
                    valor={`${metricas.diferenciaPromedio >= 0 ? "+" : ""}${metricas.diferenciaPromedio.toFixed(1)} pts`}
                    etiqueta="Diferencia promedio (modificados)"
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-zinc-500">Checklist de admisibilidad</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Tarjeta valor={metricas.porEstado.APTO} etiqueta="Apto" />
                  <Tarjeta valor={metricas.porEstado.REQUIERE_REVISION} etiqueta="Requiere revisión" />
                  <Tarjeta valor={metricas.porEstado.NO_APTO} etiqueta="No apto" />
                  <Tarjeta
                    valor={casos.filter((c) => c.calificadorAsignadoId).length}
                    etiqueta="Con calificador asignado"
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-zinc-500">Calificadores por carga de trabajo</h2>
                {metricas.rankingCalificadores.length === 0 ? (
                  <p className="text-sm text-zinc-400">Todavía no hay casos asignados.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--atm-th)] text-white">
                        <tr>
                          <th className="px-4 py-2 font-medium">Calificador</th>
                          <th className="px-4 py-2 font-medium">En bandeja</th>
                          <th className="px-4 py-2 font-medium">Pendientes ahora</th>
                          <th className="px-4 py-2 font-medium">Resueltos</th>
                          <th className="px-4 py-2 font-medium">Avance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {metricas.rankingCalificadores.map((fila) => (
                          <tr key={fila.nombre}>
                            <td className="px-4 py-3 text-zinc-700">{fila.nombre}</td>
                            <td className="px-4 py-3 text-zinc-700">{fila.bandeja}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  fila.pendientes > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {fila.pendientes}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700">{fila.resueltos}</td>
                            <td className="px-4 py-3 text-zinc-500">
                              {fila.bandeja > 0 ? Math.round((fila.resueltos / fila.bandeja) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        ) : vista === "metricas" ? (
          <PanelMetricas calificadores={calificadores} />
        ) : vista === "calificadores" ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-500">
                {calificadores.length} calificador{calificadores.length === 1 ? "" : "es"}
              </h2>
              <button
                onClick={() => setModalUsuario({ modo: "crear" })}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                + Nuevo calificador
              </button>
            </div>

            {errorUsuarios && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorUsuarios}</p>
            )}

            <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--atm-th)] text-white">
                  <tr>
                    <th className="px-4 py-2 font-medium">Nombre</th>
                    <th className="px-4 py-2 font-medium">Correo</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {calificadores.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-zinc-700">{u.nombreCompleto}</td>
                      <td className="px-4 py-3 text-zinc-700">{u.correo}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.activo ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModalUsuario({ modo: "editar", usuario: u })}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                          >
                            Editar
                          </button>
                          {u.activo ? (
                            <button
                              onClick={() => cambiarActivoUsuario(u.id, false)}
                              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => cambiarActivoUsuario(u.id, true)}
                              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {calificadores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                        Aún no hay calificadores creados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="border-t border-[var(--atm-linea)] bg-zinc-50 px-4 py-2 text-xs text-zinc-400">
                Un calificador nunca se elimina de la base de datos, sólo se desactiva.
              </p>
            </div>
          </div>
        ) : cargandoCasos ? (
          <p className="text-sm text-zinc-500">Cargando casos...</p>
        ) : errorCasos ? (
          <p className="text-sm text-red-600">{errorCasos}</p>
        ) : (
          <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-zinc-500">
              {casosVisibles.length} caso{casosVisibles.length === 1 ? "" : "s"}
            </h2>

            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5 text-zinc-500">
                Buscar ID
                <input
                  type="text"
                  value={busquedaIdAdmin}
                  onChange={(e) => cambiarBusquedaIdAdmin(e.target.value)}
                  placeholder="ID Trámite"
                  className="w-32 rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                />
              </label>
              {vista === "todos" && (
                <label className="flex items-center gap-1.5 text-zinc-500">
                  Estado
                  <select
                    value={filtroEstadoAdmin}
                    onChange={(e) => cambiarFiltroEstadoAdmin(e.target.value as FiltroEstadoAdmin)}
                    className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="APTO">Apto</option>
                    <option value="REQUIERE_REVISION">Requiere revisión</option>
                    <option value="NO_APTO">No apto</option>
                    <option value="DEVUELTO">Devuelto</option>
                  </select>
                </label>
              )}
              <label className="flex items-center gap-1.5 text-zinc-500">
                Mostrar
                <select
                  value={tamanoPaginaAdmin}
                  onChange={(e) =>
                    cambiarTamanoPaginaAdmin(
                      e.target.value === "TODOS" ? "TODOS" : (Number(e.target.value) as TamanoPagina)
                    )
                  }
                  className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                >
                  {OPCIONES_PAGINA.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion === "TODOS" ? "Todos" : opcion}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--atm-th)] text-white">
                <tr>
                  <th className="px-4 py-2 font-medium">ID Trámite</th>
                  <th className="px-4 py-2 font-medium">Región</th>
                  <th className="px-4 py-2 font-medium">RUT</th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Flujo</th>
                  <th className="px-4 py-2 font-medium">Calificador</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {casosVisiblesPagina.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-zinc-700">{c.idTramite}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.region}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.rut}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.nombreCompleto}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeEstado[c.estadoChecklist]}`}>
                        {labelEstado[c.estadoChecklist]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.estadoCaso === "RECHAZADO_CALIFICADOR"
                            ? "bg-pink-100 text-pink-700"
                            : c.estadoCalificacion === "CALIFICADO"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {etiquetaFlujo(c.estadoCaso)}
                      </span>
                      {c.propuesta.porcentajeFinal !== null && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {c.propuesta.porcentajeFinal}%
                          {c.propuesta.modificadoPorCalificador ? " (modificado)" : " (confirmado)"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{c.calificadorNombre ?? "Sin asignar"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => abrirCaso(c)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        Ver caso
                      </button>
                    </td>
                  </tr>
                ))}
                {casosVisiblesPagina.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                      No hay casos en esta vista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {tamanoPaginaAdmin !== "TODOS" && casosVisibles.length > tamanoPaginaAdmin && (
            <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
              <p>
                Mostrando {(paginaActualAdmin - 1) * tamanoPaginaAdmin + 1}–
                {Math.min(paginaActualAdmin * tamanoPaginaAdmin, casosVisibles.length)} de {casosVisibles.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaAdmin((p) => Math.max(1, p - 1))}
                  disabled={paginaActualAdmin === 1}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPaginaAdmin((p) => Math.min(totalPaginasAdmin, p + 1))}
                  disabled={paginaActualAdmin === totalPaginasAdmin}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </main>

      {casoAVer && (
        <Modal
          titulo={`Caso ${casoAVer.idTramite} · ${casoAVer.nombreCompleto}`}
          onCerrar={() => setCasoAVer(null)}
          ancho="xl"
          sinPadding
        >
          <div className="grid gap-4 border-b border-[var(--atm-linea)] px-5 py-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-400">RUT</p>
              <p className="text-zinc-800">{casoAVer.rut}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Región</p>
              <p className="text-zinc-800">{casoAVer.region}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Calificador asignado</p>
              <p className="text-zinc-800">{casoAVer.calificadorNombre ?? "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Estado del flujo</p>
              <p className="text-zinc-800">{etiquetaFlujo(casoAVer.estadoCaso)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">% de la propuesta sugerida</p>
              <p className="text-zinc-800">{casoAVer.propuesta.porcentajeIvadecIA}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">% final del calificador</p>
              <p className="text-zinc-800">
                {casoAVer.propuesta.porcentajeFinal !== null
                  ? `${casoAVer.propuesta.porcentajeFinal}%${
                      casoAVer.propuesta.modificadoPorCalificador ? " (modificado)" : " (confirmado)"
                    }`
                  : "Pendiente"}
              </p>
            </div>
          </div>

          {casoAVer.estadoChecklist === "NO_APTO" && (
            <div className="border-b border-[var(--atm-linea)] bg-red-50 px-5 py-3 text-sm text-red-700">
              Caso NO APTO — visible solo para administración. El calificador no lo ve en ninguna vista.
            </div>
          )}

          <div className="border-b border-[var(--atm-linea)] px-5 py-4">
            <h2 className="mb-3 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
              Propuesta de calificación sugerida
            </h2>
            <TablaComparativaIdis caso={casoAVer} />
          </div>

          {casoAVer.resolucion && <ResolucionRegistrada caso={casoAVer} />}

          {casoAVer.analisis ? (
            <FichaEditable
              analisis={casoAVer.analisis}
              casoId={casoAVer.id}
              editable={false}
              documentos={casoAVer.propuesta.documentos}
              fichaEditada={casoAVer.fichaEditada}
            />
          ) : (
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
                Documentos del expediente
              </p>
              <DocumentosExpediente documentos={casoAVer.propuesta.documentos} />
              <p className="mt-4 text-sm text-zinc-500">Todavía no hay ficha QA cargada para este trámite.</p>
            </div>
          )}
        </Modal>
      )}

      {modalUsuario && (
        <Modal
          titulo={modalUsuario.modo === "crear" ? "Nuevo calificador" : `Editar ${modalUsuario.usuario?.nombreCompleto}`}
          onCerrar={() => {
            setModalUsuario(null);
            setErrorFormUsuario(null);
          }}
        >
          <FormularioUsuario
            modo={modalUsuario.modo}
            usuario={modalUsuario.usuario}
            guardando={guardandoUsuario}
            error={errorFormUsuario}
            onCrear={crearUsuario}
            onEditar={editarUsuario}
          />
        </Modal>
      )}

    </div>
  );
}
