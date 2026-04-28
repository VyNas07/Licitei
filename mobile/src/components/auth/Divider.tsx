import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Divider() {
  return (
    <View style={estilos.container}>
      <View style={estilos.linha} />
      <Text style={estilos.texto}>OU</Text>
      <View style={estilos.linha} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  linha: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  texto: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
});