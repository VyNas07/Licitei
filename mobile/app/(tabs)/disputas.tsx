import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { ResumoCard } from '../../src/components/auth/ResumoCard';
import { EditalCard } from '../../src/components/editais/EditalCard';
import api from '../../src/services/api';

interface Participacao {
  id: string;
  licitacao_id: string;
  status: 'acompanhando' | 'proposta_enviada' | 'venceu' | 'perdeu' | 'desistiu';
  objeto_compra: string;
  orgao_nome: string;
  valor_estimado: number;
  data_encerramento: string;
}

export default function TelaDisputas() {
  const navegador = useRouter();
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/participacoes')
      .then(({ data }) => setParticipacoes(data.data ?? []))
      .catch(() => setParticipacoes([]))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = useMemo(() => [
    {
      icone: 'create-outline' as const,
      rotulo: 'Acompanhando',
      valor: participacoes.filter(p => p.status === 'acompanhando').length,
      estilo: { backgroundColor: '#F1F5F9', color: '#0F172A' },
    },
    {
      icone: 'send-outline' as const,
      rotulo: 'Proposta enviada',
      valor: participacoes.filter(p => p.status === 'proposta_enviada').length,
      estilo: { backgroundColor: '#FEF3C7', color: '#D97706' },
    },
    {
      icone: 'checkmark-circle-outline' as const,
      rotulo: 'Finalizadas',
      valor: participacoes.filter(p => ['venceu', 'perdeu', 'desistiu'].includes(p.status)).length,
      estilo: { backgroundColor: '#DCFCE7', color: '#16A34A' },
    },
  ], [participacoes]);

  return (
    <SafeAreaView style={estilos.recipiente}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <AuthHeader 
        titulo="Minhas Disputas" 
        subtitulo="Acompanhe o andamento das suas participações" 
        exibirVoltar={false}
      />

      <ScrollView 
        style={estilos.rolagem} 
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        {/* Cards de Resumo */}
        <View style={estilos.secaoResumo}>
          {resumo.map((item) => (
            <ResumoCard 
              key={item.rotulo}
              icone={item.icone}
              rotulo={item.rotulo}
              valor={item.valor}
              estiloIcone={item.estilo}
            />
          ))}
        </View>

        {/* Lista de Editais Participando */}
        <View style={estilos.secaoLista}>
          <View style={estilos.cabecalhoLista}>
            <Text style={estilos.tituloSecao}>Minhas participações</Text>
            <TouchableOpacity>
               <Ionicons name="filter-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 40 }} />
          ) : participacoes.length === 0 ? (
            <View style={estilos.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={estilos.emptyText}>Nenhuma participação ainda.</Text>
            </View>
          ) : participacoes.map((p) => (
            <EditalCard
              key={p.id}
              onPress={() => navegador.push(`/edital/${p.licitacao_id}`)}
              item={{
                id: p.licitacao_id,
                objeto: p.objeto_compra,
                orgao: p.orgao_nome,
                valor: p.valor_estimado,
                dataLimite: p.data_encerramento,
                modalidade: p.status,
              }}
            />
          ))}
        </View>

        {/* Card de Incentivo */}
        <View style={estilos.cartaoIncentivo}>
          <Text style={estilos.tituloIncentivo}>Quer ver mais oportunidades?</Text>
          <Text style={estilos.descIncentivo}>
            Volte ao painel inicial para descobrir novos editais compatíveis com seu CNAE.
          </Text>
          <TouchableOpacity 
            style={estilos.botaoExplorar}
            onPress={() => navegador.replace('/(tabs)')}
          >
            <Text style={estilos.textoBotaoExplorar}>Explorar editais</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipiente: { flex: 1, backgroundColor: '#0F172A' },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 110 },
  secaoResumo: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 10 },
  secaoLista: { marginTop: 32, paddingHorizontal: 20 },
  cabecalhoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  emptyText: { 
    color: '#64748B', 
    fontSize: 14, 
    marginTop: 12,
    textAlign: 'center' 
  },
  cartaoIncentivo: { 
    marginHorizontal: 20, 
    marginTop: 24, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(15, 23, 42, 0.1)' 
  },
  tituloIncentivo: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  descIncentivo: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 18 },
  botaoExplorar: { backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  textoBotaoExplorar: { color: '#FFF', fontSize: 14, fontWeight: 'bold' }
});