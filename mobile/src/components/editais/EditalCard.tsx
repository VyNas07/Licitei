import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchBadge } from './MatchBadge';

interface EditalCardProps {
  onPress: () => void;
  item: {
    id: string;
    modalidade?: string; // Adicionado ? para segurança
    uf?: string;         // Adicionado ? para segurança
    objeto?: string;     // Adicionado ? para segurança
    orgao?: string;      // Adicionado ? para segurança[cite: 2]
    valor?: number;
    dataLimite?: string;
    match?: 'Alta' | 'Média' | 'Baixa'; // Adicionado ? para segurança[cite: 2]
  };
}

export const EditalCard = ({ onPress, item }: EditalCardProps) => {
  // Proteção: Se o item não existir, não renderiza nada[cite: 2]
  if (!item) return null;

  // Proteção contra undefined ao converter para maiúsculas[cite: 2]
  const modalidadeTexto = item.modalidade?.toUpperCase() || 'DISPENSA';
  const ufTexto = item.uf?.toUpperCase() || 'PE';
  const matchValor = item.match || 'Média';
  
  // Lógica para definir se o badge deve ser "Atenção"[cite: 2]
  const displayMatch = (item.valor || 0) > 80000 ? 'Atenção' : matchValor;

  const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.modalidade}>
          {modalidadeTexto} · {ufTexto}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#64748B" />
      </View>

      <Text style={styles.objeto} numberOfLines={2}>
        {item.objeto || "Sem descrição"}
      </Text>

      <Text style={styles.orgao} numberOfLines={1}>
        {item.orgao || "Órgão não informado"}
      </Text>

      <View style={styles.footer}>
        <MatchBadge type={displayMatch as any} />
        
        <View style={styles.valorContainer}>
          <Text style={styles.valor}>{formatCurrency(item.valor)}</Text>
          <Text style={styles.data}>até 27 de abr. de 2026</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalidade: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  objeto: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 8,
  },
  orgao: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  valorContainer: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  data: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});