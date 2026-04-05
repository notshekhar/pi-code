/**
 * One-time localStorage key migration into the `pi-code-*` prefix.
 *
 * Copies from legacy prefixes (`openacpui-*`, `harnss-*`) when the target key
 * is absent so upgrades keep preferences.
 *
 * Runs synchronously before React hooks initialize.
 */

const MIGRATION_FLAG = "pi-code-localstorage-migrated";

const LEGACY_PREFIXES = ["openacpui-", "harnss-"] as const;
const NEW_PREFIX = "pi-code-";

export function migrateLocalStorage(): void {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  let migrated = 0;

  for (const oldPrefix of LEGACY_PREFIXES) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(oldPrefix)) keys.push(key);
    }

    for (const key of keys) {
      const newKey = NEW_PREFIX + key.slice(oldPrefix.length);
      if (localStorage.getItem(newKey) !== null) continue;
      const value = localStorage.getItem(key);
      if (value === null) continue;
      localStorage.setItem(newKey, value);
      migrated++;
    }
  }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());

  if (migrated > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Pi Code] Migrated ${migrated} localStorage keys to ${NEW_PREFIX}*`);
  }
}
