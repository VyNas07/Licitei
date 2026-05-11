import React from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { DocumentItem } from '../../src/components/editais/DocumentItem';
// Importa a lista oficial de documentos que você possui
import { MEUS_DOCUMENTOS_CADASTRADOS } from '../../src/lib/mock-data';

export default function DocumentsScreen() {
  // Mapeia os documentos cadastrados para o formato visual da tela[cite: 7]
  const listaExibicao = MEUS_DOCUMENTOS_CADASTRADOS.map(nome => ({
    nome,
    status: "valido" as const,
    validade: "Vencimento em dia"
  }));

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
          <TouchableOpacity style={estilos.botaoUploadPrincipal} activeOpacity={0.9}>
            <View style={estilos.circuloIcone}>
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
            </View>
            <Text style={estilos.textoBotao}>Enviar novo documento</Text>
          </TouchableOpacity>

          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>Meus documentos</Text>
            <Text style={estilos.textoContagem}>{listaExibicao.length} no total</Text>
          </View>

          {listaExibicao.map((item, index) => (
            <DocumentItem 
              key={index}
              nome={item.nome}
              status={item.status}
              validade={item.validade}
            />
          ))}

          {/* Exemplo de documento pendente que não está na lista oficial para teste[cite: 5, 7] */}
          <DocumentItem 
            nome="Portfólio de Apps"
            status="pendente"
            validade="Não enviado"
          />
        </View>

        <View style={estilos.cartaoInformativo}>
          <Ionicons name="shield-checkmark" size={20} color="#0F172A" />
          <Text style={estilos.textoInformativo}>
            Suas certidões são armazenadas com criptografia de ponta a ponta.
          </Text>
        </View>
      </ScrollView>
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
  cartaoInformativo: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  textoInformativo: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 }
});