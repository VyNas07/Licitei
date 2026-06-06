import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('onboarding_concluido');
        setOnboardingDone(value === 'true');
      } catch (e) {
        setOnboardingDone(false);
      }
    };
    
    checkOnboarding();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || onboardingDone === null) return;
    
    const inTabs = segments[0] === '(tabs)';
    const inAuth = segments[0] === '(auth)';
    const inRoot = pathname === '/';
    const inPaywall = pathname === '/paywall';
    const inOnboarding = pathname === '/onboarding';

    if (session) {
      if (inAuth || inRoot || inPaywall) {
        if (onboardingDone) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding');
        }
      }
    } else if (inTabs || inOnboarding || pathname === '/completar-perfil') {
      router.replace('/(auth)/login');
    }
  }, [session, loading, onboardingDone, segments, pathname, router]);

  if (loading || onboardingDone === null) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}