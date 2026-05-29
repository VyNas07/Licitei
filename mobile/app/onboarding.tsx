import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'rocket-outline',
    title: 'O seu Match Perfeito',
    description: 'Assim que você cadastra seu CNPJ, nossa inteligência cruza seus dados com os editais do PNCP.',
  },
  {
    icon: 'document-text-outline',
    title: 'Resumos Inteligentes',
    description: 'Nós traduzimos os editais complexos em cards diretos com: objeto, valor estimado, prazos e requisitos.',
  },
  {
    icon: 'checkmark-done-circle-outline',
    title: 'Habilitação sem Stress',
    description: 'Organize sua documentação. O Licitei conta com um checklist automatizado da Lei 14.133.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Proteção do Teto MEI',
    description: 'Monitoramos o limite de faturamento anual (R$ 81.000). Avisaremos caso você chegue perto do teto.',
  },
  {
    icon: 'sparkles-outline',
    title: 'O Governo é seu Cliente',
    description: 'Tudo pronto! Navegue pelas abas para explorar oportunidades e acompanhar disputas.',
  }
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [aceitouTermos, setAceitouTermos] = useState<boolean>(false);

  const isLastSlide = useMemo(() => currentIndex === SLIDES.length - 1, [currentIndex]);
  const slide = useMemo(() => SLIDES[currentIndex], [currentIndex]);

  const handleNext = useCallback(() => {
    if (!isLastSlide) {
      setCurrentIndex((prev) => prev + 1);
    } else if (aceitouTermos) {
      router.replace('/(tabs)/home');
    }
  }, [isLastSlide, aceitouTermos, router]);

  const toggleTermos = useCallback(() => {
    setAceitouTermos((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={slide.icon} size={60} color="#0F172A" />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
        
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View key={index} style={[styles.dot, currentIndex === index && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {isLastSlide && (
          <Pressable 
            style={styles.lgpdContainer} 
            onPress={toggleTermos}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceitouTermos }}
          >
            <View style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}>
              {aceitouTermos && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={styles.lgpdText}>
              Li e aceito os Termos de Uso e a Política de Privacidade (LGPD).
            </Text>
          </Pressable>
        )}

        <TouchableOpacity 
          style={[styles.button, isLastSlide && !aceitouTermos && styles.buttonDisabled]} 
          onPress={handleNext}
          disabled={isLastSlide && !aceitouTermos}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Acessar o Licitei' : 'Próximo'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconContainer: { marginBottom: 30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
  dotsContainer: { flexDirection: 'row', marginTop: 40, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  dotActive: { width: 24, backgroundColor: '#0F172A' },
  footer: { padding: 24 },
  lgpdContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  lgpdText: { flex: 1, marginLeft: 12, fontSize: 14, color: '#475569', lineHeight: 20 },
  button: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#94A3B8' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});