import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SLIDES = [
  {
    icon: 'rocket-outline',
    title: 'O seu Match Perfeito',
    description: 'Assim que você cadastra seu CNPJ, nossa inteligência cruza seus dados com os editais do PNCP. Na Home, mostraremos apenas as licitações que se encaixam perfeitamente no seu negócio.',
  },
  {
    icon: 'document-text-outline',
    title: 'Resumos Inteligentes',
    description: 'Diga adeus aos PDFs de 100 páginas. Nós traduzimos os editais complexos em cards diretos com: objeto, valor estimado, prazos e requisitos de participação.',
  },
  {
    icon: 'checkmark-done-circle-outline',
    title: 'Habilitação sem Stress',
    description: 'Organize toda a sua documentação em um só lugar. O Licitei conta com um checklist automatizado da Lei 14.133 para garantir que você não perca prazos nem certidões.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Proteção do Teto MEI',
    description: 'Para proteger seu enquadramento tributário, monitoramos o limite de faturamento anual (R$ 81.000). Avisaremos caso você chegue perto do teto de ganhos.',
  },
  {
    icon: 'sparkles-outline',
    title: 'O Governo é seu Cliente',
    description: 'Tudo pronto! Navegue pelas abas para explorar oportunidades, configurar alertas e acompanhar disputas. Vender para o governo nunca foi tão simples.',
  }
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboarding_concluido', 'true');
      router.replace('/(tabs)/home');
    }
  };

  const slide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={slide.icon as any} size={60} color="#0F172A" />
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
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? 'Acessar o Licitei' : 'Próximo'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconContainer: { 
    marginBottom: 30, 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#E0F2FE', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#0F172A', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  description: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    lineHeight: 24 
  },
  dotsContainer: { flexDirection: 'row', marginTop: 40, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  dotActive: { width: 24, backgroundColor: '#0F172A' },
  footer: { padding: 24 },
  button: { 
    backgroundColor: '#0F172A', 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});