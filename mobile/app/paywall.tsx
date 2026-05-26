// app/paywall.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const INICIANTE = [
  "Match por CNAE",
  "Limite de 2 editais por mês",
  "Alertas básicos de prazo",
];

const PRO = [
  "Editais ilimitados",
  "Checklist automático da Lei 14.133",
  "Alertas de teto MEI (R$ 81.000)",
  "Templates de documentos para habilitação",
  "Suporte prioritário",
];

export default function Paywall() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.headerNavy}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Desbloqueie o seu potencial</Text>
            <Text style={styles.headerSubtitle}>Mais editais, menos burocracia. Cancele quando quiser.</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.cardFree}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelMuted}>PLANO INICIAL</Text>
              <Text style={styles.planNameFree}>Iniciante</Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.priceFree}>Grátis</Text>
              <Text style={styles.priceSubFree}>para sempre</Text>
            </View>
          </View>
          <View style={styles.list}>
            {INICIANTE.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="checkmark" size={18} color="#64748B" />
                <Text style={styles.listTextMuted}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.buttonFree} activeOpacity={0.9} onPress={() => router.push('/(auth)/cadastro')}>
            <Text style={styles.buttonFreeText}>Começar grátis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardPro}>
          <View style={styles.badgeRecommend}>
            <Ionicons name="sparkles" size={12} color="#FFF" />
            <Text style={styles.badgeText}>RECOMENDADO</Text>
          </View>

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelPro}>MAIS ESCOLHIDO</Text>
              <View style={styles.rowAlign}>
                <Ionicons name="ribbon-outline" size={20} color="#0F172A" style={{marginRight: 6}} />
                <Text style={styles.planNamePro}>Licitei PRO</Text>
              </View>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.pricePro}>R$ 29,90<Text style={styles.pricePeriod}>/mês</Text></Text>
              <Text style={styles.priceSubPro}>cobrado mensalmente</Text>
            </View>
          </View>

          <View style={styles.list}>
            {PRO.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.checkCirclePro}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
                <Text style={styles.listTextPro}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.buttonPro} activeOpacity={0.9} onPress={() => router.push('/(auth)/cadastro')}>
            <Text style={styles.buttonProText}>Contratar PRO</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>7 dias grátis • cancele a qualquer momento</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerNavy: { backgroundColor: '#0F172A', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 40 },
  headerContent: { paddingHorizontal: 24, paddingTop: 20 },
  backButton: { marginBottom: 20, marginLeft: -10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  scrollContent: { padding: 20 },
  cardFree: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 32 },
  labelMuted: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },
  planNameFree: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  priceFree: { fontSize: 28, fontWeight: 'bold', color: '#0F172A' },
  priceSubFree: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
  buttonFree: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 16, marginTop: 24, alignItems: 'center' },
  buttonFreeText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  cardPro: { backgroundColor: '#E0F2FE', borderRadius: 32, padding: 24, borderWidth: 2, borderColor: '#0F172A', position: 'relative' },
  badgeRecommend: { position: 'absolute', top: -14, left: 24, backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 6 },
  labelPro: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  planNamePro: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  pricePro: { fontSize: 32, fontWeight: 'bold', color: '#0F172A' },
  pricePeriod: { fontSize: 16, fontWeight: 'normal' },
  priceSubPro: { fontSize: 11, color: '#64748B', textAlign: 'right' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowAlign: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  alignEnd: { alignItems: 'flex-end' },
  list: { marginTop: 24, gap: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center' },
  listTextMuted: { fontSize: 14, color: '#64748B', marginLeft: 12, fontWeight: '500' },
  listTextPro: { fontSize: 14, color: '#0F172A', fontWeight: 'bold', marginLeft: 12 },
  checkCirclePro: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  buttonPro: { backgroundColor: '#0F172A', paddingVertical: 20, borderRadius: 18, marginTop: 32, alignItems: 'center' },
  buttonProText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footerNote: { textAlign: 'center', color: '#64748B', fontSize: 11, marginTop: 16 }
});