import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { request } from '@playwright/test';
import { ApiClient } from '../clients/ApiClient';
import { config, type ApiName } from './config';
import type { CustomWorld } from './custom-world';

setDefaultTimeout(30_000);

let stopMock: (() => Promise<unknown>) | undefined;

// Start the bundled mock APIs once per run (skipped when testing real environments).
BeforeAll(async function () {
  if (config.useExternalApi) return;
  const { startMock } = await import('../../mock/server.mjs');
  const mock = await startMock();
  stopMock = mock.stop;
  console.log(`\nMock APIs started -> Core ${mock.coreUrl} | Legacy ${mock.legacyUrl}\n`);
});

AfterAll(async function () {
  await stopMock?.();
});

Before({ tags: '@ignore' }, function () {
  return 'skipped';
});

// Playwright resolves relative URLs against baseURL only when it ends with a slash.
const withTrailingSlash = (url: string): string => url.replace(/\/?$/, '/');

Before(async function (this: CustomWorld) {
  const baseUrls: Record<ApiName, string> = { Core: config.coreUrl, Legacy: config.legacyUrl };

  const entries = await Promise.all(
    (Object.keys(baseUrls) as ApiName[]).map(async (api) => {
      const context = await request.newContext({ baseURL: withTrailingSlash(baseUrls[api]) });
      return [api, { request: context, client: new ApiClient(context) }] as const;
    }),
  );
  this.sessions = Object.fromEntries(entries) as CustomWorld['sessions'];
});

After(async function (this: CustomWorld, { result }) {
  // On failure, attach the last response of each API to make the report self-explanatory.
  if (result?.status === Status.FAILED) {
    for (const api of ['Legacy', 'Core'] as ApiName[]) {
      const response = this.sessions[api].response;
      if (!response) continue;
      const body = await response.text().catch(() => '<unreadable body>');
      this.attach(`${api} -> HTTP ${response.status()} ${response.url()}\n${body}`, 'text/plain');
    }
  }
  await Promise.all(Object.values(this.sessions).map((s) => s.request.dispose()));
});
