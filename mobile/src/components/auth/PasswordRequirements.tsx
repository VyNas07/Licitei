import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  senha: string;
}

const REQUISITOS = [
  { label: 'Mínimo 8 caracteres', ok: (s: string) => s.length >= 8 },
  { label: 'Pelo menos 1 letra minúscula', ok: (s: string) => /[a-z]/.test(s) },
  { label: 'Pelo menos 1 letra maiúscula', ok: (s: string) => /[A-Z]/.test(s) },
  { label: 'Pelo menos 1 número', ok: (s: string) => /[0-9]/.test(s) },
  { label: 'Pelo menos 1 símbolo (!@#$...)', ok: (s: string) => /[^a-zA-Z0-9]/.test(s) },
];

export function PasswordRequirements({ senha }: Props) {
  return (
    <View style={estilos.container}>
      {REQUISITOS.map(({ label, ok }) => {
        const valido = ok(senha);
        return (
          <View key={label} style={estilos.linha}>
            <Ionicons
              name={valido ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={valido ? '#16A34A' : '#DC2626'}
            />
            <Text style={[estilos.texto, valido ? estilos.textoOk : estilos.textoErro]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function senhaValida(senha: string): boolean {
  return REQUISITOS.every(({ ok }) => ok(senha));
}

const estilos = StyleSheet.create({
  container: { marginTop: 8, gap: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  texto: { fontSize: 12 },
  textoOk: { color: '#16A34A' },
  textoErro: { color: '#DC2626' },
});
