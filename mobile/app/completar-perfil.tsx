import React, { useState, useCallback } from 'react';
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
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import { AuthHeader } from '../src/components/auth/AuthHeader';
import { Footer } from '../src/components/landing/Footer';

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function CompletarPerfil() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [uf, setUf] = useState('');
  const [ramo, setRamo] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  async function handleSalvar() {
    if (!nome || !cnpj || !uf) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    const cnpjNumeros = cnpj.replace(/\D/g, '');
    if (cnpjNumeros.length !== 14) {
      Alert.alert('Atenção', 'Informe os 14 dígitos do CNPJ.');
      return;
    }

    setLoading(true);

    try {
      await api.put('/perfil', {
        nome_fantasia: nome,
        cnpj,
        uf: uf.toUpperCase(),
        ...(ramo.trim() && { ramo_atuacao: ramo.trim() }),
      });
      router.replace('/(tabs)/home');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível salvar o perfil. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <AuthHeader
          titulo="Complete seu cadastro"
          subtitulo="Precisamos de mais alguns dados para personalizar suas oportunidades."
        />

        <View style={styles.cardWrapper}>
          <View style={styles.card}>
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
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={14} color="#1E3A8A" style={{ marginTop: 2 }} />
                  <Text style={styles.infoText}>
                    Seu CNPJ é obrigatório para cruzarmos os códigos CNAE com os editais e mostrarmos só o que combina com seu negócio.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Estado (UF)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: SP"
                    maxLength={2}
                    autoCapitalize="characters"
                    value={uf}
                    onChangeText={setUf}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ramo de atuação <Text style={styles.labelOpcional}>(opcional)</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="briefcase-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Tecnologia da informação"
                    value={ramo}
                    onChangeText={setRamo}
                  />
                </View>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={14} color="#1E3A8A" style={{ marginTop: 2 }} />
                  <Text style={styles.infoText}>
                    Se seu CNPJ estiver na base da BrasilAPI, preenchemos automaticamente. Caso contrário, descreva seu ramo aqui.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSalvar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar e acessar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1 },

  cardWrapper: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },

  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  labelOpcional: { fontWeight: '400', color: '#94A3B8' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFF',
    height: 48,
  },
  inputIcon: { marginLeft: 14, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', height: '100%' },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 11, color: '#1E3A8A', lineHeight: 16 },

  submitButton: {
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
