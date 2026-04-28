import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { supabase } from '../../src/services/supabase';

// Componentes
import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { GovbrButton } from '../../src/components/auth/GovbrButton';
import { Divider } from '../../src/components/auth/Divider';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Footer } from '../../src/components/landing/Footer';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao entrar', error.message);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleGovbr = () => {
    Alert.alert('Em breve', 'Login via Gov.br estará disponível em breve.');
  };

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flex1}
      >
        <ScrollView contentContainerStyle={estilos.conteudoScroll} bounces={false}>
          
          <AuthHeader 
            titulo="Bem-vindo de volta" 
            subtitulo="Entre para ver suas oportunidades." 
          />

          <View style={estilos.containerCartao}>
            <View style={estilos.cartao}>
              
              <GovbrButton onPress={handleGovbr} />
              
              <Divider />

              <Input 
                label="E-mail"
                icone="mail"
                placeholder="voce@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Input 
                label="Senha"
                icone="lock-closed"
                placeholder="••••••••"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
              />

              <Button texto={loading ? 'Entrando...' : 'Entrar'} onPress={handleLogin} disabled={loading} />

              <View style={estilos.containerCadastro}>
                <Text style={estilos.textoNaoTemConta}>Ainda não tem conta? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/cadastro')}>
                  <Text style={estilos.textoLinkCadastro}>Criar conta</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>

          <Footer />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: '#0F172A' },
  flex1: { flex: 1 },
  conteudoScroll: { flexGrow: 1, backgroundColor: '#F8FAFC' },
  containerCartao: { paddingHorizontal: 20, marginTop: 10 , marginBottom: 20 }, // Margem negativa para o "efeito" de sobreposição e margem inferior para separar do footer
  cartao: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  containerCadastro: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  textoNaoTemConta: { fontSize: 12, color: '#64748B' },
  textoLinkCadastro: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' }
});