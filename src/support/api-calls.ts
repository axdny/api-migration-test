import type { APIResponse } from '@playwright/test';
import { config, type ApiName } from './config';
import type { CustomWorld } from './custom-world';
import { summarize } from '../utils/performance';

/**
 * Executes `call` against the given API one or more times, timing each request.
 * The last response is stored on the session; timing stats go to `session.metrics`.
 */
export async function callTimed(
  world: CustomWorld,
  api: ApiName,
  call: () => Promise<APIResponse>,
  iterations = 1,
): Promise<void> {
  const session = world.session(api);
  const runs = config.comparisonIterations > 0 ? config.comparisonIterations : iterations;
  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const started = Date.now();
    session.response = await call();
    session.lastDurationMs = Date.now() - started;
    times.push(session.lastDurationMs);
  }

  session.metrics = summarize(times);
  world.lastApi = api;
}

/**
 * Requests an access token from the given API.
 *  - Legacy: POST /Token       (form-encoded, OAuth2 password grant)
 *  - Core:   POST /api/auth/token (JSON)
 */
export function requestToken(
  world: CustomWorld,
  api: ApiName,
  username: string,
  password: string,
): Promise<APIResponse> {
  const { client } = world.session(api);
  if (api === 'Legacy') {
    const form = new URLSearchParams({ grant_type: 'password', username, password });
    return client.post('Token', form.toString(), undefined, 'application/x-www-form-urlencoded');
  }
  return client.post('api/auth/token', { grant_type: 'password', username, password });
}
