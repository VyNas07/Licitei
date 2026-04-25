import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';

// Função para aplicar máscara de CNPJ
function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCadastro() {
    if (!email || !senha || !nome || !cnpj) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    
    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (authError) {
      Alert.alert('Erro ao criar conta', authError.message);
      setLoading(false);
      return;
    }

    // 2. Opcional: Salva Nome e CNPJ em uma tabela de "perfis" no Supabase (se você tiver uma)
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('perfis_mei') // Certifique-se de que essa tabela existe no Supabase
        .insert([
          { 
            id_usuario: authData.user.id, 
            nome_responsavel: nome, 
            cnpj: cnpj.replace(/\D/g, "") // Salva só os números
          }
        ]);
        
      if (profileError) {
         console.warn("Erro ao salvar perfil, mas usuário criado:", profileError);
      }
    }

    setLoading(false);
    // No seu molde ia para /onboarding, mas vamos mandar pro app principal por enquanto
    router.replace('/(tabs)'); 
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Cabeçalho Azul (Estilo do Molde) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={16} color="#E2E8F0" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          
          <View style={styles.logoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="sparkles" size={16} color="#FFF" />
            </View>
            <Text style={styles.logoText}>Licitei</Text>
          </View>
          
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Comece a vender para o governo em poucos minutos.</Text>
        </View>

        {/* Card Branco com Formulário */}
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            
            <TouchableOpacity style={styles.govbrButton}>
              <View style={styles.govbrBadge}>
                <Text style={styles.govbrBadgeText}>gov.br</Text>
              </View>
              <Text style={styles.govbrButtonText}>Cadastrar com Gov.br</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do responsável</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome completo"
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CNPJ do MEI</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="00.000.000/0000-00"
                    keyboardType="numeric"
                    value={cnpj}
                    onChangeText={(text) => setCnpj(formatCnpj(text))}
                  />
                </View>
                {/* Info Box do Molde */}
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={14} color="#1E3A8A" style={{marginTop: 2}} />
                  <Text style={styles.infoText}>
                    Seu CNPJ é obrigatório para cruzarmos os códigos CNAE com os editais e mostrarmos só o que combina com seu negócio.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="voce@email.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry
                    value={senha}
                    onChangeText={setSenha}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleCadastro}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Criar conta e acessar</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerText}>
                Já tem conta? <Text style={styles.footerBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>
            
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1 },
  
  header: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { color: '#E2E8F0', fontSize: 12, marginLeft: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconBox: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },

  cardWrapper: { paddingHorizontal: 20, marginTop: -24, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  
  govbrButton: { flexDirection: 'row', backgroundColor: '#1351B4', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  govbrBadge: { backgroundColor: '#FFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  govbrBadgeText: { color: '#1351B4', fontSize: 11, fontWeight: 'bold' },
  govbrButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', letterSpacing: 1 },

  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFF', height: 48 },
  inputIcon: { marginLeft: 14, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', height: '100%' },

  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 8, padding: 10, marginTop: 8, gap: 8 },
  infoText: { flex: 1, fontSize: 11, color: '#1E3A8A', lineHeight: 16 },

  submitButton: { backgroundColor: '#0F172A', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  footerText: { textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 20 },
  footerBold: { color: '#0F172A', fontWeight: 'bold' }
});