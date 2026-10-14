import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import bcrypt from "bcryptjs";

/**
 * Contraseñas de CALIFICADOR (el ADMIN sigue con bcrypt, ver login y /api/usuarios).
 *
 * 1. Verificación: hash Argon2id en `usuarios.password_hash`.
 * 2. Copia recuperable: la contraseña se cifra con AES-256-GCM (`node:crypto`) y el resultado
 *    se guarda en `credenciales_calificador`. La clave vive solo en la variable de entorno
 *    `CREDENCIALES_CLAVE` (Vercel, marcada Sensitive): nunca en la base, el repo ni el frontend.
 *    Si no está configurada, todo falla cerrado (no se guarda contraseña sin su copia).
 *
 * Formato guardado: base64(iv 12 bytes) . base64(tag 16 bytes) . base64(ciphertext).
 * `version_clave` dice con qué clave se cifró (`CREDENCIALES_CLAVE_VERSION`, por defecto "v1"),
 * para poder rotarla más adelante.
 */

// Parámetros mínimos recomendados por OWASP para Argon2id (19 MiB, 2 iteraciones, 1 hilo).
// `algorithm: 2` = Argon2id (el enum de la librería es const y no se puede importar con isolatedModules).
const OPCIONES_ARGON2 = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export class CifradoNoConfiguradoError extends Error {
  constructor() {
    super("CREDENCIALES_CLAVE no está configurada o no es una clave de 32 bytes en base64.");
  }
}

export function hashCalificador(password: string): Promise<string> {
  return argon2Hash(password, OPCIONES_ARGON2);
}

/** Verifica contra Argon2id; acepta bcrypt solo como respaldo para hashes antiguos. */
export async function verificarCalificador(password: string, hashGuardado: string): Promise<boolean> {
  if (hashGuardado.startsWith("$argon2")) return argon2Verify(hashGuardado, password);
  if (hashGuardado.startsWith("$2")) return bcrypt.compare(password, hashGuardado);
  return false;
}

function obtenerClave(): Buffer | null {
  const valor = process.env.CREDENCIALES_CLAVE;
  if (!valor) return null;
  const clave = Buffer.from(valor, "base64");
  return clave.length === 32 ? clave : null;
}

export function cifradoConfigurado(): boolean {
  return obtenerClave() !== null;
}

export interface CopiaCifrada {
  passwordCifrada: string;
  versionClave: string;
}

export async function cifrarCopia(password: string): Promise<CopiaCifrada> {
  const clave = obtenerClave();
  if (!clave) throw new CifradoNoConfiguradoError();
  const iv = randomBytes(12); // nuevo en cada cifrado: GCM nunca debe repetir IV con la misma clave
  const cifrador = createCipheriv("aes-256-gcm", clave, iv);
  const texto = Buffer.concat([cifrador.update(password, "utf8"), cifrador.final()]);
  const tag = cifrador.getAuthTag();
  return {
    passwordCifrada: [iv, tag, texto].map((b) => b.toString("base64")).join("."),
    versionClave: process.env.CREDENCIALES_CLAVE_VERSION || "v1",
  };
}

/** Lanza error si la clave no corresponde o el texto fue alterado (lo detecta el tag de GCM). */
export async function descifrarCopia(passwordCifrada: string): Promise<string> {
  const clave = obtenerClave();
  if (!clave) throw new CifradoNoConfiguradoError();
  const [iv, tag, texto] = passwordCifrada.split(".").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !texto || iv.length !== 12 || tag.length !== 16) {
    throw new Error("Formato de credencial cifrada inválido.");
  }
  const descifrador = createDecipheriv("aes-256-gcm", clave, iv);
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(texto), descifrador.final()]).toString("utf8");
}
