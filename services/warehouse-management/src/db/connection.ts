import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "./schema.sql";

const dbPath = process.env.DATABASE_PATH ?? "./warehouse.db";

export const db = new Database(dbPath, { create: true });

// Performance + safety pragmas for local mock
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Auto-migrate (idempotent)
db.exec(SCHEMA_SQL);

export default db;
