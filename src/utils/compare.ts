/**
 * Comparison engine used to validate that Core is a faithful replacement for Legacy.
 *
 * Two independent checks:
 *
 *  1. compareStructure — are the same keys present, with the same types and the same
 *     first-letter casing? Values are ignored; `null` on either side is treated as
 *     "unknown type" and skipped, because one API may return null where the other
 *     omits or populates a field.
 *
 *  2. compareValues — are the actual values equal? Volatile fields (timestamps, audit
 *     columns, real-time calculations) are ignored via VALUE_IGNORE_FIELDS.
 */

export interface StructureResult {
  /** Every structural difference found (both directions). */
  differences: string[];
  /** Only the differences that mean "Core is missing something Legacy has". */
  missingInCore: string[];
}

export interface ValueResult {
  differences: string[];
}

/** Keys (lowercased) that are expected to differ between calls and are skipped. */
export const VALUE_IGNORE_FIELDS = new Set([
  'datecreated',
  'dateupdated',
  'datemodified',
  'createddate',
  'updateddate',
  'modifieddate',
  'timestamp',
  '.issued',
  '.expires',
  'access_token',
]);

type Json = unknown;

const typeOf = (value: Json): string => (Array.isArray(value) ? 'array' : typeof value);
const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const startsLower = (s: string): boolean => s.charAt(0) === s.charAt(0).toLowerCase();

export function compareStructure(legacy: Json, core: Json, path = 'root'): StructureResult {
  const differences: string[] = [];
  const missingInCore: string[] = [];
  const record = (message: string, missing = true): void => {
    differences.push(message);
    if (missing) missingInCore.push(message);
  };

  if (legacy === null || legacy === undefined || core === null || core === undefined) {
    return { differences, missingInCore };
  }

  if (typeOf(legacy) !== typeOf(core)) {
    record(`${path}: type mismatch (Legacy: ${typeOf(legacy)}, Core: ${typeOf(core)})`);
    return { differences, missingInCore };
  }

  if (Array.isArray(legacy) && Array.isArray(core)) {
    if (legacy.length === 0 && core.length === 0) return { differences, missingInCore };
    if (legacy.length === 0 || core.length === 0) {
      record(
        `${path}: one array is empty and the other is not (Legacy: ${legacy.length}, Core: ${core.length})`,
        legacy.length > 0,
      );
      return { differences, missingInCore };
    }
    // Arrays are assumed homogeneous: comparing the first element is enough for structure.
    const inner = compareStructure(legacy[0], core[0], `${path}[0]`);
    differences.push(...inner.differences);
    missingInCore.push(...inner.missingInCore);
    return { differences, missingInCore };
  }

  if (isObject(legacy) && isObject(core)) {
    const legacyKeys = Object.keys(legacy);
    const coreKeys = Object.keys(core);
    const findCore = (key: string) => coreKeys.find((k) => k.toLowerCase() === key.toLowerCase());
    const findLegacy = (key: string) =>
      legacyKeys.find((k) => k.toLowerCase() === key.toLowerCase());

    const missing = legacyKeys.filter((k) => findCore(k) === undefined);
    const extra = coreKeys.filter((k) => findLegacy(k) === undefined);
    if (missing.length > 0) record(`${path}: keys missing in Core: ${missing.join(', ')}`);
    if (extra.length > 0) record(`${path}: extra keys in Core: ${extra.join(', ')}`, false);

    for (const key of legacyKeys) {
      const coreKey = findCore(key);
      if (coreKey === undefined) continue;

      // Same key, different first-letter casing (e.g. "ListingId" vs "listingId")
      // is a breaking change for consumers, even though the key "exists".
      if (startsLower(key) !== startsLower(coreKey)) {
        record(`${path}.${key}: casing mismatch (Legacy: "${key}", Core: "${coreKey}")`);
      }

      const inner = compareStructure(legacy[key], core[coreKey], `${path}.${key}`);
      differences.push(...inner.differences);
      missingInCore.push(...inner.missingInCore);
    }
  }

  return { differences, missingInCore };
}

export function compareValues(legacy: Json, core: Json, path = 'root'): ValueResult {
  const differences: string[] = [];

  if (Array.isArray(legacy) && Array.isArray(core)) {
    if (legacy.length !== core.length) {
      differences.push(
        `${path}: array length differs (Legacy: ${legacy.length}, Core: ${core.length})`,
      );
    }
    const common = Math.min(legacy.length, core.length);
    for (let i = 0; i < common; i++) {
      differences.push(...compareValues(legacy[i], core[i], `${path}[${i}]`).differences);
    }
    return { differences };
  }

  if (isObject(legacy) && isObject(core)) {
    const coreKeys = Object.keys(core);
    for (const key of Object.keys(legacy)) {
      if (VALUE_IGNORE_FIELDS.has(key.toLowerCase())) continue;
      const coreKey = coreKeys.find((k) => k.toLowerCase() === key.toLowerCase());
      if (coreKey === undefined) continue; // reported by compareStructure
      differences.push(...compareValues(legacy[key], core[coreKey], `${path}.${key}`).differences);
    }
    return { differences };
  }

  if (legacy !== core) {
    differences.push(
      `${path}: value mismatch (Legacy: ${JSON.stringify(legacy)}, Core: ${JSON.stringify(core)})`,
    );
  }
  return { differences };
}
