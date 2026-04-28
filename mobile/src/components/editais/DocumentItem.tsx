import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  nome: string;
  status: 'valido' | 'vencendo' | 'pendente';
  validade: string;
}

export function DocumentItem({ nome, status, validade }: Props) {
  const configurarStatus = () => {
    switch (status) {
      case 'valido':
        return { icone: 'checkmark-circle' as const, cor: '#16A34A', fundo: '#DCFCE7' };
      case 'vencendo':
        return { icone: 'alert-circle' as const, cor: '#D97706', fundo: '#FEF3C7' };
      default:
        return { icone: 'document-text' as const, cor: '#64748B', fundo: '#F1F5F9' };
    }
  };

  const config = configurarStatus();

  return (
    <View style={estilos.cartaoDocumento}>
      <View style={[estilos.containerIcone, { backgroundColor: config.fundo }]}>
        <Ionicons name={config.icone} size={22} color={config.cor} />
      </View>
      <View style={estilos.areaTexto}>
        <Text style={estilos.nomeArquivo}>{nome}</Text>
        <Text style={estilos.textoValidade}>{validade}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </View>
  );
}

const estilos = StyleSheet.create({
  cartaoDocumento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  containerIcone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaTexto: { flex: 1, marginLeft: 16 },
  nomeArquivo: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  textoValidade: { fontSize: 12, color: '#64748B', marginTop: 2 },
});