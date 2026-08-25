"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/components/SesionProvider";
import { type Caso, type EstadoChecklist } from "@/data/casos";
import { type Usuario } from "@/data/usuarios";
import { Modal } from "@/components/Modal";
import { FichaEditable } from "@/components/FichaEditable";

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

type Vista = "dashboard" | "todos" | "no-aptos" | "calificadores";
type FiltroEstadoAdmin = "TODOS" | EstadoChecklist;
type TamanoPagina = 20 | 50 | "TODOS";

const OPCIONES_PAGINA: TamanoPagina[] = [20, 50, "TODOS"];

/** Tarjeta compacta de una métrica: número grande + etiqueta, mismo patrón en todo el dashboard. */
function Tarjeta({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
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
  const [tamanoPaginaAdmin, setTamanoPaginaAdmin] = useState<TamanoPagina>(20);
  const [paginaAdmin, setPaginaAdmin] = useState(1);

  const casosVisibles = useMemo(() => {
    const base = vista === "no-aptos" ? casos.filter((c) => c.estadoChecklist === "NO_APTO") : casos;
    return filtroEstadoAdmin === "TODOS" ? base : base.filter((c) => c.estadoChecklist === filtroEstadoAdmin);
  }, [casos, vista, filtroEstadoAdmin]);

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
      .map((c) => (c.propuesta.porcentajeFinal ?? 0) - c.propuesta.porcentajeIvadecIA)
      .filter((d) => Number.isFinite(d));
    const diferenciaPromedio =
      diferencias.length > 0 ? diferencias.reduce((a, b) => a + b, 0) / diferencias.length : 0;

    const porEstado = {
      APTO: casos.filter((c) => c.estadoChecklist === "APTO").length,
      REQUIERE_REVISION: casos.filter((c) => c.estadoChecklist === "REQUIERE_REVISION").length,
      NO_APTO: casos.filter((c) => c.estadoChecklist === "NO_APTO").length,
    };

    const porCalificador = new Map<string, { nombre: string; asignados: number; calificados: number }>();
    for (const c of casos) {
      if (!c.calificadorAsignadoId || !c.calificadorNombre) continue;
      const fila = porCalificador.get(c.calificadorAsignadoId) ?? {
        nombre: c.calificadorNombre,
        asignados: 0,
        calificados: 0,
      };
      fila.asignados += 1;
      if (c.estadoCalificacion === "CALIFICADO") fila.calificados += 1;
      porCalificador.set(c.calificadorAsignadoId, fila);
    }
    const rankingCalificadores = [...porCalificador.values()].sort((a, b) => b.asignados - a.asignados);

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
    <div className="flex flex-1 flex-col bg-white">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
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

      <nav className="flex gap-1 border-b border-zinc-200 px-6 pt-3">
        {(
          [
            ["dashboard", "Dashboard"],
            ["todos", "Todos los casos"],
            ["no-aptos", "No aptos"],
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
                  Propuesta IA vs. decisión del calificador
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Tarjeta valor={metricas.confirmados} etiqueta="Confirmados tal cual (IA)" />
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
                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Calificador</th>
                          <th className="px-4 py-2 font-medium">Asignados</th>
                          <th className="px-4 py-2 font-medium">Calificados</th>
                          <th className="px-4 py-2 font-medium">Avance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {metricas.rankingCalificadores.map((fila) => (
                          <tr key={fila.nombre}>
                            <td className="px-4 py-3 text-zinc-700">{fila.nombre}</td>
                            <td className="px-4 py-3 text-zinc-700">{fila.asignados}</td>
                            <td className="px-4 py-3 text-zinc-700">{fila.calificados}</td>
                            <td className="px-4 py-3 text-zinc-500">
                              {Math.round((fila.calificados / fila.asignados) * 100)}%
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

            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
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
              <p className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-400">
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
              {vista === "todos" && (
                <label className="flex items-center gap-1.5 text-zinc-500">
                  Estado
                  <select
                    value={filtroEstadoAdmin}
                    onChange={(e) => cambiarFiltroEstadoAdmin(e.target.value as FiltroEstadoAdmin)}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-700 outline-none focus:border-zinc-900"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="APTO">Apto</option>
                    <option value="REQUIERE_REVISION">Requiere revisión</option>
                    <option value="NO_APTO">No apto</option>
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
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-700 outline-none focus:border-zinc-900"
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

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
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
                          c.estadoCalificacion === "CALIFICADO"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {c.estadoCaso.replace(/_/g, " ")}
                      </span>
                      {c.estadoCalificacion === "CALIFICADO" && (
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
          <div className="grid gap-4 border-b border-zinc-200 px-5 py-4 text-sm sm:grid-cols-2">
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
              <p className="text-zinc-800">{casoAVer.estadoCaso.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">% propuesto por el motor</p>
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
            <div className="border-b border-zinc-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              Caso NO APTO — visible solo para administración. El calificador no lo ve en ninguna vista.
            </div>
          )}

          {casoAVer.analisis ? (
            <FichaEditable analisis={casoAVer.analisis} casoId={casoAVer.id} editable={false} />
          ) : (
            <p className="px-5 py-4 text-sm text-zinc-500">
              Todavía no hay ficha QA cargada para este trámite.
            </p>
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
