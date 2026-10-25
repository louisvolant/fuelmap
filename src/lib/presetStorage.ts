import type { StateStorage } from "zustand/middleware";
import { getMeta, setMeta } from "@/lib/db/indexedDb";

const PREFIX = "preset:";

/**
 * IndexedDB-backed storage for user presets (filters, geolocation acceptance).
 *
 * IndexedDB is the primary store because it is durable in installed PWAs and is
 * not wiped by the occasional localStorage cleanup. The first read also migrates
 * an existing localStorage entry, so users upgrading from the old build keep
 * their preset. localStorage is still written as a best-effort mirror for
 * browsers where IndexedDB is unavailable.
 */
export function createPresetStorage(): StateStorage {
  return {
    async getItem(name) {
      try {
        const stored = await getMeta<string>(`${PREFIX}${name}`);
        if (stored !== undefined) return stored;
      } catch {
        // Fall through to the legacy localStorage entry.
      }

      try {
        const legacy = localStorage.getItem(name);
        if (legacy === null) return null;
        try {
          await setMeta(`${PREFIX}${name}`, legacy);
        } catch {
          // Keep the legacy value even if the migration write fails.
        }
        return legacy;
      } catch {
        return null;
      }
    },

    async setItem(name, value) {
      try {
        await setMeta(`${PREFIX}${name}`, value);
      } catch {
        // The localStorage mirror below is the fallback.
      }
      try {
        localStorage.setItem(name, value);
      } catch {
        // Ignore storage errors (private mode).
      }
    },

    async removeItem(name) {
      try {
        await setMeta(`${PREFIX}${name}`, undefined);
      } catch {
        // Ignore.
      }
      try {
        localStorage.removeItem(name);
      } catch {
        // Ignore.
      }
    },
  };
}

export const presetStorage = createPresetStorage();
