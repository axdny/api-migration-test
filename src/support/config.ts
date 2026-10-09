import dotenv from 'dotenv';

dotenv.config();

export const config = {
  /** Base URL of the new implementation (the migration target). */
  coreUrl: process.env.API_CORE_URL ?? 'http://localhost:4010',
  /** Base URL of the implementation being replaced. */
  legacyUrl: process.env.API_LEGACY_URL ?? 'http://localhost:4011',
  /** When true the bundled mock servers are NOT started (point the URLs above at real APIs). */
  useExternalApi: process.env.USE_EXTERNAL_API === 'true',
  testUser: process.env.TEST_USER ?? 'qa.user@example.com',
  testPassword: process.env.TEST_PASSWORD ?? 'Demo#Pass123',
  /** Overrides the iteration count of performance scenarios when > 0. */
  comparisonIterations: Number(process.env.COMPARISON_ITERATIONS ?? 0),
};

export type ApiName = 'Core' | 'Legacy';
