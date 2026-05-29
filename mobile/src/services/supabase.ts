import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { secureGet, secureSet, secureRemove } from '../utils/secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const secureStorage = Platform.OS === 'web'
  ? undefined
  : {
      getItem: secureGet,
      setItem: secureSet,
      removeItem: secureRemove,
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
