import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectorCardProps {
  icone: any;
  nome: string;
  qtd: number;
}

export function SectorCard({ icone, nome, qtd }: SectorCardProps) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.fundoIcone}>
        <Ionicons name={icone} size={20} color="#0F172A" />
      </View>
      
      <View style={estilos.textos}>
        <Text style={estilos.nome}>{nome}</Text>
        <Text style={estilos.subtitulo}>Elétrica, hidráulica, refrigeração e mais</Text>
      </View>
      
      {/* Badge de Quantidade - Estilo igual à foto f0fb9b */}
      <View style={estilos.badgeQtd}>
        <Text style={estilos.textoQtd}>{qtd}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 24, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  fundoIcone: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 16 
  },
  textos: { flex: 1 },
  nome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  subtitulo: { fontSize: 12, color: '#64748B', marginTop: 4 },
  badgeQtd: { 
    backgroundColor: '#E0F2FE', 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  textoQtd: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#0F172A' 
  }
});