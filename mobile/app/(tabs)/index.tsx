import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FeatureCard } from '../../src/components/landing/FeatureCard';
import { PlanCard } from '../../src/components/landing/PlanCard';
import { CtaBox } from '../../src/components/landing/CtaBox';

export default function Landing() {
  const router = useRouter();

  const funcionalidades = [
    { id: '1', icone: 'search' as const, titulo: 'Match por CNAE', desc: 'Cruzamos editais do PNCP com seu CNPJ e mostramos só o que combina com seu negócio.' },
    { id: '2', icone: 'sparkles' as const, titulo: 'Resumo Inteligente', desc: 'Substituímos PDFs longos por cards objetivos: objeto, valor, prazo e requisitos.' },
    { id: '3', icone: 'bar-chart' as const, titulo: 'Gestão de Riscos', desc: 'Alerta de teto MEI (R$ 81.000) e checklist de habilitação para não perder a disputa.' },
  ];

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView contentContainerStyle={estilos.conteudoScroll} bounces={false}>
        
        {/* --- SEÇÃO HERO --- */}
        <View style={estilos.secaoHero}>
          <View style={estilos.barraTopoHero}>
            <View style={estilos.containerLogo}>
              <View style={estilos.fundoIconeLogo}><Ionicons name="sparkles" size={16} color="#FFF" /></View>
              <Text style={estilos.textoLogo}>Licitei</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={estilos.textoEntrar}>Entrar</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.containerBadgeMei}>
            <View style={estilos.badgeMei}>
              <Ionicons name="shield-checkmark" size={12} color="#FFF" />
              <Text style={estilos.textoBadgeMei}>FEITO PARA MEIS</Text>
            </View>
          </View>

          <Text style={estilos.tituloHero}>Venda para o Governo sem burocracia.</Text>
          <Text style={estilos.subtituloHero}>
            O Licitei traduz a complexidade dos editais públicos em oportunidades claras.
            Encontramos licitações pelo seu CNAE, resumimos as regras e avisamos sobre o teto MEI.
          </Text>

          <View style={estilos.botoesHero}>
            <TouchableOpacity style={estilos.botaoPrimario} onPress={() => router.push('/(auth)/login')}>
              <Text style={estilos.textoBotaoPrimario}>Acessar Plataforma</Text>
              <Ionicons name="arrow-forward" size={16} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botaoSecundario} onPress={() => router.push('/(auth)/cadastro')}>
              <Text style={estilos.textoBotaoSecundario}>Criar conta grátis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- COMO FUNCIONA --- */}
        <View style={estilos.secao}>
          <Text style={estilos.overlineSecao}>COMO FUNCIONA</Text>
          <Text style={estilos.tituloSecao}>Vencemos a complexidade dos editais por você</Text>

          <View style={{ marginTop: 16 }}>
            {funcionalidades.map((f) => (
              <FeatureCard key={f.id} icone={f.icone} titulo={f.titulo} descricao={f.desc} />
            ))}
          </View>
        </View>

        {/* --- PLANOS --- */}
        <View style={estilos.secao}>
          <Text style={estilos.overlineSecao}>PLANOS</Text>
          <Text style={estilos.tituloSecao}>Escolha o plano ideal para o seu momento</Text>
          <Text style={estilos.subtituloSecao}>Transparência desde o primeiro clique. Sem surpresas.</Text>

          <PlanCard 
            titulo="Iniciante"
            preco="R$ 0"
            descricao="Para quem está validando os primeiros processos de licitação."
            funcionalidades={['Match inteligente por CNAE', 'Visualize até 2 editais por mês', 'Acesso ao Dashboard de oportunidades']}
            textoBotao="Começar grátis"
            onPress={() => router.push('/(auth)/cadastro')}
          />

          <PlanCard 
            titulo="Licitei PRO"
            preco="R$ 29,90"
            descricao="Para quem quer escalar e vencer licitações com segurança."
            funcionalidades={['Editais Ilimitados', 'Checklist automático da Lei 14.133', 'Alertas de Teto MEI (R$ 81.000)', 'Templates de Documentos para habilitação']}
            destaque={true}
            textoBotao="Começar com PRO"
            onPress={() => router.push('/(auth)/cadastro')}
          />
        </View>

        {/* --- CTA FINAL --- */}
        <CtaBox onPress={() => router.push('/(auth)/cadastro')} />

        <View style={estilos.rodape}>
          <Text style={estilos.textoRodape}>© {new Date().getFullYear()} Licitei · Dados públicos via PNCP</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: '#0F172A' },
  conteudoScroll: { backgroundColor: '#F8FAFC', paddingBottom: 40, flexGrow: 1 },
  
  secaoHero: { backgroundColor: '#0F172A', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },
  barraTopoHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  containerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fundoIconeLogo: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  textoLogo: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  textoEntrar: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 8 },
  containerBadgeMei: { flexDirection: 'row' },
  badgeMei: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginBottom: 16, gap: 6 },
  textoBadgeMei: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  tituloHero: { color: '#FFF', fontSize: 32, fontWeight: 'bold', lineHeight: 36, letterSpacing: -0.5 },
  subtituloHero: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 22, marginTop: 12 },
  botoesHero: { marginTop: 28, gap: 12 },
  botaoPrimario: { flexDirection: 'row', backgroundColor: '#FFF', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  textoBotaoPrimario: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
  botaoSecundario: { backgroundColor: 'transparent', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  textoBotaoSecundario: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  secao: { paddingHorizontal: 20, marginTop: 32 },
  overlineSecao: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  tituloSecao: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 4, letterSpacing: -0.5 },
  subtituloSecao: { fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 18 },

  rodape: { paddingHorizontal: 20, paddingVertical: 24, marginTop: 24, alignItems: 'center' },
  textoRodape: { fontSize: 11, color: '#94A3B8' }
});