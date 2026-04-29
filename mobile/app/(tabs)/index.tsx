import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { EditalCard } from '../../src/components/editais/EditalCard';

interface Edital {
  numero_controle_pncp: string;
  objeto_compra: string;
  orgao_razao_social: string;
  valor_total_estimado: number;
  uf: string;
  municipio: string;
  data_encerramento_proposta: string;
}

const LIMIT = 20;

export default function EditaisScreen() {
  const router = useRouter();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');

  const buscarEditais = useCallback(async (novaPagina: number, termo: string, substituir: boolean) => {
    try {
      const { data } = await api.get('/editais', {
        params: { page: novaPagina, limit: LIMIT, q: termo || undefined },
      });
      const novos: Edital[] = data.data ?? [];
      setEditais((prev: Edital[]) => {
        if (substituir) return novos;
        const ids = new Set(prev.map(e => e.numero_controle_pncp));
        return [...prev, ...novos.filter(e => !ids.has(e.numero_controle_pncp))];
      });
      setHasMore(novaPagina < (data.pages ?? 1));
      setPage(novaPagina);
    } catch (err) {
      console.error('Erro ao buscar editais:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    buscarEditais(1, '', true).finally(() => setLoading(false));
  }, [buscarEditais]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await buscarEditais(1, buscaAtiva, true);
    setRefreshing(false);
  }, [buscarEditais, buscaAtiva]);

  const handleCarregarMais = useCallback(async () => {
    if (!hasMore || loading) return;
    await buscarEditais(page + 1, buscaAtiva, false);
  }, [hasMore, loading, page, buscaAtiva, buscarEditais]);

  const handleBuscar = useCallback(async () => {
    setBuscaAtiva(busca);
    setLoading(true);
    await buscarEditais(1, busca, true);
    setLoading(false);
  }, [busca, buscarEditais]);

  const renderItem = useCallback(({ item }: { item: Edital }) => (
    <EditalCard
      item={item}
      onPress={() => router.push(`/edital/${encodeURIComponent(item.numero_controle_pncp)}`)}
    />
  ), [router]);

  const renderRodape = useCallback(() => {
    if (!hasMore) return null;
    return (
      <ActivityIndicator
        size="small"
        color="#0F172A"
        style={estilos.loadingRodape}
      />
    );
  }, [hasMore]);

  function renderConteudo() {
    if (loading && editais.length === 0) {
      return (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={estilos.textoCarregando}>Buscando editais...</Text>
        </View>
      );
    }
    if (editais.length === 0) {
      return (
        <View style={estilos.centrado}>
          <Ionicons name="search-outline" size={48} color="#CBD5E1" />
          <Text style={estilos.textoVazio}>Nenhum edital encontrado.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={editais}
        keyExtractor={(item: Edital) => item.numero_controle_pncp}
        renderItem={renderItem}
        contentContainerStyle={estilos.lista}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleCarregarMais}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderRodape}
      />
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Editais</Text>
        <View style={estilos.campoBusca}>
          <Ionicons name="search" size={16} color="#94A3B8" style={estilos.iconeBusca} />
          <TextInput
            style={estilos.inputBusca}
            placeholder="Buscar por objeto..."
            placeholderTextColor="#94A3B8"
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={handleBuscar}
            returnKeyType="search"
          />
          {busca.length > 0 && (
            <Ionicons
              name="close-circle"
              size={16}
              color="#94A3B8"
              onPress={() => { setBusca(''); setBuscaAtiva(''); buscarEditais(1, '', true); }}
            />
          )}
        </View>
      </View>

      {renderConteudo()}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#0F172A', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  campoBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  iconeBusca: { marginRight: 8 },
  inputBusca: { flex: 1, color: '#FFF', fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  textoCarregando: { color: '#64748B', fontSize: 14 },
  textoVazio: { color: '#94A3B8', fontSize: 14 },
  loadingRodape: { marginVertical: 16 },
});
