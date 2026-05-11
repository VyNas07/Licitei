import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
}

export function GovbrButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={estilos.botao} onPress={onPress} activeOpacity={0.8}>
      <View style={estilos.badge}>
        <Text style={estilos.textoBadge}>gov.br</Text>
      </View>
      <Text style={estilos.textoBotao}>Entrar com Gov.br</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botao: { flexDirection: 'row', backgroundColor: '#1351B4', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  textoBadge: { color: '#1351B4', fontSize: 11, fontWeight: 'bold' },
  textoBotao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});