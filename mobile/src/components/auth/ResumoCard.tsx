import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ResumoCardProps {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: number;
  estiloIcone: any;
}

export function ResumoCard({ icone, rotulo, valor, estiloIcone }: ResumoCardProps) {
  return (
    <View style={estilos.cartao}>
      <View style={[estilos.containerIcone, estiloIcone]}>
        <Ionicons name={icone} size={16} color={estiloIcone.color || "#FFF"} />
      </View>
      <View>
        <Text style={estilos.valorTexto}>{valor}</Text>
        <Text style={estilos.rotuloTexto}>{rotulo}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  containerIcone: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorTexto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  rotuloTexto: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});