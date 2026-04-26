import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Importação dos componentes organizados nas pastas
import { FeatureCard } from '../src/components/landing/FeatureCard';
import { PlanCard } from '../src/components/landing/PlanCard';
import { CtaBox } from '../src/components/landing/CtaBox';
import { Footer } from '../src/components/landing/Footer';

export default function Landing() {
  const router = useRouter();

  const funcionalidades = [
    { id: '1', icone: 'search' as const, titulo: 'Match por CNAE', desc: 'Cruzamos editais do PNCP com seu CNPJ e mostramos só o que combina com seu negócio.' },
    { id: '2', icone: 'sparkles' as const, titulo: 'Resumo Inteligente', desc: 'Substituímos PDFs longos por cards objetivos: objeto, valor, prazo e requisitos.' },
    { id: '3', icone: 'bar-chart' as const, titulo: 'Gestão de Riscos', desc: 'Alerta de teto MEI (R$ 81.000) e checklist de habilitação para não perder a disputa.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* --- HERO SECTION --- */}
        <View style={styles.heroSection}>
          <View style={styles.heroTopBar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIconBg}>
                <Ionicons name="sparkles" size={16} color="#FFF" />
              </View>
              <Text style={styles.logoText}>Licitei</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginText}>Entrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.badgeMeiContainer}>
            <View style={styles.badgeMei}>
              <Ionicons name="shield-checkmark" size={12} color="#FFF" />
              <Text style={styles.badgeMeiText}>FEITO PARA MEIS</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Venda para o Governo sem burocracia.</Text>
          <Text style={styles.heroSubtitle}>
            O Licitei traduz a complexidade dos editais públicos em oportunidades claras.
            Encontramos licitações pelo seu CNAE, resumimos as regras e avisamos sobre o teto MEI.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Acessar Plataforma</Text>
              <Ionicons name="arrow-forward" size={16} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnSecondary} 
              onPress={() => router.push('/(auth)/cadastro')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>Criar conta grátis</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustBadges}>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.trustBadgeText}>Dados do PNCP</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.trustBadgeText}>Login Gov.br</Text>
            </View>
          </View>
        </View>

        {/* --- PREVIEW CARD --- */}
        <View style={styles.previewSection}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewOverline}>EDITAL</Text>
                <Text style={styles.previewTitle}>Manutenção elétrica · Campinas</Text>
              </View>
              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>Alta</Text>
              </View>
            </View>
            
            <View style={styles.previewValueBox}>
              <Text style={styles.previewValueLabel}>VALOR ESTIMADO</Text>
              <Text style={styles.previewValueText}>R$ 38.500</Text>
            </View>

            <View style={styles.previewChecks}>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.checkText}>CNAE compatível</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.checkText}>Dentro do teto MEI</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- COMO FUNCIONA --- */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>COMO FUNCIONA</Text>
          <Text style={styles.sectionTitle}>Vencemos a complexidade dos editais por você</Text>

          <View style={styles.featureList}>
            {funcionalidades.map((f) => (
              <FeatureCard 
                key={f.id} 
                icone={f.icone} 
                titulo={f.titulo} 
                descricao={f.desc} 
              />
            ))}
          </View>
        </View>

        {/* --- PLANOS --- */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>PLANOS</Text>
          <Text style={styles.sectionTitle}>Escolha o plano ideal para o seu momento</Text>
          <Text style={styles.sectionSubtitle}>Transparência desde o primeiro clique. Sem surpresas.</Text>

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

        {/* --- FOOTER --- */}
        <Footer />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { backgroundColor: '#F8FAFC', paddingBottom: 0, flexGrow: 1 },

  // Hero Section
  heroSection: { backgroundColor: '#0F172A', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIconBg: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  loginText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 8 },
  badgeMeiContainer: { flexDirection: 'row' },
  badgeMei: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginBottom: 16, gap: 6 },
  badgeMeiText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold', lineHeight: 36, letterSpacing: -0.5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 22, marginTop: 12 },
  heroButtons: { marginTop: 28, gap: 12 },
  btnPrimary: { flexDirection: 'row', backgroundColor: '#FFF', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimaryText: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
  btnSecondary: { backgroundColor: 'transparent', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  btnSecondaryText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  trustBadges: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24 },
  trustBadgeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustBadgeText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  // Preview Card
  previewSection: { paddingHorizontal: 20, marginTop: -20, zIndex: 10 },
  previewCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 30 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewOverline: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },
  previewTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  successBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  successBadgeText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  previewValueBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
  previewValueLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  previewValueText: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  previewChecks: { gap: 6 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { fontSize: 12, color: '#334155' },

  // Sections Globais
  section: { paddingHorizontal: 20, marginTop: 32 },
  sectionOverline: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 4, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 18 },
  featureList: { marginTop: 16 },
});