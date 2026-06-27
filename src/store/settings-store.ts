import type { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS } from '../shared/constants';
import { storageManager } from './storage';
import { createLogger } from '../utils/logger';

const log = createLogger('SettingsStore');

// Gestión centralizada de settings
class SettingsStore {
  private cache: UserSettings | null = null;

  // Obtener settings (con cache en memoria)
  async get(): Promise<UserSettings> {
    if (this.cache) return this.cache;

    const stored = await storageManager.get<Partial<UserSettings>>(
      STORAGE_KEYS.SETTINGS,
    );

    // Merge con defaults para garantizar completitud
    this.cache = { ...DEFAULT_SETTINGS, ...stored };
    return this.cache;
  }

  // Actualizar settings parcialmente
  async update(
    partial: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const current = await this.get();
    const updated = { ...current, ...partial };

    await storageManager.set(STORAGE_KEYS.SETTINGS, updated);
    this.cache = updated;

    log.info('Settings actualizados', Object.keys(partial));
    return updated;
  }

  // Resetear a defaults
  async reset(): Promise<UserSettings> {
    await storageManager.set(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS,
    );
    this.cache = { ...DEFAULT_SETTINGS };
    log.info('Settings reseteados a defaults');
    return this.cache;
  }

  // Invalidar cache (útil cuando otro contexto modifica storage)
  invalidate(): void {
    this.cache = null;
  }
}

export const settingsStore = new SettingsStore();
