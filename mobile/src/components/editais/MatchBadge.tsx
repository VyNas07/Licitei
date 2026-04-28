import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MatchBadgeProps {
  nivel: 'high' | 'medium' | 'low';
}

export function MatchBadge({ nivel }: MatchBadgeProps) {
  const mapa = {
    high: { rotulo: "Alta compatibilidade", cor: '#22C55E', fundo: '#DCFCE7' },
    medium: { rotulo: "Atenção", cor: '#D97706', fundo: '#FEF3C7' },
    low: { rotulo: "Baixa compatibilidade", cor: '#EF4444', fundo: '#FEE2E2' },
  } as const;

  const config = mapa[nivel];

  return (
    <View style={[estilos.recipiente, { backgroundColor: config.fundo, borderColor: config.cor + '4D' }]}>
      <View style={[estilos.ponto, { backgroundColor: config.cor }]} />
      <Text style={[estilos.texto, { color: config.cor }]}>{config.rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  recipiente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  texto: {
    fontSize: 11,
    fontWeight: '600',
  },
});