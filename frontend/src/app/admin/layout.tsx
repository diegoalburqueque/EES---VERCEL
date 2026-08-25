import type { ReactNode } from "react";
import { exigirSesion } from "@/lib/session-server";
import { SesionProvider } from "@/components/SesionProvider";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sesion = await exigirSesion("ADMIN");
  return <SesionProvider sesion={sesion}>{children}</SesionProvider>;
}
