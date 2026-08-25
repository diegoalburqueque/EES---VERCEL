import type { ReactNode } from "react";
import { exigirSesion } from "@/lib/session-server";
import { SesionProvider } from "@/components/SesionProvider";
import { CasosProvider } from "@/components/CasosProvider";

export default async function CalificadorLayout({ children }: { children: ReactNode }) {
  const sesion = await exigirSesion("CALIFICADOR");
  return (
    <SesionProvider sesion={sesion}>
      <CasosProvider>{children}</CasosProvider>
    </SesionProvider>
  );
}
