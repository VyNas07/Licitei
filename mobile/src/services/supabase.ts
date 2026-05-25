import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// SecureStore tem limite de 2048 bytes por chave.
// O token do Supabase pode ultrapassar esse limite, então dividimos em chunks.
const CHUNK_SIZE = 1900

async function setLargeItem(key: string, value: string): Promise<void> {
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }
  await SecureStore.setItemAsync(`${key}__count`, String(chunks.length))
  await Promise.all(
    chunks.map((chunk, idx) => SecureStore.setItemAsync(`${key}__${idx}`, chunk))
  )
}

async function getLargeItem(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`)
  if (!countStr) return null
  const count = parseInt(countStr, 10)
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__${i}`))
  )
  if (chunks.some(c => c === null)) return null
  return chunks.join('')
}

async function removeLargeItem(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`)
  if (!countStr) return
  const count = parseInt(countStr, 10)
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}__count`),
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}__${i}`)),
  ])
}

const secureStorage = Platform.OS !== 'web'
  ? {
      getItem: getLargeItem,
      setItem: setLargeItem,
      removeItem: removeLargeItem,
    }
  : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
