import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function IconEditais({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="search" size={size} color={color} />;
}

function IconAlertas({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="notifications-outline" size={size} color={color} />;
}

function IconPerfil({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="person-outline" size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Editais', tabBarIcon: IconEditais }}
      />
      <Tabs.Screen
        name="alertas"
        options={{ title: 'Alertas', tabBarIcon: IconAlertas }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: IconPerfil }}
      />
    </Tabs>
  );
}
