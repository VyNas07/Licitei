import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Componentes Reutilizáveis
import { Input } from '../../src/components/ui/Input';
import { SectorCard } from '../../src/components/editais/SectorCard';
import { EditalCard } from '../../src/components/editais/EditalCard';

export default function HomeUsuario() {
  const router = useRouter();

  const setores = [
    { id: '1', icone: 'construct' as const, nome: 'Manutenção', desc: 'Ar-condicionado, predial...', qtd: 14 },
    { id: '2', icone: 'restaurant' as const, nome: 'Alimentos', desc: 'Merenda escolar, perecíveis...', qtd: 9 },
    { id: '3', icone: 'hammer' as const, nome: 'Obras', desc: 'Reformas e reparos civis...', qtd: 5 },
  ];

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <StatusBar barStyle="light-content" />
      
      {/* Cabeçalho Navy */}
      <View style={estilos.cabecalho}>
        <View style={estilos.linhaTopo}>
          <View>
            <Text style={estilos.saudacao}>Olá, Ylson</Text>
            <Text style={estilos.tituloPagina}>Boas oportunidades hoje</Text>
          </View>
          <TouchableOpacity style={estilos.botaoNotificacao} onPress={() => router.push('/(tabs)/alertas')}>
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            <View style={estilos.pontoAlerta} />
          </TouchableOpacity>
        </View>

        <View style={estilos.containerBusca}>
          <View style={estilos.barraBusca}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <Text style={estilos.placeholderBusca}>Buscar editais, órgãos, CNAE...</Text>
          </View>
          <TouchableOpacity style={estilos.botaoFiltro}>
            <Ionicons name="options-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={estilos.rolagem} 
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner PRO */}
        <TouchableOpacity style={estilos.bannerPro} activeOpacity={0.9}>
          <View style={estilos.proInfo}>
            <View style={estilos.proIcone}>
              <Ionicons name="ribbon" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={estilos.proTitulo}>Upgrade para PRO</Text>
              <Text style={estilos.proSubtitulo}>Editais ilimitados + checklist automático</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        {/* Setores */}
        <View style={estilos.secao}>
          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>Setores</Text>
            <Text style={estilos.linkSecao}>Toque para filtrar</Text>
          </View>
          {setores.map(s => (
            <SectorCard key={s.id} {...s} />
          ))}
        </View>

        {/* Editais Recentes */}
        <View style={estilos.secao}>
          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>Editais recentes</Text>
            <Text style={estilos.fonteDados}>via PNCP</Text>
          </View>
          
          <EditalCard 
            onPress={() => {}}
            item={{
              numero_controle_pncp: '2024/001',
              objeto_compra: 'Serviços de Manutenção Elétrica e Hidráulica',
              orgao_razao_social: 'Prefeitura de Recife',
              valor_total_estimado: 85000,
              uf: 'PE',
              municipio: 'Recife',
              data_encerramento_proposta: '2026-05-20'
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: '#0F172A' },
  cabecalho: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 25, backgroundColor: '#0F172A', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  saudacao: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  tituloPagina: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  botaoNotificacao: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pontoAlerta: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800', borderWidth: 2, borderColor: '#0F172A' },
  containerBusca: { flexDirection: 'row', gap: 10 },
  barraBusca: { flex: 1, height: 48, backgroundColor: '#FFF', borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  placeholderBusca: { marginLeft: 10, color: '#94A3B8', fontSize: 14 },
  botaoFiltro: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 40 },
  bannerPro: { marginHorizontal: 20, marginTop: 24, backgroundColor: '#0F172A', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  proTitulo: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  proSubtitulo: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  secao: { marginTop: 32, paddingHorizontal: 20 },
  cabecalhoSecao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  linkSecao: { fontSize: 12, color: '#64748B' },
  fonteDados: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' }
});