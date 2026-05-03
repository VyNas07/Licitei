import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

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

  const handleLogin = () => {
    router.push('/(tabs)/home');
  };

  const handleGovbr = () => {
    router.push('/(tabs)/home');
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

              <Button texto="Entrar" onPress={handleLogin} />

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
  containerCartao: { paddingHorizontal: 20, marginTop: 10 , marginBottom: 20 }, 
  cartao: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  containerCadastro: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  textoNaoTemConta: { fontSize: 12, color: '#64748B' },
  textoLinkCadastro: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' }
});