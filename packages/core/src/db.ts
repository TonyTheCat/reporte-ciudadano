import postgres from "postgres";
import { Resource } from "sst";

let client: postgres.Sql | undefined;

function connectionOptions(): postgres.Options<{}> & { host?: string } {
  // Tests y scripts locales usan DATABASE_URL; en AWS usamos el recurso vinculado por SST.
  if (process.env.DATABASE_URL) return {};
  const db = (Resource as any).Database;
  return {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: db.database,
    ssl: db.host === "localhost" ? false : "require",
  };
}

export function sql(): postgres.Sql {
  if (!client) {
    const opts = { max: 2, idle_timeout: 20, connect_timeout: 10, onnotice: () => {}, ...connectionOptions() };
    client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, opts) : postgres(opts);
  }
  return client;
}

export async function closeDb() {
  await client?.end();
  client = undefined;
}
