"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [altoContraste, setAltoContraste] = useState(false);
  const [escalaTexto, setEscalaTexto] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    // La autenticación propia de la plataforma se mantiene en el servidor.
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rut, password }),
    });

    if (!respuesta.ok) {
      const { error: mensaje } = await respuesta.json();
      setError(mensaje ?? "No se pudo iniciar sesión.");
      setCargando(false);
      return;
    }

    const { redirigirA } = await respuesta.json();
    router.push(redirigirA);
    router.refresh();
  }

  const fondo = altoContraste ? "bg-black text-white" : "bg-white text-zinc-900";
  const panel = altoContraste
    ? "border-white bg-black"
    : "border-[#333333] bg-white";

  return (
    <div className={`flex min-h-screen flex-col ${fondo}`}>
      <main className={`flex flex-1 items-start justify-center px-4 pb-12 pt-3 sm:pt-3 ${altoContraste ? "bg-black" : "bg-white"}`}>
        <section
          aria-labelledby="login-titulo"
          className={`relative w-full max-w-[570px] border px-6 pb-10 pt-5 sm:px-6 ${panel}`}
          style={{ fontSize: String(100 + escalaTexto * 10) + "%" }}
        >
          <div aria-hidden="true" className="absolute left-0 top-0 flex h-[7px] w-full">
            <span className="ml-[6%] w-[11%] bg-[#006fb9]" />
            <span className="w-[19%] bg-[#ef3340]" />
          </div>

          <header className="flex min-h-12 items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 font-sans text-[#3569b8]">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-sm font-bold">
                E
              </span>
              <span className="text-lg font-medium tracking-tight">ClaveUnica</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5" aria-label="Opciones de accesibilidad">
              <button
                type="button"
                onClick={() => setAltoContraste((actual) => !actual)}
                aria-label={altoContraste ? "Desactivar alto contraste" : "Activar alto contraste"}
                aria-pressed={altoContraste}
                className={`h-[38px] min-w-[38px] border text-lg leading-none ${altoContraste ? "border-white text-white" : "border-[#333] text-[#333]"}`}
              >
                ◐
              </button>
              <button
                type="button"
                onClick={() => setEscalaTexto((actual) => Math.max(-1, actual - 1))}
                aria-label="Disminuir tamaño del texto"
                className={`h-[38px] min-w-[38px] border text-xs ${altoContraste ? "border-white text-white" : "border-[#333] text-[#333]"}`}
              >
                A−
              </button>
              <button
                type="button"
                onClick={() => setEscalaTexto((actual) => Math.min(2, actual + 1))}
                aria-label="Aumentar tamaño del texto"
                className={`h-[38px] min-w-[38px] border text-sm font-semibold ${altoContraste ? "border-white text-white" : "border-[#333] text-[#333]"}`}
              >
                A+
              </button>
            </div>
          </header>

          <div className="mb-12 mt-12 text-center">
            <h1 id="login-titulo" className={`font-serif text-[26px] font-bold leading-tight ${altoContraste ? "text-white" : "text-[#514d49]"}`}>
              Plataforma de Calificación
            </h1>
            <p className={`mt-2 text-sm ${altoContraste ? "text-zinc-200" : "text-zinc-600"}`}>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <label htmlFor="rut" className="sr-only">RUT de la plataforma</label>
              <input
                id="rut"
                type="text"
                required
                autoComplete="username"
                inputMode="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="Ingresa tu RUT (12.345.678-9)"
                className={`h-12 w-full border px-3 text-base outline-none placeholder:text-[#68819f] focus:border-[#2878e5] focus:ring-1 focus:ring-[#2878e5] ${altoContraste ? "border-white bg-black text-white placeholder:text-zinc-300" : "border-[#333] bg-white text-zinc-900"}`}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Contraseña de la plataforma</label>
              <div className="flex h-12 w-full">
                <input
                  id="password"
                  type={mostrarPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className={`h-12 min-w-0 flex-1 border px-3 text-base outline-none placeholder:text-[#68819f] focus:border-[#2878e5] focus:ring-1 focus:ring-[#2878e5] ${altoContraste ? "border-white bg-black text-white placeholder:text-zinc-300" : "border-[#333] bg-white text-zinc-900"}`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((actual) => !actual)}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={mostrarPassword}
                  className="flex w-12 shrink-0 items-center justify-center bg-[#82b0e2] text-white hover:bg-[#6098d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173a78]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    {mostrarPassword ? (
                      <path d="M3.3 2 2 3.3l3.1 3.1A13.7 13.7 0 0 0 1 12s3.5 7 11 7c1.9 0 3.5-.4 4.9-1.1l3.8 3.8L22 20.4 3.3 2Zm8.7 15c-3.1 0-5.3-2.2-5.3-5 0-.8.2-1.5.6-2.1l1.6 1.6a3.2 3.2 0 0 0 3.6 3.6l1.6 1.6c-.6.2-1.3.3-2.1.3ZM12 5c7.5 0 11 7 11 7a13.3 13.3 0 0 1-3.2 4.1l-2.1-2.1a5 5 0 0 0-6.7-6.7L9.3 5.6C10.1 5.2 11 5 12 5Zm0 3.8a3.2 3.2 0 0 1 3.2 3.2c0 .3 0 .6-.1.9l-4-4c.3-.1.6-.1.9-.1Z" />
                    ) : (
                      <path d="M12 5C4.5 5 1 12 1 12s3.5 7 11 7 11-7 11-7-3.5-7-11-7Zm0 11.5A4.5 4.5 0 1 1 12 7a4.5 4.5 0 0 1 0 9.5Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>


            <p className={`-mt-4 text-sm ${altoContraste ? "text-zinc-200" : "text-zinc-600"}`}>
              Acceso exclusivo para usuarios de la plataforma.
            </p>

            {error && (
              <p role="alert" className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="h-[59px] w-full bg-[#82b0e2] px-3 text-base font-semibold text-white underline transition-colors hover:bg-[#6098d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173a78] disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? "Ingresando..." : "INGRESAR"}
            </button>
          </form>
        </section>
      </main>

      <footer className="bg-[#0b223a] px-5 py-5 text-white sm:min-h-[124px]">
        <div className="mx-auto grid max-w-[1110px] grid-cols-1 items-center gap-4 text-center text-sm sm:grid-cols-3 sm:gap-8">
          <div className="text-left">
            <p className="font-medium">Plataforma</p>
            <p className="mt-1 text-xs text-slate-200">plataforma de calificacion para expertos</p>
          </div>
          <div>
            <p>Plataforma de Calificación</p>
            <p className="mt-3">Acceso seguro para usuarios autorizados</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-medium">Soporte</p>
            <p className="mt-1 text-xs text-slate-200">Contacta al administrador de tu organización</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
