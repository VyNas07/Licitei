import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Reuso de componentes organizados
import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { RevenueCard } from '../../src/components/perfil/RevenueCard';

export default function TelaPerfil() {
  const navegador = useRouter();
  const [cnpj, setCnpj] = useState('45.123.890/0001-22');

  const cnaes = [
    { codigo: '4321-5/00', descricao: 'Instalação e manutenção elétrica' },
    { codigo: '4322-3/01', descricao: 'Sistemas de ar-condicionado' },
  ];

  return (
    <SafeAreaView style={estilos.recipientePrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <AuthHeader 
        titulo="Meu Perfil" 
        subtitulo="Gerencie seu CNPJ e dados de habilitação" 
      />

      <ScrollView 
        style={estilos.rolagem} 
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.areaConteudo}>
          
          {/* Cartão de Identidade do Usuário */}
          <View style={estilos.cartaoIdentidade}>
            <View style={estilos.topoPerfil}>
              <View style={estilos.avatar}>
                <Text style={estilos.letrasAvatar}>YQ</Text>
              </View>
              <View style={estilos.textosUsuario}>
                <Text style={estilos.nomeDono}>Ylson Queiroz</Text>
                <Text style={estilos.nomeEmpresa}>YLSON QUEIROZ LTDA</Text>
              </View>
            </View>

            <Text style={estilos.rotuloCNPJ}>CNPJ</Text>
            <View style={estilos.linhaBusca}>
              <View style={estilos.campoCNPJ}>
                <Ionicons name="business-outline" size={18} color="#94A3B8" />
                <TextInput 
                  style={estilos.inputTexto}
                  value={cnpj}
                  onChangeText={setCnpj}
                />
              </View>
              <TouchableOpacity style={estilos.botaoAcao}>
                <Ionicons name="search" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Listagem de CNAEs */}
          <View style={estilos.secaoCnae}>
            <Text style={estilos.tituloSecao}>CNAEs vinculados</Text>
            {cnaes.map((item) => (
              <View key={item.codigo} style={estilos.itemCnae}>
                <View style={estilos.badgeCnae}>
                  <Text style={estilos.textoCnae}>{item.codigo}</Text>
                </View>
                <Text style={estilos.descricaoCnae} numberOfLines={1}>{item.descricao}</Text>
              </View>
            ))}
          </View>

          {/* Componente de Faturamento Reutilizável */}
          <RevenueCard valorAtual={52000} valorTeto={81000} />

          {/* Botões de Configuração e Saída */}
          <View style={estilos.containerMenu}>
            <TouchableOpacity style={estilos.itemMenu}>
              <Ionicons name="shield-outline" size={20} color="#0F172A" />
              <Text style={estilos.textoMenu}>Privacidade & dados</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={estilos.itemMenu}
              onPress={() => navegador.replace('/(auth)/login')}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[estilos.textoMenu, { color: '#EF4444' }]}>Sair da conta</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipientePrincipal: { flex: 1, backgroundColor: '#0F172A' },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 120 },
  areaConteudo: { paddingHorizontal: 20 },

  cartaoIdentidade: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
  },
  topoPerfil: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  letrasAvatar: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  textosUsuario: { marginLeft: 15 },
  nomeDono: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  nomeEmpresa: { fontSize: 12, color: '#64748B', marginTop: 2 },

  rotuloCNPJ: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 },
  linhaBusca: { flexDirection: 'row', gap: 10 },
  campoCNPJ: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 15, paddingHorizontal: 15, height: 48 },
  inputTexto: { flex: 1, marginLeft: 10, fontSize: 14, color: '#0F172A', fontWeight: '600' },
  botaoAcao: { backgroundColor: '#0F172A', width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  secaoCnae: { marginTop: 24 },
  tituloSecao: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  itemCnae: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  badgeCnae: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  textoCnae: { fontSize: 11, fontWeight: 'bold', color: '#0F172A' },
  descricaoCnae: { flex: 1, marginLeft: 12, fontSize: 13, color: '#475569' },

  containerMenu: { marginTop: 24, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  itemMenu: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  textoMenu: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#0F172A' },
});