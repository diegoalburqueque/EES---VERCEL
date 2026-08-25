"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesion } from "@/components/SesionProvider";

export function CalificadorHeader() {
  const { sesion, cerrarSesion } = useSesion();
  const pathname = usePathname();

  const pestañas = [
    { href: "/calificador", etiqueta: "Mis casos" },
    { href: "/calificador/historico", etiqueta: "Histórico" },
  ];

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Motor de Calificación</h1>
          <p className="text-sm text-zinc-500">{sesion.nombreCompleto} · Calificador</p>
        </div>
        <button
          onClick={() => cerrarSesion()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex gap-1 border-b border-zinc-200 px-6 pt-3">
        {pestañas.map((p) => {
          const activa = p.href === "/calificador" ? pathname === "/calificador" : pathname.startsWith(p.href);
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                activa ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
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
