import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: estilos.barraTab,
        tabBarLabelStyle: estilos.labelTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <View style={[estilos.containerIcone, focused && estilos.fundoAtivo]}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="disputas"
        options={{
          title: 'Disputas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[estilos.containerIcone, focused && estilos.fundoAtivo]}>
              <Ionicons name={focused ? "trophy" : "trophy-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="alertas"
        options={{
          href: null, 
        }}
      />

      <Tabs.Screen
        name="planos"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="documentos" 
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, focused }) => (
            <View style={[estilos.containerIcone, focused && estilos.fundoAtivo]}>
              <Ionicons name={focused ? "document-text" : "document-text-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <View style={[estilos.containerIcone, focused && estilos.fundoAtivo]}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barraTab: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
  labelTab: {
    fontSize: 11,
    fontWeight: '600',
  },
  containerIcone: {
    width: 45,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundoAtivo: {
    backgroundColor: '#F1F5F9',
  },
});