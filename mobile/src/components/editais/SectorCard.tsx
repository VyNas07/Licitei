import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectorCardProps {
  icone: keyof typeof Ionicons.glyphMap;
  nome: string;
  descricao: string;
  quantidade: number;
  aoPressionar: () => void;
}

export function SectorCard({ icone, nome, descricao, quantidade, aoPressionar }: SectorCardProps) {
  return (
    <TouchableOpacity style={estilos.cartaoSetor} onPress={aoPressionar} activeOpacity={0.7}>
      <View style={estilos.containerIcone}>
        <Ionicons name={icone} size={24} color="#0F172A" />
      </View>
      <View style={estilos.conteudoTexto}>
        <Text style={estilos.tituloSetor}>{nome}</Text>
        <Text style={estilos.descricaoSetor} numberOfLines={1}>{descricao}</Text>
      </View>
      <View style={estilos.badgeQuantidade}>
        <Text style={estilos.textoQuantidade}>{quantidade}</Text>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  cartaoSetor: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  containerIcone: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  conteudoTexto: { flex: 1, marginLeft: 16 },
  tituloSetor: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  descricaoSetor: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badgeQuantidade: { 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  textoQuantidade: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' }
});