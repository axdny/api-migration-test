export interface MockOptions {
  corePort: number;
  legacyPort: number;
  legacyLatencyMs: number;
  coreLatencyMs: number;
  demoUser: string;
  demoPassword: string;
}

export const DEFAULTS: MockOptions;

export function startMock(overrides?: Partial<MockOptions>): Promise<{
  coreUrl: string;
  legacyUrl: string;
  stop: () => Promise<unknown>;
}>;
