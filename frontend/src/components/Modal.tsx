"use client";

import { type ReactNode } from "react";

interface ModalProps {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /** "md" (por defecto) para formularios; "xl" para fichas largas con scroll propio. */
  ancho?: "md" | "xl";
  /** El contenido trae su propio padding (p. ej. las secciones de la ficha QA). */
  sinPadding?: boolean;
}

export function Modal({ titulo, onCerrar, children, ancho = "md", sinPadding = false }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div
        className={`flex max-h-full w-full flex-col rounded-xl border border-[var(--atm-linea)] bg-white shadow-lg ${
          ancho === "xl" ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--atm-linea)] px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
        <div className={`overflow-y-auto ${sinPadding ? "" : "px-5 py-4"}`}>{children}</div>
      </div>
    </div>
  );
}
