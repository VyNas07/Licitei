import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onPress: () => void;
}

export function CtaBox({ onPress }: Props) {
  return (
    <View style={estilos.caixa}>
      <Text style={estilos.titulo}>Pronto para sua primeira disputa?</Text>
      <Text style={estilos.descricao}>Crie sua conta com CNPJ e comece a receber oportunidades hoje mesmo.</Text>
      <TouchableOpacity style={estilos.botao} onPress={onPress}>
        <Text style={estilos.textoBotao}>Criar conta</Text>
        <Ionicons name="arrow-forward" size={16} color="#0F172A" />
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20, marginTop: 32, marginHorizontal: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: -0.5 },
  descricao: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 18 },
  botao: { marginTop: 16, height: 44, backgroundColor: '#FFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  textoBotao: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
});