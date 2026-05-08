import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationProps {
  tipo: 'prazo' | 'preferencia' | 'documento';
  titulo: string;
  descricao: string;
  data: string;
  onPress?: () => void;
}

export function NotificationItem({ tipo, titulo, descricao, data, onPress }: NotificationProps) {
  const configs = {
    prazo: { icone: 'time' as const, cor: '#D97706', fundo: '#FEF3C7', label: 'Prazo' },
    preferencia: { icone: 'sparkles' as const, cor: '#16A34A', fundo: '#DCFCE7', label: 'Benefício MEI' },
    documento: { icone: 'alert-circle' as const, cor: '#EF4444', fundo: '#FEE2E2', label: 'Documento' },
  };

  const config = configs[tipo];

  return (
    <TouchableOpacity style={estilos.cartao} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[estilos.containerIcone, { backgroundColor: config.fundo }]}>
        <Ionicons name={config.icone} size={20} color={config.cor} />
      </View>
      <View style={estilos.conteudo}>
        <View style={estilos.linhaMeta}>
          <Text style={[estilos.textoEtiqueta, { color: config.cor }]}>{config.label}</Text>
          <Text style={estilos.textoData}>· {data}</Text>
        </View>
        <Text style={estilos.textoTitulo}>{titulo}</Text>
        <Text style={estilos.textoDescricao}>{descricao}</Text>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  cartao: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  containerIcone: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  conteudo: { flex: 1 },
  linhaMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  textoEtiqueta: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  textoData: { fontSize: 10, color: '#94A3B8' },
  textoTitulo: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  textoDescricao: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 }
});