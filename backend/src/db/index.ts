import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from 'ws';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const isNeonUrl = (() => {
  try {
    return new URL(connectionString).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
})();

const useNeonDriver = process.env.DATABASE_DRIVER === 'neon' || isNeonUrl;

neonConfig.webSocketConstructor = ws;

const pool = useNeonDriver
  ? new NeonPool({ connectionString })
  : new PgPool({ connectionString });

export const db = useNeonDriver
  ? drizzleNeon({ client: pool as NeonPool, schema })
  : drizzlePg(pool as PgPool, { schema });
