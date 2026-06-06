import { useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { usePerfil } from '../../src/hooks/usePerfil';
import { supabase } from '../../src/services/supabase';
import api from '../../src/services/api';

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function iniciaisAvatar(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function TelaPerfil() {
  const { perfil, loading, erro, recarregar } = usePerfil();
  const [excluindoConta, setExcluindoConta] = useState(false);
  const [editandoCnae, setEditandoCnae] = useState(false);
  const [cnaeEditado, setCnaeEditado] = useState('');
  const [ramoEditado, setRamoEditado] = useState('');
  const [salvandoCnae, setSalvandoCnae] = useState(false);

  function iniciarEdicaoCnae() {
    setCnaeEditado(perfil?.cnae ?? '');
    setRamoEditado(perfil?.ramo_atuacao ?? '');
    setEditandoCnae(true);
  }

  async function salvarCnae() {
    if (!cnaeEditado.trim() && !ramoEditado.trim()) {
      setEditandoCnae(false);
      return;
    }
    setSalvandoCnae(true);
    try {
      await api.put('/perfil', {
        ...(cnaeEditado.trim() && { cnae: cnaeEditado.trim() }),
        ...(ramoEditado.trim() && { ramo_atuacao: ramoEditado.trim() }),
      });
      setEditandoCnae(false);
      recarregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvandoCnae(false);
    }
  }

  const handleExcluirConta = () => {
    Alert.alert(
      'Excluir conta',
      'Todos os seus dados serão removidos permanentemente (LGPD). Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setExcluindoConta(true);
            try {
              await api.delete('/perfil/account');
              await supabase.auth.signOut();
            } catch {
              setExcluindoConta(false);
              Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  let conteudo: ReactNode = null;

  if (loading) {
    conteudo = (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  } else if (erro) {
    conteudo = (
      <View style={estilos.centrado}>
        <Text style={estilos.textoErro}>{erro}</Text>
        <TouchableOpacity style={estilos.botaoRecarregar} onPress={recarregar}>
          <Text style={estilos.textoBotaoRecarregar}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (perfil) {
    conteudo = (
      <View style={estilos.areaConteudo}>
        <View style={estilos.cartaoIdentidade}>
          <View style={estilos.topoPerfil}>
            <View style={estilos.avatar}>
              <Text style={estilos.letrasAvatar}>{iniciaisAvatar(perfil.nome_fantasia)}</Text>
            </View>
            <View style={estilos.textosUsuario}>
              <Text style={estilos.nomeDono}>{perfil.nome_fantasia}</Text>
              <Text style={estilos.nomeEmpresa}>{perfil.ramo_atuacao ?? perfil.uf}</Text>
            </View>
          </View>

          <Text style={estilos.rotuloCNPJ}>CNPJ</Text>
          <View style={estilos.linhaBusca}>
            <View style={estilos.campoCNPJ}>
              <Ionicons name="business-outline" size={18} color="#94A3B8" />
              <Text style={estilos.textoCnpj}>{formatCnpj(perfil.cnpj)}</Text>
            </View>
          </View>
        </View>

        <View style={estilos.secaoCnae}>
          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>CNAE e ramo de atuação</Text>
            {!editandoCnae && (
              <TouchableOpacity onPress={iniciarEdicaoCnae} style={estilos.botaoEditar}>
                <Ionicons name="pencil-outline" size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {editandoCnae ? (
            <View style={estilos.formEdicao}>
              <View style={estilos.campoEdicao}>
                <Text style={estilos.labelEdicao}>Código CNAE</Text>
                <TextInput
                  style={estilos.inputEdicao}
                  placeholder="Ex: 6201-5/00"
                  value={cnaeEditado}
                  onChangeText={setCnaeEditado}
                  autoCapitalize="none"
                />
              </View>
              <View style={estilos.campoEdicao}>
                <Text style={estilos.labelEdicao}>Ramo de atuação</Text>
                <TextInput
                  style={estilos.inputEdicao}
                  placeholder="Ex: Tecnologia da informação"
                  value={ramoEditado}
                  onChangeText={setRamoEditado}
                />
              </View>
              <View style={estilos.botoesEdicao}>
                <TouchableOpacity
                  style={estilos.botaoCancelar}
                  onPress={() => setEditandoCnae(false)}
                  disabled={salvandoCnae}
                >
                  <Text style={estilos.textoCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={estilos.botaoSalvar}
                  onPress={salvarCnae}
                  disabled={salvandoCnae}
                >
                  {salvandoCnae
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={estilos.textoSalvar}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {perfil.cnae ? (
                <View style={estilos.itemCnae}>
                  <View style={estilos.badgeCnae}>
                    <Text style={estilos.textoCnae}>{perfil.cnae}</Text>
                  </View>
                  <Text style={estilos.descricaoCnae} numberOfLines={1}>
                    {perfil.ramo_atuacao ?? 'Ramo não identificado'}
                  </Text>
                </View>
              ) : (
                <Text style={estilos.textoSemCnae}>Nenhum CNAE vinculado ainda. Toque no lápis para adicionar.</Text>
              )}
            </>
          )}
        </View>

        <View style={estilos.containerMenu}>
          <TouchableOpacity style={estilos.itemMenu}>
            <Ionicons name="shield-outline" size={20} color="#0F172A" />
            <Text style={estilos.textoMenu}>Privacidade & dados</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.itemMenu}
            onPress={() => supabase.auth.signOut()}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[estilos.textoMenu, { color: '#EF4444' }]}>Sair da conta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.itemMenu, { borderBottomWidth: 0 }]}
            onPress={handleExcluirConta}
            disabled={excluindoConta}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[estilos.textoMenu, { color: '#EF4444' }]}>
              {excluindoConta ? 'Excluindo conta...' : 'Excluir minha conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.recipientePrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AuthHeader
        titulo="Meu Perfil"
        subtitulo="Gerencie seu CNPJ e dados de habilitação"
        exibirVoltar={false}
      />
      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        {conteudo}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipientePrincipal: { flex: 1, backgroundColor: '#0F172A' },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 120, flexGrow: 1 },
  areaConteudo: { paddingHorizontal: 20 },

  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  textoErro: { fontSize: 14, color: '#64748B', marginBottom: 16, textAlign: 'center' },
  botaoRecarregar: { backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  textoBotaoRecarregar: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  cartaoIdentidade: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4 },
  topoPerfil: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  letrasAvatar: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  textosUsuario: { marginLeft: 15, flex: 1 },
  nomeDono: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  nomeEmpresa: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rotuloCNPJ: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 },
  linhaBusca: { flexDirection: 'row' },
  campoCNPJ: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 15, paddingHorizontal: 15, height: 48, gap: 10 },
  textoCnpj: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },

  secaoCnae: { marginTop: 24 },
  cabecalhoSecao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tituloSecao: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  botaoEditar: { padding: 4 },

  formEdicao: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  campoEdicao: { gap: 6 },
  labelEdicao: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  inputEdicao: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  botoesEdicao: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botaoCancelar: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  textoCancelar: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  botaoSalvar: { flex: 1, height: 40, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  textoSalvar: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  itemCnae: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  badgeCnae: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  textoCnae: { fontSize: 11, fontWeight: 'bold', color: '#0F172A' },
  descricaoCnae: { flex: 1, marginLeft: 12, fontSize: 13, color: '#475569' },
  textoSemCnae: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },

  containerMenu: { marginTop: 24, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  itemMenu: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  textoMenu: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#0F172A' },
});
