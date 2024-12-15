import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  VITE_DB_NAME,
  VITE_DB_USER,
  VITE_DB_PASSWORD,
  VITE_DB_HOST,
  VITE_DB_PORT,
} from "$env/static/private";

const dbURL = `postgres://${VITE_DB_USER}:${VITE_DB_PASSWORD}@${VITE_DB_HOST}:${VITE_DB_PORT}/${VITE_DB_NAME}`;

if (!VITE_DB_NAME) throw new Error("DATABASE_URL is not set");

const client = postgres(dbURL);

export const takeUniqueOrThrow = async <T>(values: T[]) => {
  if (values.length !== 1)
    throw new Error("Found non unique or non existent value");
  return values[0]!;
};

export const db = drizzle(client, { schema });
