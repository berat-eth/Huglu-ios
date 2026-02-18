/**
 * Güvenli Depolama Utility
 * Tüm verileri SecureStore üzerinde saklar.
 *
 * Not: SecureStore native olarak getAllKeys/clear sağlamaz. Bu yüzden key-index tutulur.
 */

import * as SecureStore from 'expo-secure-store';

const KEY_INDEX_STORAGE_KEY = '__secureStorage_keys__';

async function readKeyIndex() {
  try {
    const raw = await SecureStore.getItemAsync(KEY_INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(k => typeof k === 'string' && k.length > 0);
  } catch {
    return [];
  }
}

async function writeKeyIndex(keys) {
  try {
    const unique = Array.from(new Set(keys)).filter(k => typeof k === 'string' && k.length > 0);
    await SecureStore.setItemAsync(KEY_INDEX_STORAGE_KEY, JSON.stringify(unique));
  } catch (error) {
    console.warn('⚠️ secureStorage key-index write error:', error?.message || error);
  }
}

async function addKeyToIndex(key) {
  const keys = await readKeyIndex();
  if (!keys.includes(key)) {
    keys.push(key);
    await writeKeyIndex(keys);
  }
}

async function removeKeyFromIndex(key) {
  const keys = await readKeyIndex();
  const next = keys.filter(k => k !== key);
  if (next.length !== keys.length) {
    await writeKeyIndex(next);
  }
}

/**
 * Güvenli depolama - tüm veriler SecureStore'da
 */
export const secureStorage = {
  /**
   * Değer kaydet
   */
  async setItem(key, value) {
    try {
      if (value === null || value === undefined) {
        await SecureStore.deleteItemAsync(key);
        await removeKeyFromIndex(key);
        return;
      }

      await SecureStore.setItemAsync(key, String(value));
      await addKeyToIndex(key);
    } catch (error) {
      console.error(`❌ SecureStorage setItem error for key "${key}":`, error?.message || error);
      throw error;
    }
  },

  /**
   * Değer al
   */
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`❌ SecureStorage getItem error for key "${key}":`, error?.message || error);
      return null;
    }
  },

  /**
   * Birden fazla değer kaydet
   */
  async multiSet(keyValuePairs) {
    try {
      const keysToAdd = [];
      for (const [key, value] of keyValuePairs) {
        try {
          if (value === null || value === undefined) {
            await SecureStore.deleteItemAsync(key);
            await removeKeyFromIndex(key);
          } else {
            await SecureStore.setItemAsync(key, String(value));
            keysToAdd.push(key);
          }
        } catch (keyError) {
          console.warn(`⚠️ secureStorage multiSet error for key "${key}":`, keyError?.message || keyError);
        }
      }

      if (keysToAdd.length > 0) {
        const existing = await readKeyIndex();
        await writeKeyIndex(existing.concat(keysToAdd));
      }
    } catch (error) {
      console.error('❌ SecureStorage multiSet error:', error?.message || error);
      throw error;
    }
  },

  /**
   * Birden fazla değer al
   */
  async multiGet(keys) {
    try {
      const results = [];
      for (const key of keys) {
        try {
          const value = await SecureStore.getItemAsync(key);
          results.push([key, value]);
        } catch (keyError) {
          // Tek bir key için hata olsa bile devam et
          console.warn(`⚠️ SecureStorage getItem error for key "${key}":`, keyError.message || keyError);
          results.push([key, null]);
        }
      }
      return results;
    } catch (error) {
      // Genel hata durumu - tüm keyler için null döndür
      console.error('❌ SecureStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Değer sil
   */
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      await removeKeyFromIndex(key);
    } catch (error) {
      console.error(`❌ SecureStorage removeItem error for key "${key}":`, error);
    }
  },

  /**
   * Birden fazla değer sil
   */
  async multiRemove(keys) {
    try {
      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (keyError) {
          console.warn(`⚠️ secureStorage multiRemove error for key "${key}":`, keyError?.message || keyError);
        }
      }
      const existing = await readKeyIndex();
      const removeSet = new Set(keys);
      await writeKeyIndex(existing.filter(k => !removeSet.has(k)));
    } catch (error) {
      console.error('❌ SecureStorage multiRemove error:', error);
    }
  },

  /**
   * Tüm anahtarları al
   */
  async getAllKeys() {
    try {
      return await readKeyIndex();
    } catch (error) {
      console.error('❌ SecureStorage getAllKeys error:', error);
      return [];
    }
  },

  /**
   * Tüm verileri temizle
   */
  async clear() {
    try {
      const keys = await readKeyIndex();
      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (keyError) {
          console.warn(`⚠️ secureStorage clear error for key "${key}":`, keyError?.message || keyError);
        }
      }
      await SecureStore.deleteItemAsync(KEY_INDEX_STORAGE_KEY);
    } catch (error) {
      console.error('❌ SecureStorage clear error:', error);
    }
  },

  /**
   * Best-effort AsyncStorage -> SecureStore migrasyonu.
   * Uygulama açılışını bloklamamalı; başarılı taşınan key'ler AsyncStorage'dan silinir.
   */
  async migrateFromAsyncStorage() {
    // AsyncStorage dependency'si tamamen kalkana kadar izole kullanım.
    let AsyncStorage;
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      AsyncStorage = mod?.default || mod;
    } catch (e) {
      console.warn('⚠️ AsyncStorage migration import failed:', e?.message || e);
      return { migrated: [], skipped: [], errors: ['import_failed'] };
    }

    // Kodda kullanılan literal key'lerin listesi (best-effort).
    const candidateKeys = [
      'hasSeenOnboarding',
      'userId',
      'userName',
      'userEmail',
      'userPhone',
      'token',
      'authToken',
      'refreshToken',
      'tenantId',
      'userAvatar',
      'cartCount',
      'cartLastCleared',
      'cartLastModified',
      'analytics_device_id',
      'privacySettings',
      'twoFactorEnabled',
      'guestDeviceId',
      'spinWheelDiscountCode',
      'spinWheelDiscountPercent',
      'spinWheelDiscountDate',
      'appLanguage',
    ];

    const uniqueKeys = Array.from(new Set(candidateKeys));
    const migrated = [];
    const skipped = [];
    const errors = [];

    try {
      const pairs = await AsyncStorage.multiGet(uniqueKeys);
      const toSet = [];
      const toRemove = [];

      for (const [key, value] of pairs) {
        if (value === null || value === undefined) {
          skipped.push(key);
          continue;
        }
        toSet.push([key, value]);
        toRemove.push(key);
      }

      if (toSet.length > 0) {
        await this.multiSet(toSet);
      }
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
      }

      migrated.push(...toRemove);
    } catch (e) {
      console.warn('⚠️ AsyncStorage migration error:', e?.message || e);
      errors.push('migration_failed');
    }

    return { migrated, skipped, errors };
  }
};

export default secureStorage;
