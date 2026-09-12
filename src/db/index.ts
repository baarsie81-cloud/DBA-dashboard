import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

/**
 * Server-side database client.
 * Requires DATABASE_URL. Do not import this module from client components.
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before using the database.",
    );
  }

  const client = postgres(connectionString, {
    max: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as {
  db?: Db;
};

/** Lazy accessor so Next.js build does not require DATABASE_URL until runtime use. */
export function getDb(): Db {
  if (!globalForDb.db) {
    globalForDb.db = createDb();
  }
  return globalForDb.db;
}

export type Database = Db;
