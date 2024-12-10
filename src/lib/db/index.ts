import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "$env/dynamic/private";

const dbURL = `postgres://${env.VITE_DB_USER}:${env.VITE_DB_PASSWORD}@${env.VITE_DB_HOST}:${env.VITE_DB_PORT}/${env.VITE_DB_NAME}`;

if (!env.VITE_DB_NAME) throw new Error("DATABASE_URL is not set");

const client = postgres(dbURL);

export const takeUniqueOrThrow = async <T>(values: T[]) => {
  if (values.length !== 1)
    throw new Error("Found non unique or non existent value");
  return values[0]!;
};

export const db = drizzle(client, { schema });
