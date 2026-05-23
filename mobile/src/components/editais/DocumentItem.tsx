import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DocumentItemProps {
  readonly nome: string;
  readonly status: 'valido' | 'vencendo' | 'pendente';
  readonly validade: string;
  readonly onRemover?: () => void;
}

export const DocumentItem = ({ nome, status, validade, onRemover }: DocumentItemProps) => {
  const getConfig = () => {
    switch (status) {
      case 'valido':
        return { cor: '#10B981', fundo: '#F0FDF4', icone: 'checkmark-circle' };
      case 'vencendo':
        return { cor: '#F59E0B', fundo: '#FFFBEB', icone: 'alert-circle' };
      case 'pendente':
        return { cor: '#64748B', fundo: '#F1F5F9', icone: 'document-text' };
    }
  };

  const config = getConfig();

  return (
    <View style={estilos.container}>
      <View style={[estilos.iconeFundo, { backgroundColor: config.fundo }]}>
        <Ionicons name={config.icone as any} size={20} color={config.cor} />
      </View>
      
      <View style={estilos.textosContainer}>
        <Text style={estilos.nomeDocumento}>{nome}</Text>
        <Text style={estilos.validadeDocumento}>{validade}</Text>
      </View>

      {onRemover && (
        <TouchableOpacity onPress={onRemover} style={estilos.botaoRemover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconeFundo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosContainer: {
    flex: 1,
    marginLeft: 14,
  },
  nomeDocumento: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  validadeDocumento: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  botaoRemover: {
    padding: 4,
  },
});