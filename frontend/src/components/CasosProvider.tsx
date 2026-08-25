"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Caso } from "@/data/casos";

interface CasosContexto {
  casos: Caso[];
  cargando: boolean;
  error: string | null;
  confirmarPropuesta: (id: string) => Promise<void>;
  modificarYCalificar: (id: string, porcentajeFinal: number) => Promise<void>;
  /** Persiste la ficha editada en `casos.ficha_editada` (ver /api/casos/[id]/ficha). */
  guardarFicha: (id: string, valores: Record<string, string>) => Promise<void>;
  recargar: () => Promise<void>;
  /**
   * Pide el detalle de un caso puntual a /api/casos/[id] y lo reemplaza en la lista.
   * Ese endpoint es el que resuelve el analysis.json real desde Drive si todavía falta
   * (cache-on-read) — llamarlo al abrir un caso es lo que dispara esa resolución.
   */
  cargarDetalleCaso: (id: string) => Promise<void>;
}

const Contexto = createContext<CasosContexto | null>(null);

export function CasosProvider({ children }: { children: ReactNode }) {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/casos");
      if (!respuesta.ok) throw new Error("No se pudieron cargar los casos.");
      setCasos(await respuesta.json());
    } catch {
      setError("No se pudieron cargar los casos. Intenta recargar la página.");
    } finally {
      setCargando(false);
    }
  }

  // Carga inicial contra /api/casos; el estado lo actualiza `recargar` al responder el fetch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    recargar();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function confirmarPropuesta(id: string) {
    const respuesta = await fetch(`/api/casos/${id}/confirmar`, { method: "POST" });
    if (!respuesta.ok) throw new Error("No se pudo confirmar el caso.");
    await recargar();
  }

  async function modificarYCalificar(id: string, porcentajeFinal: number) {
    const respuesta = await fetch(`/api/casos/${id}/modificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ porcentajeFinal }),
    });
    if (!respuesta.ok) throw new Error("No se pudo guardar la calificación.");
    await recargar();
  }

  async function guardarFicha(id: string, valores: Record<string, string>) {
    const respuesta = await fetch(`/api/casos/${id}/ficha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valores }),
    });
    if (!respuesta.ok) throw new Error("No se pudo guardar la ficha editada.");
  }

  // useCallback con deps [] para que la referencia se mantenga estable entre renders: la
  // página del detalle la usa dentro de un useEffect, y una referencia nueva en cada render
  // dispararía el fetch en loop.
  const cargarDetalleCaso = useCallback(async (id: string) => {
    const respuesta = await fetch(`/api/casos/${id}`);
    if (!respuesta.ok) return;
    const casoActualizado: Caso = await respuesta.json();
    setCasos((previos) => previos.map((c) => (c.id === id ? casoActualizado : c)));
  }, []);

  return (
    <Contexto.Provider
      value={{ casos, cargando, error, confirmarPropuesta, modificarYCalificar, guardarFicha, recargar, cargarDetalleCaso }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useCasos(): CasosContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useCasos debe usarse dentro de un CasosProvider");
  }
  return contexto;
}
