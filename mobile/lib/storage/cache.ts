import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setCache<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function deleteCache(key: string) {
  await AsyncStorage.removeItem(key);
}
