"use client";

import { useEffect } from "react";

const INTERVALO_MS = 45_000; // cada cuánto se manda un LATIDO con la pestaña visible

/**
 * Métricas de productividad (Revisión 13): registra cuánto tiempo real dedica el
 * calificador a un caso. Manda INICIO al montar, LATIDO periódico mientras la pestaña
 * está visible, y PAUSA al ocultarla o cerrarla. El servidor pone todas las marcas de
 * tiempo (ver /api/casos/[id]/revision/latido) — acá solo se declara el tipo de evento.
 *
 * @param casoId  id del caso en revisión
 * @param activo  true solo cuando el caso es propio, sin resolver y visible en pantalla
 */
export function useRevisionTracker(casoId: string | undefined, activo: boolean) {
  useEffect(() => {
    if (!casoId || !activo) return;
    const url = `/api/casos/${casoId}/revision/latido`;

    const enviar = (evento: "INICIO" | "LATIDO" | "PAUSA", preferBeacon = false) => {
      const body = JSON.stringify({ evento });
      if (preferBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
      }
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    enviar("INICIO");

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") enviar("LATIDO");
    }, INTERVALO_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") enviar("LATIDO");
      else enviar("PAUSA", true);
    };
    const onHide = () => enviar("PAUSA", true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      enviar("PAUSA", true); // al desmontar (navegó a otra vista) también se pausa
    };
  }, [casoId, activo]);
}
