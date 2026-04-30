import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Pitfall C: migrations always use the non-pooled connection
    url: process.env.DIRECT_URL!,
  },
  strict: true,
  verbose: true,
});
