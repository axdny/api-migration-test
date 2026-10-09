import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ApiClient } from '../clients/ApiClient';
import type { ApiName } from './config';
import type { PerformanceMetrics } from '../utils/performance';

/** Everything the scenario knows about one of the two APIs under test. */
export interface ApiSession {
  request: APIRequestContext;
  client: ApiClient;
  /** Last response received from this API. */
  response?: APIResponse;
  /** Duration (ms) of the last request. */
  lastDurationMs?: number;
  /** Stats of the last batch of timed requests. */
  metrics?: PerformanceMetrics;
}

export class CustomWorld extends World {
  /** Both sessions are created in the Before hook. */
  sessions!: Record<ApiName, ApiSession>;
  /** The API that served the most recent request (used by generic "the response ..." steps). */
  lastApi: ApiName = 'Core';

  constructor(options: IWorldOptions) {
    super(options);
  }

  session(api: ApiName): ApiSession {
    return this.sessions[api];
  }

  /** Response of the most recent request, whichever API it went to. */
  get response(): APIResponse {
    const response = this.sessions[this.lastApi].response;
    if (!response) throw new Error(`No response recorded for the ${this.lastApi} API yet`);
    return response;
  }

  async json<T = unknown>(api: ApiName = this.lastApi): Promise<T> {
    const response = this.sessions[api].response;
    if (!response) throw new Error(`No response recorded for the ${api} API yet`);
    return (await response.json()) as T;
  }
}

setWorldConstructor(CustomWorld);
