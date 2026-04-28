import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Linking
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import api from '@/src/services/api';

interface DetalheEdital {
  numero_controle_pncp: string;
  objeto_compra: string;
  orgao_razao_social: string;
  orgao_cnpj?: string;
  valor_total_estimado: number;
  modalidade_nome: string;
  situacao_compra_nome: string;
  data_abertura_proposta?: string;
  data_encerramento_proposta: string;
  uf: string;
  municipio: string;
}

export default function TelaDetalheEdital() {
  const { id } = useLocalSearchParams();

  const editalId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [edital, setEdital] = useState<DetalheEdital | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    let mounted = true;

    const buscarDetalhes = async () => {
      try {
        setLoading(true);

        if (!API_URL) {
          console.error("API_URL não definida");
          return;
        }

        const response = await api.get(`${API_URL}/editais/${editalId}`);

        if (mounted) {
          setEdital(response.data);
        }

      } catch (error) {
        console.error("Erro ao buscar detalhes do edital:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (editalId) {
      buscarDetalhes();
    }

    return () => {
      mounted = false;
    };
  }, [editalId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (!edital) {
    return (
      <View style={styles.centered}>
        <Text>Edital não encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Detalhes da Licitação' }} />

      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.statusBadge}>{edital.situacao_compra_nome}</Text>
          <Text style={styles.modalidadeBadge}>{edital.modalidade_nome}</Text>
        </View>

        <Text style={styles.label}>Objeto da Compra</Text>
        <Text style={styles.titulo}>{edital.objeto_compra}</Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Valor Estimado</Text>
          <Text style={styles.priceValue}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(edital.valor_total_estimado)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Órgão</Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Instituição:</Text> {edital.orgao_razao_social}
          </Text>
          {edital.orgao_cnpj && (
            <Text style={styles.infoText}>
              <Text style={styles.bold}>CNPJ:</Text> {edital.orgao_cnpj}
            </Text>
          )}
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Localização:</Text> {edital.municipio} - {edital.uf}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prazos</Text>
          <View style={styles.dateRow}>
            {edital.data_abertura_proposta && (
              <View>
                <Text style={styles.dateLabel}>Abertura</Text>
                <Text style={styles.dateValue}>
                  {new Date(edital.data_abertura_proposta).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.dateLabel}>Encerramento</Text>
              <Text style={styles.dateValue}>
                {new Date(edital.data_encerramento_proposta).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Nº Controle PNCP: {edital.numero_controle_pncp}
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={() =>
            Linking.openURL(`https://pncp.gov.br/app/editais/${edital.numero_controle_pncp}`)
          }
        >
          <Text style={styles.buttonText}>Ver Edital Original no PNCP</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  loadingText: { marginTop: 10, color: '#8E8E93' },

  content: { padding: 20 },

  badgeContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },

  statusBadge: {
    backgroundColor: '#E1F5FE',
    color: '#01579B',
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold'
  },

  modalidadeBadge: {
    backgroundColor: '#F3E5F5',
    color: '#4A148C',
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold'
  },

  label: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 5
  },

  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20
  },

  priceCard: {
    backgroundColor: '#F2F2F7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25
  },

  priceLabel: {
    fontSize: 14,
    color: '#3A3A3C',
    marginBottom: 5
  },

  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759'
  },

  section: {
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 15
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 10
  },

  infoText: {
    fontSize: 15,
    color: '#3A3A3C',
    marginBottom: 5
  },

  bold: { fontWeight: 'bold' },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  dateLabel: {
    fontSize: 12,
    color: '#8E8E93'
  },

  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },

  footerNote: {
    fontSize: 12,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 10
  },

  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  }
});