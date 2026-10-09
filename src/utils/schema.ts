import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const schemasDir = resolve(dirname(fileURLToPath(import.meta.url)), '../schemas');
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

/** Loads `src/schemas/<name>.schema.json`. */
export function loadSchema(name: string): object {
  const file = resolve(schemasDir, `${name}.schema.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as object;
}

/** Throws a readable error when `data` does not satisfy the named JSON Schema. */
export function assertMatchesSchema(data: unknown, schemaName: string): void {
  const validate = ajv.compile(loadSchema(schemaName));
  if (!validate(data)) {
    const details = (validate.errors ?? [])
      .map((e) => `  - ${e.instancePath || '(root)'} ${e.message ?? ''}`)
      .join('\n');
    throw new Error(`Response does not match schema "${schemaName}":\n${details}`);
  }
}
