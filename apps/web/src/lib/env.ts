/**
 * Runtime environment guards.
 *
 * These are intentionally NOT evaluated at module load / build time — calling
 * them only at request time keeps `next build` working without a database
 * (the public demo is built once and configured via Space secrets at runtime).
 */

/** Throw a clear, actionable error if DATABASE_URL is not configured. */
export function assertDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Configure it as a Space secret/env var ' +
        '(e.g. a Neon Postgres connection string with ?sslmode=require) before ' +
        'using database-backed routes.',
    );
  }
}
