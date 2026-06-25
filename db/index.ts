import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  // Fail loudly at first DB use rather than silently misbehaving.
  console.warn("[db] DATABASE_URL is not set — database queries will fail.");
}

const sql = neon(process.env.DATABASE_URL ?? "");
export const db = drizzle(sql, { schema });
export { schema };
