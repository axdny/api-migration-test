import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { config, type ApiName } from '../support/config';
import { callTimed, requestToken } from '../support/api-calls';
import type { CustomWorld } from '../support/custom-world';

interface TokenBody {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  userName?: string;
}

const request = (world: CustomWorld, api: ApiName, user: string, password: string) =>
  callTimed(world, api, () => requestToken(world, api, user, password));

When(
  'I request a token from the {api} API with valid credentials',
  async function (this: CustomWorld, api: ApiName) {
    await request(this, api, config.testUser, config.testPassword);
  },
);

When(
  'I request a token from the {api} API with invalid credentials',
  async function (this: CustomWorld, api: ApiName) {
    await request(this, api, 'unknown.user@example.com', 'not-the-password');
  },
);

When(
  'I request a token from the {api} API with an empty username',
  async function (this: CustomWorld, api: ApiName) {
    await request(this, api, '', config.testPassword);
  },
);

When(
  'I request a token from the {api} API with an empty password',
  async function (this: CustomWorld, api: ApiName) {
    await request(this, api, config.testUser, '');
  },
);

Then('the response should contain a valid access token', async function (this: CustomWorld) {
  const { access_token: token } = await this.json<TokenBody>();
  expect(typeof token).toBe('string');
  expect(token?.length).toBeGreaterThan(0);
});

Then('the token type should be {string}', async function (this: CustomWorld, expected: string) {
  const { token_type: type } = await this.json<TokenBody>();
  expect(type?.toLowerCase()).toBe(expected.toLowerCase());
});

Then('the token should expire in the future', async function (this: CustomWorld) {
  const { expires_in: expiresIn } = await this.json<TokenBody>();
  expect(expiresIn).toBeGreaterThan(0);
});

Then('the response should contain the username', async function (this: CustomWorld) {
  const { userName } = await this.json<TokenBody>();
  expect(userName).toBe(config.testUser);
});
