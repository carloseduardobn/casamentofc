import { Pool } from "pg";

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL não configurada. Defina essa variável de ambiente com a string de conexão do seu banco Postgres."
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const client = getPool();
    await client.query(`
      CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente',
        notes TEXT,
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS dependents (
        id SERIAL PRIMARY KEY,
        guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente',
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_settings (
        id INT PRIMARY KEY DEFAULT 1,
        event_name TEXT NOT NULL DEFAULT 'Nosso evento',
        event_date TIMESTAMPTZ,
        deadline_date TIMESTAMPTZ,
        CONSTRAINT single_row CHECK (id = 1)
      );
    `);
    await client.query(`
      INSERT INTO event_settings (id, event_name)
      VALUES (1, 'Nosso evento')
      ON CONFLICT (id) DO NOTHING;
    `);
  })();
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  const client = getPool();
  return client.query(text, params);
}
