"use client";

import { useState, type FormEvent } from "react";

export interface DatosFormularioCalificador {
  nombreCompleto: string;
  correo: string;
  password: string;
}

interface FormularioCalificadorProps {
  valoresIniciales?: DatosFormularioCalificador;
  esEdicion?: boolean;
  onGuardar: (datos: DatosFormularioCalificador) => void;
  onCancelar: () => void;
}

export function FormularioCalificador({
  valoresIniciales,
  esEdicion = false,
  onGuardar,
  onCancelar,
}: FormularioCalificadorProps) {
  const [nombreCompleto, setNombreCompleto] = useState(valoresIniciales?.nombreCompleto ?? "");
  const [correo, setCorreo] = useState(valoresIniciales?.correo ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!nombreCompleto.trim() || !correo.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    if (!esEdicion && password.trim().length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    onGuardar({
      nombreCompleto: nombreCompleto.trim(),
      correo: correo.trim(),
      password: password.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Nombre completo</label>
        <input
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          placeholder="Nombre y apellido"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Correo</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="nombre@grupoees.cl"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">
          Contraseña {esEdicion && <span className="font-normal text-zinc-400">(dejar en blanco para no cambiarla)</span>}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {esEdicion ? "Guardar cambios" : "Crear calificador"}
        </button>
      </div>
    </form>
  );
}
