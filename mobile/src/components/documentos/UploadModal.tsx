import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import api from '../../services/api';

const TIPOS = [
  { valor: 'certidao_negativa', rotulo: 'Certidão Negativa' },
  { valor: 'contrato_social', rotulo: 'Contrato Social / CCMEI' },
  { valor: 'comprovante_endereco', rotulo: 'Comprovante de Endereço' },
  { valor: 'cnpj', rotulo: 'Cartão CNPJ' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

type TipoDocumento = typeof TIPOS[number]['valor']

interface Props {
  visivel: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function UploadModal({ visivel, onFechar, onSucesso }: Props) {
  const [tipo, setTipo] = useState<TipoDocumento | null>(null);
  const [arquivo, setArquivo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [enviando, setEnviando] = useState(false);

  function resetar() {
    setTipo(null);
    setArquivo(null);
    setEnviando(false);
  }

  function fechar() {
    resetar();
    onFechar();
  }

  async function selecionarArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (!resultado.canceled && resultado.assets.length > 0) {
      setArquivo(resultado.assets[0]);
    }
  }

  async function enviar() {
    if (!tipo || !arquivo) {
      Alert.alert('Atenção', 'Selecione o tipo e o arquivo antes de enviar.');
      return;
    }

    setEnviando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const userId = session.user.id;
      const ext = arquivo.name.split('.').pop() ?? 'pdf';
      const storagePath = `${userId}/${Date.now()}.${ext}`;

      const resposta = await fetch(arquivo.uri);
      const blob = await resposta.blob();

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, blob, { contentType: arquivo.mimeType ?? 'application/pdf' });

      if (uploadError) throw new Error(uploadError.message);

      await api.post('/documentos', {
        nome: arquivo.name,
        tipo,
        url: storagePath,
        status: 'pendente',
      });

      resetar();
      onSucesso();
    } catch (e) {
      Alert.alert('Erro no upload', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={estilos.fundo}>
        <View style={estilos.folha}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Enviar documento</Text>
            <TouchableOpacity onPress={fechar} disabled={enviando}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={estilos.rotulo}>Tipo de documento</Text>
            <View style={estilos.gridTipos}>
              {TIPOS.map((t) => (
                <TouchableOpacity
                  key={t.valor}
                  style={[estilos.chipTipo, tipo === t.valor && estilos.chipTipoAtivo]}
                  onPress={() => setTipo(t.valor)}
                >
                  <Text style={[estilos.textoChip, tipo === t.valor && estilos.textoChipAtivo]}>
                    {t.rotulo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={estilos.rotulo}>Arquivo</Text>
            <TouchableOpacity style={estilos.botaoArquivo} onPress={selecionarArquivo} activeOpacity={0.8}>
              <Ionicons
                name={arquivo ? 'document-attach' : 'cloud-upload-outline'}
                size={20}
                color={arquivo ? '#16A34A' : '#64748B'}
              />
              <Text style={[estilos.textoArquivo, arquivo && estilos.textoArquivoSelecionado]} numberOfLines={1}>
                {arquivo ? arquivo.name : 'Selecionar PDF ou imagem'}
              </Text>
              {arquivo && (
                <TouchableOpacity onPress={() => setArquivo(null)}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={estilos.dica}>Formatos aceitos: PDF, JPG, PNG</Text>
          </ScrollView>

          <TouchableOpacity
            style={[estilos.botaoEnviar, (!tipo || !arquivo || enviando) && estilos.botaoDesabilitado]}
            onPress={enviar}
            disabled={!tipo || !arquivo || enviando}
            activeOpacity={0.85}
          >
            {enviando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={estilos.textoBotaoEnviar}>Enviar documento</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  folha: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  rotulo: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  gridTipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipTipo: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipTipoAtivo: { borderColor: '#0F172A', backgroundColor: '#0F172A' },
  textoChip: { fontSize: 13, color: '#475569', fontWeight: '500' },
  textoChipAtivo: { color: '#FFF' },
  botaoArquivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  textoArquivo: { flex: 1, fontSize: 14, color: '#94A3B8' },
  textoArquivoSelecionado: { color: '#0F172A', fontWeight: '500' },
  dica: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  botaoEnviar: {
    marginTop: 28,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  botaoDesabilitado: { backgroundColor: '#CBD5E1', elevation: 0, shadowOpacity: 0 },
  textoBotaoEnviar: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
