import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarData } from '../../utils/formatarData';

interface EditalCardProps {
  item: {
    numero_controle_pncp: string;
    objeto_compra: string;
    orgao_razao_social: string;
    valor_total_estimado: number;
    uf: string;
    municipio: string;
    data_encerramento_proposta: string;
  };
  onPress: () => void;
}

export function EditalCard({ item, onPress }: EditalCardProps) {
  const valorFormatado = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(item.valor_total_estimado);

  const dataFim = formatarData(item.data_encerramento_proposta);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.ufBadge}>
          <Text style={styles.ufText}>{item.uf}</Text>
        </View>
        <Text style={styles.price}>{valorFormatado}</Text>
      </View>
      
      <Text style={styles.title} numberOfLines={2}>{item.objeto_compra}</Text>
      <Text style={styles.org} numberOfLines={1}>{item.orgao_razao_social}</Text>
      
      <View style={styles.footer}>
        <View style={styles.location}>
          <Ionicons name="location-outline" size={14} color="#94A3B8" />
          <Text style={styles.footerText}>{item.municipio}</Text>
        </View>
        <View style={styles.date}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.footerText}>Até {dataFim}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ufBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ufText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4, lineHeight: 22 },
  org: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#94A3B8' }
});