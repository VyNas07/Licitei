import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

interface Props extends TouchableOpacityProps {
  texto: string;
}

export function Button({ texto, ...resto }: Props) {
  return (
    <TouchableOpacity style={estilos.botao} activeOpacity={0.8} {...resto}>
      <Text style={estilos.textoBotao}>{texto}</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botao: { marginTop: 8, backgroundColor: '#0F172A', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  textoBotao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});