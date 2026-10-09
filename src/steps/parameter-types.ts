import { defineParameterType } from '@cucumber/cucumber';
import type { ApiName } from '../support/config';

// Lets steps say "from the Core API" / "from the Legacy API" with one expression.
defineParameterType({
  name: 'api',
  regexp: /Core|Legacy/,
  transformer: (name: string) => name as ApiName,
});
