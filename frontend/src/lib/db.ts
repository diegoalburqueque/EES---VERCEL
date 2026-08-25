import "server-only";
import { Pool } from "pg";

/**
 * Pool temporal directo a Postgres (Supabase) — puente para probar el frontend
 * mientras no existe la API real de Cristóbal. Cuando exista, este archivo se
 * elimina y el frontend le pega a esa API en vez de a la base directamente.
 */
declare global {
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL no está configurado (revisa .env.local)");
    }
    global.__pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      // En Vercel cada función corre aislada y abre su propio pool, así que un pool grande
      // por instancia multiplica las conexiones contra Supabase hasta agotarlas. En local,
      // donde hay un solo proceso de larga vida, conviene lo contrario.
      max: process.env.VERCEL ? 1 : 5,
      // Cierra rápido las conexiones ociosas: la instancia puede congelarse entre peticiones
      // y dejar conexiones colgando del lado del pooler.
      idleTimeoutMillis: process.env.VERCEL ? 10_000 : 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return global.__pgPool;
}
