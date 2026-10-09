import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/custom-world';
import { compareStructure, compareValues } from '../utils/compare';
import { formatComparison } from '../utils/performance';

interface Bodies {
  legacy: unknown;
  core: unknown;
  bothEmpty: boolean;
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Both APIs must have answered with the same status before bodies are compared. */
async function loadBodies(world: CustomWorld): Promise<Bodies> {
  const legacy = world.session('Legacy').response;
  const core = world.session('Core').response;
  if (!legacy || !core) {
    throw new Error('Call both the Legacy and the Core API before comparing their responses');
  }
  expect(core.status(), 'Core and Legacy must return the same HTTP status').toBe(legacy.status());

  const [legacyText, coreText] = await Promise.all([legacy.text(), core.text()]);
  return {
    legacy: legacyText ? parse(legacyText) : undefined,
    core: coreText ? parse(coreText) : undefined,
    bothEmpty: !legacyText && !coreText,
  };
}

function fail(world: CustomWorld, title: string, lines: string[]): never {
  const report = [`${title} (${lines.length}):`, ...lines.map((l) => `  - ${l}`)].join('\n');
  world.attach(report, 'text/plain');
  throw new Error(report);
}

Then(
  'the Legacy and Core API responses should have the same structure',
  async function (this: CustomWorld) {
    const { legacy, core, bothEmpty } = await loadBodies(this);
    if (bothEmpty) return;

    const { differences, missingInCore } = compareStructure(legacy, core);
    if (differences.length > 0)
      this.attach(`Structure differences:\n${differences.join('\n')}`, 'text/plain');
    if (missingInCore.length > 0)
      fail(this, 'Core is missing structure present in Legacy', missingInCore);
  },
);

Then('the Legacy and Core API response values should match', async function (this: CustomWorld) {
  const { legacy, core, bothEmpty } = await loadBodies(this);
  if (bothEmpty) return;

  const { differences } = compareValues(legacy, core);
  if (differences.length > 0) fail(this, 'Value differences between Legacy and Core', differences);
});

Then('the Legacy and Core API error messages should match', async function (this: CustomWorld) {
  const { legacy, core } = await loadBodies(this);
  const message = (body: unknown): unknown =>
    typeof body === 'object' && body !== null
      ? ((body as Record<string, unknown>).Message ?? (body as Record<string, unknown>).message)
      : body;
  expect(message(core), 'Core error message').toBe(message(legacy));
});

Then('the performance comparison should be reported', function (this: CustomWorld) {
  const legacy = this.session('Legacy').metrics;
  const core = this.session('Core').metrics;
  expect(legacy, 'Legacy metrics').toBeDefined();
  expect(core, 'Core metrics').toBeDefined();

  const report = formatComparison(legacy!, core!);
  console.log(`\n${report}`);
  this.attach(report, 'text/plain');
});

Then(
  'the Core API average time should not exceed the Legacy API by more than {int} %',
  function (this: CustomWorld, maxPercent: number) {
    const legacy = this.session('Legacy').metrics;
    const core = this.session('Core').metrics;
    expect(legacy && core, 'both APIs must have timing metrics').toBeTruthy();

    const increase = ((core!.average - legacy!.average) / legacy!.average) * 100;
    this.attach(
      `Core vs Legacy average time: ${increase.toFixed(1)}% (limit ${maxPercent}%)`,
      'text/plain',
    );
    expect(increase, 'Core slowdown vs Legacy (%)').toBeLessThanOrEqual(maxPercent);
  },
);
