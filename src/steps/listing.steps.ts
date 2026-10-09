import { When } from '@cucumber/cucumber';
import { callTimed } from '../support/api-calls';
import type { ApiName } from '../support/config';
import type { CustomWorld } from '../support/custom-world';

// --- listing/getCategories -------------------------------------------------

When(
  'I get listing categories with text {string} from the {api} API',
  async function (this: CustomWorld, text: string, api: ApiName) {
    await callTimed(this, api, () =>
      this.session(api).client.get(`api/listing/getCategories?text=${encodeURIComponent(text)}`),
    );
  },
);

When(
  'I get listing categories with text {string} from the {api} API {int} times',
  async function (this: CustomWorld, text: string, api: ApiName, times: number) {
    await callTimed(
      this,
      api,
      () =>
        this.session(api).client.get(`api/listing/getCategories?text=${encodeURIComponent(text)}`),
      times,
    );
  },
);

When(
  'I get listing categories without the text parameter from the {api} API',
  async function (this: CustomWorld, api: ApiName) {
    await callTimed(this, api, () => this.session(api).client.get('api/listing/getCategories'));
  },
);

// --- listing/getListingDetail ------------------------------------------------

When(
  'I get the listing detail with ID {string} from the {api} API',
  async function (this: CustomWorld, id: string, api: ApiName) {
    await callTimed(this, api, () =>
      this.session(api).client.get(`api/listing/getListingDetail?id=${encodeURIComponent(id)}`),
    );
  },
);

When(
  'I get the listing detail with ID {string} from the {api} API {int} times',
  async function (this: CustomWorld, id: string, api: ApiName, times: number) {
    await callTimed(
      this,
      api,
      () =>
        this.session(api).client.get(`api/listing/getListingDetail?id=${encodeURIComponent(id)}`),
      times,
    );
  },
);
