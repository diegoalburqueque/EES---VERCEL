"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Sesion } from "@/lib/auth";

interface SesionContexto {
  sesion: Sesion;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<SesionContexto | null>(null);

export function SesionProvider({ sesion, children }: { sesion: Sesion; children: ReactNode }) {
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Contexto.Provider value={{ sesion, cerrarSesion }}>{children}</Contexto.Provider>
  );
}

export function useSesion(): SesionContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useSesion debe usarse dentro de un SesionProvider");
  }
  return contexto;
}
