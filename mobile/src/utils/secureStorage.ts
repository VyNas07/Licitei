import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore tem limite de 2048 bytes por chave.
 * Tokens do Supabase e checklists podem ultrapassar esse limite,
 * então dividimos o valor em chunks e armazenamos separadamente.
 */
const CHUNK_SIZE = 1900;

export async function secureSet(key: string, value: string): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}__count`, String(chunks.length));
  await Promise.all(
    chunks.map((chunk, idx) => SecureStore.setItemAsync(`${key}__${idx}`, chunk))
  );
}

export async function secureGet(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`);
  if (!countStr) return null;
  const count = Number.parseInt(countStr, 10);
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__${i}`))
  );
  if (chunks.some(c => c === null)) return null;
  return chunks.join('');
}

export async function secureRemove(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`);
  if (!countStr) return;
  const count = Number.parseInt(countStr, 10);
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}__count`),
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}__${i}`)),
  ]);
}
