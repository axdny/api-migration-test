import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { config, type ApiName } from '../support/config';
import { requestToken } from '../support/api-calls';
import type { CustomWorld } from '../support/custom-world';
import { assertMatchesSchema } from '../utils/schema';

/** Reads a nested value using dot notation, e.g. "Data.OwnerId". */
function getPath(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

// ---------------------------------------------------------------------------
// Preconditions
// ---------------------------------------------------------------------------

Given('the {api} API is available', async function (this: CustomWorld, api: ApiName) {
  const response = await this.session(api).client.get('api/health');
  expect(response.status(), `${api} API health check`).toBe(200);
});

Given('I have a valid token from the {api} API', async function (this: CustomWorld, api: ApiName) {
  const response = await requestToken(this, api, config.testUser, config.testPassword);
  expect(response.status(), `${api} token request`).toBe(200);
  const { access_token: token } = (await response.json()) as { access_token: string };
  this.session(api).client.setToken(token);
});

Given('I have valid tokens from both APIs', async function (this: CustomWorld) {
  for (const api of ['Legacy', 'Core'] as ApiName[]) {
    const response = await requestToken(this, api, config.testUser, config.testPassword);
    expect(response.status(), `${api} token request`).toBe(200);
    const { access_token: token } = (await response.json()) as { access_token: string };
    this.session(api).client.setToken(token);
  }
});

// ---------------------------------------------------------------------------
// Generic response assertions (apply to the API that served the last request)
// ---------------------------------------------------------------------------

Then('the response status should be {int}', function (this: CustomWorld, status: number) {
  expect(this.response.status(), `${this.lastApi} API status`).toBe(status);
});

Then(
  'the response should match the schema {string}',
  async function (this: CustomWorld, name: string) {
    assertMatchesSchema(await this.json(), name);
  },
);

Then(
  'the response field {string} should equal {string}',
  async function (this: CustomWorld, path: string, expected: string) {
    const actual = getPath(await this.json(), path);
    expect(String(actual), `field "${path}"`).toBe(expected);
  },
);

Then(
  'the response field {string} should be an empty array',
  async function (this: CustomWorld, path: string) {
    const actual = getPath(await this.json(), path);
    expect(Array.isArray(actual) && actual.length === 0, `field "${path}" is an empty array`).toBe(
      true,
    );
  },
);

Then('the response should be empty', async function (this: CustomWorld) {
  expect(await this.response.text()).toBe('');
});

Then('the response should contain an error', async function (this: CustomWorld) {
  const json = (await this.json()) as Record<string, unknown>;
  const hasError = json.error ?? json.error_description ?? json.Message ?? json.message;
  expect(hasError, 'error payload').toBeDefined();
});

Then('the response time should be less than {int} ms', function (this: CustomWorld, maxMs: number) {
  const duration = this.session(this.lastApi).lastDurationMs ?? Number.POSITIVE_INFINITY;
  expect(duration, `${this.lastApi} API response time`).toBeLessThan(maxMs);
});
