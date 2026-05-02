import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool as NodePgPool } from 'pg';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import ws from 'ws';
import * as schema from './schema';

const url = process.env.DATABASE_URL!;

// CI Postgres + local dev speak plain TCP. The Neon serverless driver is
// WebSocket-only, so it can't talk to a vanilla postgres on localhost. Detect
// non-Neon hosts and route through node-postgres. Production Neon URLs always
// resolve to neon.tech, so this branch is never taken in real prod.
const isLocalPostgres = url.includes('localhost') || url.includes('127.0.0.1');

let _db: NeonDatabase<typeof schema>;
if (isLocalPostgres) {
  const pool = new NodePgPool({ connectionString: url });
  _db = drizzleNodePg(pool, { schema }) as unknown as NeonDatabase<typeof schema>;
} else {
  if (typeof WebSocket === 'undefined') {
    neonConfig.webSocketConstructor = ws;
  }
  const pool = new NeonPool({ connectionString: url });
  _db = drizzleNeon(pool, { schema });
}

export const db = _db;
export type DB = typeof db;
export { schema };
