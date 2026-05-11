import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  titulo: string;
  preco: string;
  descricao: string;
  funcionalidades: string[];
  destaque?: boolean;
  textoBotao: string;
  onPress: () => void;
}

export function PlanCard({ titulo, preco, descricao, funcionalidades, destaque, textoBotao, onPress }: Props) {
  return (
    <View style={[estilos.cartao, destaque && estilos.cartaoDestaque]}>
      {destaque && (
        <View style={estilos.badgeDestaque}>
          <Ionicons name="sparkles" size={10} color="#FFF" />
          <Text style={estilos.textoBadge}>RECOMENDADO</Text>
        </View>
      )}
      
      <View style={estilos.cabecalho}>
        <Text style={[estilos.titulo, destaque && { color: '#0F172A' }]}>{titulo}</Text>
        <Text style={[estilos.preco, destaque && { color: '#0F172A' }]}>
          {preco}<Text style={estilos.periodo}>/mês</Text>
        </Text>
      </View>
      
      <Text style={[estilos.descricao, destaque && { color: '#334155' }]}>{descricao}</Text>
      
      <View style={estilos.listaFuncionalidades}>
        {funcionalidades.map((item, index) => (
          <View key={index} style={estilos.itemFuncionalidade}>
            <Ionicons name="checkmark-circle" size={14} color={destaque ? "#10B981" : "#64748B"} />
            <Text style={[estilos.textoFuncionalidade, destaque && { color: '#0F172A', fontWeight: '500' }]}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={destaque ? estilos.botaoDestaque : estilos.botaoNormal}
        onPress={onPress}
      >
        <Text style={destaque ? estilos.textoBotaoDestaque : estilos.textoBotaoNormal}>{textoBotao}</Text>
        {destaque && <Ionicons name="arrow-forward" size={16} color="#FFF" />}
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 20, marginTop: 16 },
  cartaoDestaque: { backgroundColor: '#F8FAFC', borderColor: '#0F172A', borderWidth: 2, marginTop: 24 },
  badgeDestaque: { position: 'absolute', top: -12, left: 20, backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoBadge: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  preco: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  periodo: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  descricao: { fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 18 },
  listaFuncionalidades: { marginTop: 16, gap: 8 },
  itemFuncionalidade: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textoFuncionalidade: { fontSize: 12, color: '#64748B' },
  botaoNormal: { marginTop: 20, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.25)', alignItems: 'center', justifyContent: 'center' },
  textoBotaoNormal: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
  botaoDestaque: { marginTop: 20, height: 48, borderRadius: 12, backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  textoBotaoDestaque: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});