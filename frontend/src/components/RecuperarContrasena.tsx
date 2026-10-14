"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import type { Usuario } from "@/data/usuarios";

/**
 * Recuperación de la contraseña de un CALIFICADOR (solo panel ADMIN).
 *
 * El descifrado ocurre en el servidor (POST /api/usuarios/[id]/credencial, route handler de
 * Vercel, AES-256-GCM); el navegador nunca ve la clave de cifrado.
 * La contraseña vive solo en el estado de este modal: no se guarda en localStorage, no se
 * registra en consola y se borra al cerrar o a los 60 s. Cada apertura vuelve a pedirla al
 * servidor, así que cada lectura queda auditada.
 */

const SEGUNDOS_VISIBLE = 60;

export function RecuperarContrasena({ calificador, onCerrar }: { calificador: Usuario; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(SEGUNDOS_VISIBLE);

  // Cuenta regresiva: al llegar a 0 se cierra el modal (se desmonta y la contraseña desaparece).
  useEffect(() => {
    if (!password) return;
    const t = setTimeout(() => {
      if (restante <= 1) onCerrar();
      else setRestante(restante - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [password, restante, onCerrar]);

  function cerrar() {
    setPassword(null);
    onCerrar();
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await fetch(`/api/usuarios/${calificador.id}/credencial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
        cache: "no-store",
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || typeof datos.password !== "string") {
        setError(datos.error ?? "No se pudo recuperar la contraseña.");
        return;
      }
      setPassword(datos.password);
      setRestante(SEGUNDOS_VISIBLE);
    } finally {
      setCargando(false);
    }
  }

  async function copiar() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar. Muestra la contraseña y cópiala a mano.");
    }
  }

  return (
    <Modal titulo={`Recuperar contraseña · ${calificador.nombreCompleto}`} onCerrar={cerrar}>
      {password === null ? (
        <form onSubmit={recuperar} className="flex flex-col gap-3 text-sm">
          <p className="text-zinc-600">
            Esta acción queda registrada con tu usuario, la fecha, la IP y el motivo.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Motivo (mínimo 10 caracteres)</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              minLength={10}
              rows={3}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="flex items-start gap-2 text-zinc-700">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="mt-0.5" />
            Confirmo que estoy autorizado para ver la contraseña de este calificador.
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={cargando || !confirmado || motivo.trim().length < 10}
            className="rounded-lg bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {cargando ? "Recuperando..." : "Recuperar contraseña"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <input
              readOnly
              type={visible ? "text" : "password"}
              value={password}
              autoComplete="off"
              aria-label="Contraseña recuperada"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 font-mono text-zinc-900"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="rounded-lg border border-zinc-300 px-2.5 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              onClick={copiar}
              className="rounded-lg bg-zinc-900 px-2.5 py-2 text-xs font-medium text-white hover:bg-zinc-700"
            >
              {copiado ? "Copiada" : "Copiar"}
            </button>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>}
          <p className="text-xs text-zinc-500">
            Se borrará de la pantalla en {restante} s. Para verla de nuevo hay que recuperarla otra vez (y queda auditado).
          </p>
          <button type="button" onClick={cerrar} className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50">
            Cerrar
          </button>
        </div>
      )}
    </Modal>
  );
}
