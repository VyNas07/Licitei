import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TextInput, 
  View, 
  TouchableOpacity, 
  ActivityIndicator,
  Text 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

interface Edital {
  numero_controle_pncp: string;
  objeto_compra: string;
  orgao_razao_social: string;
  valor_total_estimado: number;
  uf: string;
  municipio: string;
  data_encerramento_proposta: string;
}

export default function ListagemEditais() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editais, setEditais] = useState<Edital[]>([]);
  const [busca, setBusca] = useState('');
  const [ufFiltro, setUfFiltro] = useState('');

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const carregarEditais = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/editais`, {
        params: {
          q: busca,
          uf: ufFiltro
        }
      });
      setEditais(response.data);
    } catch (error) {
      console.error("Erro ao carregar editais:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEditais();
  }, [ufFiltro]); 

  const renderItem = ({ item }: { item: Edital }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/edital/${item.numero_controle_pncp}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.ufBadge}>{item.uf}</Text>
        <Text style={styles.valor}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total_estimado)}
        </Text>
      </View>
      
      <Text style={styles.titulo} numberOfLines={2}>{item.objeto_compra}</Text>
      <Text style={styles.orgao}>{item.orgao_razao_social}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.cidade}>{item.municipio}</Text>
        <Text style={styles.data}>
          Expira em: {new Date(item.data_encerramento_proposta).toLocaleDateString('pt-BR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="Buscar editais (ex: TI, limpeza...)"
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={carregarEditais}
        />
        
        <View style={styles.filterContainer}>
          {['PE', 'SP', 'RJ', 'MG'].map((uf) => (
            <TouchableOpacity 
              key={uf} 
              style={[styles.filterBtn, ufFiltro === uf && styles.filterBtnActive]}
              onPress={() => setUfFiltro(ufFiltro === uf ? '' : uf)}
            >
              <Text style={[styles.filterText, ufFiltro === uf && styles.filterTextActive]}>{uf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={editais}
          keyExtractor={(item) => item.numero_controle_pncp}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum edital encontrado.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  filterBtnActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ufBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3A3A3C',
  },
  valor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  titulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  orgao: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 8,
  },
  cidade: {
    fontSize: 12,
    color: '#8E8E93',
  },
  data: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#8E8E93',
  }
});