import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
}

export function FeatureCard({ icone, titulo, descricao }: Props) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.caixaIcone}>
        <Ionicons name={icone} size={20} color="#0F172A" />
      </View>
      <View style={estilos.conteudoTexto}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.descricao}>{descricao}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12},
  caixaIcone: { width: 40, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  conteudoTexto: { flex: 1 },
  titulo: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  descricao: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },
});