import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeft } from 'lucide-react-native';
import { useChecklist } from '../../src/hooks/useChecklist';

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { itens, carregando, gerado, respostaRaw, gerar, toggle, concluidos, progresso } = useChecklist(id ?? '');

  return (
    <SafeAreaView style={estilos.recipiente}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={estilos.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.botaoVoltar}>
          <ArrowLeft color="#FFFFFF" size={16} />
          <Text style={estilos.textoVoltar}>Voltar</Text>
        </TouchableOpacity>
        <Text style={estilos.tag}>CHECKLIST • RF02</Text>
        <Text style={estilos.titulo}>Checklist de Habilitação</Text>
        <Text style={estilos.subtitulo} numberOfLines={2}>
          Edital: {id}
        </Text>
      </View>

      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        {gerado && itens.length > 0 && (
          <View style={estilos.cardProgresso}>
            <View style={estilos.cabecalhoProgresso}>
              <Text style={estilos.textoProgresso}>Progresso</Text>
              <Text style={estilos.porcentagem}>{concluidos}/{itens.length} itens</Text>
            </View>
            <View style={estilos.barraFundo}>
              <View style={[estilos.barraPreenchida, { width: `${progresso}%` }]} />
            </View>
            {concluidos === itens.length && itens.length > 0 && (
              <View style={estilos.badgeConcluido}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={estilos.textoConcluido}>Checklist completo!</Text>
              </View>
            )}
          </View>
        )}

        {!gerado && !carregando && (
          <View style={estilos.estadoInicial}>
            <View style={estilos.circuloIA}>
              <Ionicons name="sparkles" size={32} color="#0F172A" />
            </View>
            <Text style={estilos.tituloIA}>Checklist com IA</Text>
            <Text style={estilos.descricaoIA}>
              A IA vai analisar o edital e gerar automaticamente a lista de documentos e requisitos necessários para sua habilitação.
            </Text>
            <TouchableOpacity style={estilos.botaoGerar} onPress={gerar} activeOpacity={0.85}>
              <Ionicons name="flash" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoGerar}>Gerar checklist</Text>
            </TouchableOpacity>
          </View>
        )}

        {carregando && (
          <View style={estilos.estadoCarregando}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={estilos.textoCarregando}>Analisando edital com IA...</Text>
            <Text style={estilos.subTextoCarregando}>Isso pode levar alguns segundos</Text>
          </View>
        )}

        {gerado && itens.length > 0 && (
          <View style={estilos.secaoItens}>
            <Text style={estilos.tituloSecao}>Itens do checklist</Text>
            {itens.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[estilos.itemChecklist, item.concluido && estilos.itemConcluido]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.7}
              >
                <View style={[estilos.circuloCheck, item.concluido && estilos.circuloCheckAtivo]}>
                  {item.concluido && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[estilos.textoItem, item.concluido && estilos.textoItemConcluido]}>
                  {item.texto}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {gerado && itens.length === 0 && respostaRaw.length > 0 && (
          <View style={estilos.cardRespostaRaw}>
            <Text style={estilos.tituloSecao}>Resposta da IA</Text>
            <Text style={estilos.textoRaw}>{respostaRaw}</Text>
          </View>
        )}

        {gerado && (
          <TouchableOpacity style={estilos.botaoRegenerar} onPress={gerar} activeOpacity={0.8}>
            <Ionicons name="refresh" size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={estilos.textoRegenerar}>Regenerar checklist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipiente: { flex: 1, backgroundColor: '#0F172A' },
  cabecalho: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  botaoVoltar: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: -25 },
  textoVoltar: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 6 },
  tag: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  titulo: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6, lineHeight: 28 },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  cardProgresso: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cabecalhoProgresso: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  textoProgresso: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  porcentagem: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  barraFundo: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barraPreenchida: { height: 8, backgroundColor: '#0F172A', borderRadius: 4 },
  badgeConcluido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
  },
  textoConcluido: { color: '#16A34A', fontSize: 13, fontWeight: '600' },

  estadoInicial: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  circuloIA: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tituloIA: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  descricaoIA: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  botaoGerar: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  textoBotaoGerar: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  estadoCarregando: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textoCarregando: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginTop: 20 },
  subTextoCarregando: { fontSize: 12, color: '#94A3B8', marginTop: 6 },

  secaoItens: { marginTop: 4 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 14 },
  itemChecklist: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  itemConcluido: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  circuloCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  circuloCheckAtivo: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  textoItem: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  textoItemConcluido: { color: '#64748B', textDecorationLine: 'line-through' },

  cardRespostaRaw: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textoRaw: { fontSize: 13, color: '#475569', lineHeight: 20 },

  botaoRegenerar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  textoRegenerar: { fontSize: 13, color: '#64748B' },
});
