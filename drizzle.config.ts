import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.VITE_DB_NAME)
  throw new Error("DATABASE Connection is not set");

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",

  dbCredentials: {
    database: process.env.VITE_DB_NAME || "",
    host: process.env.VITE_DB_HOST || "",
    password: process.env.VITE_DB_PASSWORD || "",
    port: parseInt(process.env.VITE_DB_PORT || "5432"),
    user: process.env.VITE_DB_USER || "",
    ssl: false,
  },

  extensionsFilters: ["postgis"],
  schemaFilter: "public",

  introspect: {
    casing: "camel",
  },

  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: "public",
  },

  breakpoints: true,
  strict: true,
  verbose: true,
});
