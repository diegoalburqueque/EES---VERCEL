"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    // La validación de credenciales y la emisión del JWT ocurren en el servidor
    // (route handler), nunca en el cliente — la cookie queda httpOnly.
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password }),
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

  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--atm-fondo)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Grupo EES</h1>
          <p className="mt-0.5 text-sm font-medium text-zinc-700">Plataforma de Calificación</p>
          <p className="mt-1 text-sm text-zinc-500">
            Ingresa con tu correo y contraseña
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-[var(--atm-linea)] bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="correo" className="text-sm font-medium text-[var(--atm-gris)]">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              required
              autoComplete="username"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="nombre@grupoees.cl"
              className="rounded-lg border border-[var(--atm-linea)] px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[var(--atm-azul2)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--atm-gris)]">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-[var(--atm-linea)] px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[var(--atm-azul2)]"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 rounded-lg bg-[var(--atm-azul)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
