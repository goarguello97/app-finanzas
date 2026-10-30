import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const DIR_MIGRACIONES = join(process.cwd(), "supabase", "migrations");

// Reproduce lo que Supabase ya trae: esquema auth, auth.uid() y los roles de la API.
const STUB_SUPABASE = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

const GRANTS_SUPABASE = `
  grant all on all tables in schema public to authenticated;
  grant all on all sequences in schema public to authenticated;
  grant select on all tables in schema public to anon;
`;

export const USUARIO_A = "11111111-1111-1111-1111-111111111111";
export const USUARIO_B = "22222222-2222-2222-2222-222222222222";

export async function crearDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(STUB_SUPABASE);

  const migraciones = readdirSync(DIR_MIGRACIONES)
    .filter((archivo) => archivo.endsWith(".sql"))
    .sort();
  for (const archivo of migraciones) {
    await db.exec(readFileSync(join(DIR_MIGRACIONES, archivo), "utf8"));
  }

  await db.exec(GRANTS_SUPABASE);
  await db.query("insert into auth.users (id, email) values ($1, 'a@test.local'), ($2, 'b@test.local')", [
    USUARIO_A,
    USUARIO_B,
  ]);
  return db;
}

/** Ejecuta `fn` como el usuario indicado, con RLS aplicada. */
export async function comoUsuario<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.sub = '${userId}'; set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; reset request.jwt.sub;");
  }
}
