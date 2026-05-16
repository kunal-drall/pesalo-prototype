import * as SecureStore from "expo-secure-store";

export async function setSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function getSecureItem(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}
