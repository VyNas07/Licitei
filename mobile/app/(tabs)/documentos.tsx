import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { DocumentItem } from '../../src/components/editais/DocumentItem';
import { UploadModal } from '../../src/components/documentos/UploadModal';
import { useDocumentos, type Documento } from '../../src/hooks/useDocumentos';

function labelValidade(doc: Documento): string {
  if (doc.validade) return `Válido até ${doc.validade}`;
  if (doc.status === 'valido') return 'Vencimento em dia';
  if (doc.status === 'vencido') return 'Documento vencido';
  return 'Não enviado';
}

export default function DocumentsScreen() {
  const [modalVisivel, setModalVisivel] = useState(false);
  const { documentos, carregando, erro, remover, carregar } = useDocumentos();

  return (
    <SafeAreaView style={estilos.recipientePrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <AuthHeader
        titulo="Documentos"
        subtitulo="Mantenha suas certidões sempre em dia"
        exibirVoltar={false}
      />

      <ScrollView
        style={estilos.rolagemPagina}
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.containerInterno}>
          <TouchableOpacity style={estilos.botaoUploadPrincipal} activeOpacity={0.9} onPress={() => setModalVisivel(true)}>
            <View style={estilos.circuloIcone}>
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
            </View>
            <Text style={estilos.textoBotao}>Enviar novo documento</Text>
          </TouchableOpacity>

          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>Meus documentos</Text>
            <Text style={estilos.textoContagem}>
              {carregando ? '...' : `${documentos.length} no total`}
            </Text>
          </View>

          {carregando ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 40 }} />
          ) : erro ? (
            <View style={estilos.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color="#FCA5A5" />
              <Text style={estilos.erroText}>Não foi possível carregar os documentos.</Text>
              <Text style={estilos.emptySubText}>Verifique sua conexão e tente novamente.</Text>
            </View>
          ) : documentos.length === 0 ? (
            <View style={estilos.emptyState}>
              <Ionicons name="document-outline" size={48} color="#CBD5E1" />
              <Text style={estilos.emptyText}>Nenhum documento cadastrado.</Text>
              <Text style={estilos.emptySubText}>
                Envie suas certidões para participar de licitações.
              </Text>
            </View>
          ) : (
            documentos.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                onLongPress={() => remover(doc.id, doc.nome)}
                activeOpacity={0.85}
              >
                <DocumentItem
                  nome={doc.nome}
                  status={doc.status === 'vencido' ? 'pendente' : doc.status}
                  validade={labelValidade(doc)}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={estilos.cartaoInformativo}>
          <Ionicons name="shield-checkmark" size={20} color="#0F172A" />
          <Text style={estilos.textoInformativo}>
            Suas certidões são armazenadas com criptografia de ponta a ponta.
          </Text>
        </View>
      </ScrollView>

      <UploadModal
        visivel={modalVisivel}
        onFechar={() => setModalVisivel(false)}
        onSucesso={() => { setModalVisivel(false); carregar(); }}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipientePrincipal: { flex: 1, backgroundColor: '#0F172A' },
  rolagemPagina: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 110 },
  containerInterno: { paddingHorizontal: 20 },
  botaoUploadPrincipal: { backgroundColor: '#0F172A', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 8, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  circuloIcone: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textoBotao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  cabecalhoSecao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35, marginBottom: 15 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  textoContagem: { fontSize: 12, color: '#64748B' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 12, fontWeight: '600' },
  erroText: { color: '#DC2626', fontSize: 14, marginTop: 12, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  cartaoInformativo: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  textoInformativo: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
});
