"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesion } from "@/components/SesionProvider";
import { rolParaFirma } from "@/lib/profesion-firma"; // NOMBRE_GENERO

export function CalificadorHeader() {
  const { sesion, cerrarSesion } = useSesion();
  const pathname = usePathname();

  const pestañas = [
    { href: "/calificador", etiqueta: "Mis casos" },
    { href: "/calificador/historico", etiqueta: "Histórico" },
  ];

  return (
    <>
      <header className="flex items-center justify-between border-b border-[var(--atm-linea)] bg-white px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Plataforma de Calificación</h1>
          {/* NOMBRE_GENERO — "Calificador" / "Calificadora" según el nombre. */}
          <p className="text-sm text-zinc-500">
            {sesion.nombreCompleto} · {rolParaFirma(sesion.nombreCompleto, sesion.rol)}
          </p>
        </div>
        <button
          onClick={() => cerrarSesion()}
          className="rounded-lg border border-[var(--atm-azul2)] px-3 py-1.5 text-sm font-medium text-[var(--atm-azul)] hover:bg-blue-50"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex gap-1 border-b border-[var(--atm-linea)] bg-white px-6 pt-3">
        {pestañas.map((p) => {
          const activa = p.href === "/calificador" ? pathname === "/calificador" : pathname.startsWith(p.href);
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                activa
                  ? "border-b-2 border-[var(--atm-azul2)] text-[var(--atm-azul)]"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {p.etiqueta}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
