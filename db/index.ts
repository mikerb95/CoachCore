import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

// Lazy singleton: neon() validates the connection string eagerly, so we only
// instantiate on first query (request time) — never at import/build time.
let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  _db = drizzle(neon(url), { schema });
  return _db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
