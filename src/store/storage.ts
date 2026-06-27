import { createLogger } from '../utils/logger';

const log = createLogger('Storage');

// Wrapper tipado sobre chrome.storage.local
class StorageManager {
  private getApi(): typeof chrome.storage.local {
    const api =
      typeof chrome !== 'undefined'
        ? chrome
        : (typeof browser !== 'undefined'
            ? (browser as unknown as typeof chrome)
            : null);
    if (!api?.storage?.local) {
      throw new Error('API de storage no disponible');
    }
    return api.storage.local;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.getApi().get(key);
      return (result[key] as T) ?? null;
    } catch (err) {
      log.error(`Error leyendo ${key}`, err);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.getApi().set({ [key]: value });
    } catch (err) {
      log.error(`Error guardando ${key}`, err);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.getApi().remove(key);
    } catch (err) {
      log.error(`Error eliminando ${key}`, err);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.getApi().clear();
      log.info('Storage limpiado');
    } catch (err) {
      log.error('Error limpiando storage', err);
    }
  }
}

export const storageManager = new StorageManager();
