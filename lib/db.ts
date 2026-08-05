import "server-only";
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;
export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}
