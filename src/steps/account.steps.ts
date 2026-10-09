import { When } from '@cucumber/cucumber';
import { callTimed } from '../support/api-calls';
import type { ApiName } from '../support/config';
import type { CustomWorld } from '../support/custom-world';

When(
  'I register with email {string}, password {string} and confirmation {string} on the {api} API',
  async function (
    this: CustomWorld,
    email: string,
    password: string,
    confirmPassword: string,
    api: ApiName,
  ) {
    await callTimed(this, api, () =>
      this.session(api).client.post('api/account/register', { email, password, confirmPassword }),
    );
  },
);
