import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "./schema.sql";

const dbPath = process.env.DATABASE_PATH ?? "./sales.db";

export const db = new Database(dbPath, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(SCHEMA_SQL);

export default db;
